"""backend/app/bookings.py

Advance (scheduled) bookings, stored in your backend database.

  * Slots come from the shop's own hours + working days (set by the barber).
  * A customer's booking starts as "pending" and BLOCKS its slot.
  * The barber confirms or rejects it.
  * The customer can cancel until `cancel_hours` before the slot.
  * Pending requests expire automatically when the slot time arrives.

Self-contained: it only needs the existing Shop model. It creates two new
tables (advance_bookings, shop_availability) through db.create_all().
"""
from .queue import get_request_barber
import re
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from werkzeug.exceptions import HTTPException

from .extensions import db
from .models import Shop

bookings_bp = Blueprint("bookings", __name__)

IST = timedelta(hours=5, minutes=30)      # the app is used in India
LEAD_MINUTES = 30                         # earliest bookable time today = now + 30 min
MAX_ACTIVE_PER_PHONE = 3                  # open upcoming bookings per customer per shop
ACTIVE = ("pending", "confirmed")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# ----------------------------------------------------------------- models
class ShopAvailability(db.Model):
    __tablename__ = "shop_availability"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), unique=True, nullable=False)
    days = db.Column(db.String(20), default="0,1,2,3,4,5")      # Mon=0 ... Sun=6
    open_time = db.Column(db.String(5), default="09:00")
    close_time = db.Column(db.String(5), default="20:00")
    slot_minutes = db.Column(db.Integer, default=30)
    advance_days = db.Column(db.Integer, default=14)
    cancel_hours = db.Column(db.Integer, default=2)
    off_dates = db.Column(db.Text, default="")                   # "2026-10-25,2026-11-01"


class AdvanceBooking(db.Model):
    __tablename__ = "advance_bookings"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    customer_phone = db.Column(db.String(15), nullable=False)
    service_name = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.Integer, nullable=False, default=30)
    price = db.Column(db.Float, default=0)
    date = db.Column(db.String(10), nullable=False)              # YYYY-MM-DD
    start = db.Column(db.String(5), nullable=False)              # HH:MM
    end = db.Column(db.String(5), nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shop = db.relationship("Shop")


# ---------------------------------------------------------------- helpers
def now_ist():
    return datetime.utcnow() + IST


def err(message, code=400):
    return jsonify({"success": False, "error": message}), code


@bookings_bp.errorhandler(Exception)
def on_error(e):
    """Always answer in JSON so the app can show the real reason."""
    db.session.rollback()
    if isinstance(e, HTTPException):
        return err(e.description or e.name, e.code or 500)
    return err(f"Server error: {type(e).__name__}: {e}", 500)


@bookings_bp.route("/api/bookings/ping", methods=["GET"])
def ping():
    """Open /api/bookings/ping in a browser to confirm the booking routes are live."""
    return jsonify({"success": True, "service": "bookings", "time_ist": now_ist().isoformat()})


def to_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def digits10(value):
    return re.sub(r"\D", "", str(value or ""))[-10:]


def to_min(hhmm):
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def to_hhmm(minutes):
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def parse_date(text):
    if not text or not DATE_RE.match(text):
        return None
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def find_shop(name):
    name = (name or "").strip().lower()
    if not name:
        return None
    return Shop.query.filter(db.func.lower(Shop.name) == name).first()


def get_cfg(shop):
    row = ShopAvailability.query.filter_by(shop_id=shop.id).first()
    if row:
        return {
            "configured": True,
            "days": [int(x) for x in (row.days or "").split(",") if x.strip() != ""],
            "open": row.open_time,
            "close": row.close_time,
            "slot_minutes": row.slot_minutes,
            "advance_days": row.advance_days,
            "cancel_hours": row.cancel_hours,
            "off_dates": [d for d in (row.off_dates or "").split(",") if d],
        }
    return {
        "configured": False,
        "days": [0, 1, 2, 3, 4, 5],
        "open": shop.opening_time if shop.opening_time and TIME_RE.match(shop.opening_time) else "09:00",
        "close": shop.closing_time if shop.closing_time and TIME_RE.match(shop.closing_time) else "20:00",
        "slot_minutes": 30,
        "advance_days": 14,
        "cancel_hours": 2,
        "off_dates": [],
    }


def closed_reason(cfg, day):
    today = now_ist().date()
    if day < today:
        return "That date has passed"
    if day > today + timedelta(days=cfg["advance_days"]):
        return f"Bookings open only {cfg['advance_days']} days ahead"
    if day.weekday() not in cfg["days"]:
        return "The shop is closed on this day"
    if day.isoformat() in cfg["off_dates"]:
        return "The barber is not available on this date"
    return None


def taken_ranges(shop_id, date_text):
    rows = AdvanceBooking.query.filter(
        AdvanceBooking.shop_id == shop_id,
        AdvanceBooking.date == date_text,
        AdvanceBooking.status.in_(ACTIVE),
    ).all()
    return [(to_min(b.start), to_min(b.end)) for b in rows]


def is_free(start_m, end_m, taken):
    return not any(start_m < t_end and t_start < end_m for t_start, t_end in taken)


def booking_json(b):
    return {
        "id": b.id,
        "shop_name": b.shop.name if b.shop else "",
        "customer_name": b.customer_name,
        "customer_phone": b.customer_phone,
        "service_name": b.service_name,
        "duration": b.duration,
        "price": b.price,
        "date": b.date,
        "start": b.start,
        "end": b.end,
        "status": b.status,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


def expire_stale():
    """A request nobody answered before the slot time becomes 'expired'."""
    now = now_ist()
    changed = False
    stale = AdvanceBooking.query.filter(
        AdvanceBooking.status == "pending",
        AdvanceBooking.date <= now.date().isoformat(),
    ).all()
    for b in stale:
        if datetime.strptime(f"{b.date} {b.start}", "%Y-%m-%d %H:%M") <= now:
            b.status = "expired"
            changed = True
    if changed:
        db.session.commit()


# ---------------------------------------------------------- availability
@bookings_bp.route("/api/bookings/availability", methods=["GET"])
def get_availability():
    shop = find_shop(request.args.get("shop_name"))
    if not shop:
        return err("Shop not found", 404)
    return jsonify({"success": True, "config": get_cfg(shop)})


@bookings_bp.route("/api/bookings/availability", methods=["POST"])
def save_availability():
    data = request.get_json(silent=True) or {}
    barber = get_request_barber()
    if barber is None:
        return err("Please log in as the shop owner first.", 401)
    shop = barber.shop
    # shop = find_shop(data.get("shop_name"))
    # if not shop:
    #     return err("Shop not found. Save your shop details in Profile first.", 404)

    days = sorted({to_int(d, -1) for d in (data.get("days") or [])})
    if not days or any(d < 0 or d > 6 for d in days):
        return err("Choose at least one working day")

    open_t, close_t = str(data.get("open") or ""), str(data.get("close") or "")
    if not TIME_RE.match(open_t) or not TIME_RE.match(close_t) or to_min(open_t) >= to_min(close_t):
        return err("Closing time must be after opening time")

    slot = to_int(data.get("slot_minutes"), 30)
    if slot < 5 or slot > 120 or slot % 5 != 0:
        return err("Slot length must be between 5 and 120 minutes (in steps of 5)")

    advance = to_int(data.get("advance_days"), 14)
    if advance < 1 or advance > 365:
        return err("Advance booking window must be 1 to 365 days")

    cancel = to_int(data.get("cancel_hours"), 2)
    if cancel < 0 or cancel > 72:
        return err("Cancellation cutoff must be 0 to 72 hours")

    off = []
    for d in (data.get("off_dates") or [])[:120]:
        if parse_date(str(d)):
            off.append(str(d))
    off = sorted(set(off))

    row = ShopAvailability.query.filter_by(shop_id=shop.id).first()
    if not row:
        row = ShopAvailability(shop_id=shop.id)
        db.session.add(row)
    row.days = ",".join(str(d) for d in days)
    row.open_time, row.close_time = open_t, close_t
    row.slot_minutes, row.advance_days, row.cancel_hours = slot, advance, cancel
    row.off_dates = ",".join(off)
    db.session.commit()
    return jsonify({"success": True, "config": get_cfg(shop)})


# ------------------------------------------------------------------ slots
@bookings_bp.route("/api/bookings/slots", methods=["GET"])
def list_slots():
    shop = find_shop(request.args.get("shop_name"))
    if not shop:
        return err("Shop not found. This shop has not set up online booking yet.", 404)
    day = parse_date(request.args.get("date"))
    if not day:
        return err("Invalid date")
    duration = min(480, max(5, to_int(request.args.get("duration"), 30)))

    expire_stale()
    cfg = get_cfg(shop)
    reason = closed_reason(cfg, day)
    if reason:
        return jsonify({"success": True, "slots": [], "reason": reason})

    open_m, close_m, step = to_min(cfg["open"]), to_min(cfg["close"]), cfg["slot_minutes"]
    now = now_ist()
    earliest = 0
    if day == now.date():
        earliest = now.hour * 60 + now.minute + LEAD_MINUTES

    taken = taken_ranges(shop.id, day.isoformat())
    slots = []
    start = open_m
    while start + duration <= close_m:
        if start >= earliest:
            slots.append({"time": to_hhmm(start), "available": is_free(start, start + duration, taken)})
        start += step

    reason = "" if slots else "No time left on this day"
    return jsonify({"success": True, "slots": slots, "reason": reason})


# --------------------------------------------------------------- bookings
@bookings_bp.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json(silent=True) or {}
    shop = find_shop(data.get("shop_name"))
    if not shop:
        return err("Shop not found. This shop has not set up online booking yet.", 404)

    name = str(data.get("customer_name") or "").strip()[:100] or "Customer"
    phone = digits10(data.get("customer_phone"))
    if len(phone) != 10:
        return err("Enter a valid 10-digit phone number")

    service = str(data.get("service_name") or "").strip()[:100]
    if not service:
        return err("Choose a service")
    duration = min(480, max(5, to_int(data.get("duration"), 30)))
    try:
        price = max(0.0, float(data.get("price") or 0))
    except (TypeError, ValueError):
        price = 0.0

    day = parse_date(str(data.get("date") or ""))
    start_text = str(data.get("start") or "")
    if not day or not TIME_RE.match(start_text):
        return err("Choose a date and time")

    expire_stale()
    cfg = get_cfg(shop)
    reason = closed_reason(cfg, day)
    if reason:
        return err(reason)

    start_m = to_min(start_text)
    end_m = start_m + duration
    open_m, close_m = to_min(cfg["open"]), to_min(cfg["close"])
    if start_m < open_m or end_m > close_m or (start_m - open_m) % cfg["slot_minutes"] != 0:
        return err("That time is outside the shop's booking slots")

    now = now_ist()
    if day == now.date() and start_m < now.hour * 60 + now.minute + LEAD_MINUTES:
        return err("That time is too soon. Please pick a later slot.")

    if not is_free(start_m, end_m, taken_ranges(shop.id, day.isoformat())):
        return err("That slot was just taken. Please pick another time.", 409)

    open_count = AdvanceBooking.query.filter(
        AdvanceBooking.shop_id == shop.id,
        AdvanceBooking.customer_phone == phone,
        AdvanceBooking.status.in_(ACTIVE),
        AdvanceBooking.date >= now.date().isoformat(),
    ).count()
    if open_count >= MAX_ACTIVE_PER_PHONE:
        return err(f"You already have {MAX_ACTIVE_PER_PHONE} open bookings at this shop")

    booking = AdvanceBooking(
        shop_id=shop.id, customer_name=name, customer_phone=phone,
        service_name=service, duration=duration, price=price,
        date=day.isoformat(), start=to_hhmm(start_m), end=to_hhmm(end_m),
        status="pending",
    )
    db.session.add(booking)
    db.session.commit()
    return jsonify({"success": True, "booking": booking_json(booking)}), 201


@bookings_bp.route("/api/bookings", methods=["GET"])
def list_bookings():
    expire_stale()
    query = AdvanceBooking.query
    shop_name = request.args.get("shop_name")
    phone = digits10(request.args.get("phone"))
    if shop_name:
        shop = find_shop(shop_name)
        if not shop:
            return err("Shop not found", 404)
        barber = get_request_barber()
        if barber is None or barber.shop_id != shop.id:
            return err("Please log in as the shop owner.", 401)
        query = query.filter(AdvanceBooking.shop_id == shop.id)
    # if shop_name:
    #     shop = find_shop(shop_name)
    #     if not shop:
    #         return err("Shop not found", 404)
    #     query = query.filter(AdvanceBooking.shop_id == shop.id)
    elif len(phone) == 10:
        query = query.filter(AdvanceBooking.customer_phone == phone)
    else:
        return err("Send shop_name or phone")

    since = (now_ist().date() - timedelta(days=60)).isoformat()
    rows = (query.filter(AdvanceBooking.date >= since)
            .order_by(AdvanceBooking.date, AdvanceBooking.start).limit(300).all())
    return jsonify({"success": True, "bookings": [booking_json(b) for b in rows]})


@bookings_bp.route("/api/bookings/<int:booking_id>", methods=["PATCH"])
def update_booking(booking_id):
    booking = AdvanceBooking.query.get(booking_id)
    if not booking:
        return err("Booking not found", 404)

    data = request.get_json(silent=True) or {}
    action = str(data.get("action") or "")
    by = str(data.get("by") or "")
    expire_stale()
    db.session.refresh(booking)

    if by == "customer":
        if digits10(data.get("phone")) != booking.customer_phone:
            return err("This booking belongs to another phone number", 403)
        if action != "cancel":
            return err("Customers can only cancel a booking", 403)
        if booking.status not in ACTIVE:
            return err(f"This booking is already {booking.status}")
        cutoff = get_cfg(booking.shop)["cancel_hours"]
        starts = datetime.strptime(f"{booking.date} {booking.start}", "%Y-%m-%d %H:%M")
        if starts - now_ist() < timedelta(hours=cutoff):
            return err(f"Bookings can only be cancelled at least {cutoff} hour(s) before the slot. "
                       "Please contact the shop.")
        booking.status = "cancelled"

    elif by == "barber":
        barber = get_request_barber()
        if barber is None or barber.shop_id != booking.shop_id:
            return err("This booking belongs to another shop", 403)
        transitions = {
            "confirm": ("pending", "confirmed"),
            "reject": ("pending", "rejected"),
            "complete": ("confirmed", "completed"),
        }
        if action in transitions:
            needed, new_status = transitions[action]
            if booking.status != needed:
                return err(f"Only {needed} bookings can be changed this way (this one is {booking.status})")
            booking.status = new_status
        elif action == "cancel":
            if booking.status not in ACTIVE:
                return err(f"This booking is already {booking.status}")
            booking.status = "cancelled"
        else:
            return err("Unknown action")
    else:
        return err("Unknown request", 400)

    db.session.commit()
    return jsonify({"success": True, "booking": booking_json(booking)})
