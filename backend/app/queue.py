import os
import re
from uuid import uuid4
from datetime import datetime, timedelta
from functools import wraps

from flask import (
    Blueprint, request, jsonify, send_from_directory, current_app, g
)
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from .extensions import db
from .models import User, Shop, Barber, Service, Queue, ShopPhoto


queue_bp = Blueprint("queue", __name__)


class Rating(db.Model):
    """Customer ratings."""
    __tablename__ = "ratings"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False)
    queue_id = db.Column(db.Integer, nullable=True)
    stars = db.Column(db.Integer, nullable=False)
    review = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CustomerBooking(db.Model):
    """Links a customer's phone number to a queue entry."""
    __tablename__ = "customer_bookings"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(10), index=True, nullable=False)
    queue_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SupportTicket(db.Model):
    """Support tickets raised from the Help & Support screen."""
    __tablename__ = "support_tickets"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(10), index=True)
    category = db.Column(db.String(60))
    subject = db.Column(db.String(150))
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default="Open")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ReviewMedia(db.Model):
    """Photos / videos a customer attaches to a review."""
    __tablename__ = "review_media"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, nullable=False, index=True)
    queue_id = db.Column(db.Integer, nullable=False, index=True)
    filename = db.Column(db.String(80), nullable=False)
    kind = db.Column(db.String(10))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def phone10(value):
    return "".join(ch for ch in str(value or "") if ch.isdigit())[-10:]


# HELPERS

def clean_text(value):
    """Normalize text received from the frontend."""
    if value is None:
        return ""
    return str(value).strip()


def find_by_name(model, name):
    """Find a record by name without case sensitivity."""
    name = clean_text(name)
    if not name:
        return None

    return model.query.filter(
        func.lower(func.trim(model.name)) == name.lower()
    ).first()


def error_response(message, status=400):
    return jsonify({
        "success": False,
        "error": message
    }), status


GENDERS = ("men", "women", "unisex")
MAX_SHOP_PHOTOS = 6
UPI_RE = re.compile(r"^[A-Za-z0-9._\-]{2,}@[A-Za-z]{2,}$")


def _serializer():
    return URLSafeTimedSerializer(
        current_app.config["SECRET_KEY"],
        salt="glowora-barber"
    )


def make_token(user_id):
    return _serializer().dumps({"uid": user_id})


def barber_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        barber = None

        # 1) a valid login token, if the app sent one
        auth = request.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        if token:
            try:
                uid = _serializer().loads(
                    token, max_age=30 * 24 * 3600
                )["uid"]
                barber = Barber.query.filter_by(user_id=uid).first()
            except (BadSignature, SignatureExpired, KeyError):
                barber = None

        # 2) otherwise identify the shop by name, like the rest of the app
        if barber is None:
            body = request.get_json(silent=True) or {}
            name = (
                request.args.get("shop_name")
                or request.form.get("shop_name")
                or body.get("shop_name")
                or body.get("name")
            )
            shop = find_by_name(Shop, name)
            if shop is not None:
                barber = Barber.query.filter_by(shop_id=shop.id).first()

        if barber is None:
            return error_response("Please log in again.", 401)

        g.barber = barber
        return fn(*args, **kwargs)

    return wrapper


def get_or_create_customer(customer_name):
    """Create a unique customer record."""
    customer_name = safe_text(customer_name, 100) or "Demo Customer"

    customer = User(
        name=customer_name,
        email=f"demo.customer.{uuid4().hex}@trimq.local",
        password="demo-only-change-before-production",
        role="customer",
    )

    db.session.add(customer)
    db.session.flush()
    return customer


def safe_text(value, limit=150):
    """Remove characters that could inject HTML into other users' screens."""
    return clean_text(value).replace("<", "").replace(">", "").replace('"', "")[:limit]


def register_shop(shop_name, address=None, barber_name=None,
                  email=None, is_open=None):
    """Find the shop, or create it together with one barber."""
    shop_name = safe_text(shop_name)
    address = safe_text(address, 255)
    barber_name = safe_text(barber_name, 100)
    email = clean_text(email).lower()

    shop = find_by_name(Shop, shop_name)

    if shop is None:
        shop = Shop(
            name=shop_name,
            address=address or "Address not provided",
            status="open",
        )
        db.session.add(shop)
        db.session.flush()
    elif address:
        shop.address = address

    if is_open is not None:
        shop.status = "open" if is_open else "closed"

    barber = Barber.query.filter_by(shop_id=shop.id).first()

    if barber is None:
        barber_user = User.query.filter_by(email=email).first() if email else None

        if barber_user is None:
            barber_user = User(
                name=barber_name or "Shop Barber",
                email=email or f"barber.{uuid4().hex}@trimq.local",
                password="demo-only-change-before-production",
                role="barber",
            )
            db.session.add(barber_user)
            db.session.flush()

        db.session.add(Barber(
            user_id=barber_user.id,
            shop_id=shop.id,
            specialization="General Barber",
            status="available",
        ))
        db.session.flush()
    elif barber_name and barber.user:
        barber.user.name = barber_name

    return shop


def register_service(name, price, duration):
    """Create a service so it can be booked."""
    name = safe_text(name, 100)
    try:
        price = float(price)
        duration = int(duration)
    except (TypeError, ValueError):
        price, duration = 0, 30

    if price < 0:
        price = 0
    if duration <= 0:
        duration = 30

    service = find_by_name(Service, name)
    if service is None:
        service = Service(
            name=name,
            price=price,
            duration=duration,
            status="active"
        )
        db.session.add(service)
        db.session.flush()

    return service


# --------------------------------------------------
# DEMO DATA
# --------------------------------------------------

def ensure_demo_data():
    """Create demo shops, barbers and services if missing."""

    service_details = [
        ("Hair Cut", 250, 20),
        ("Beard Trim", 150, 15),
        ("Hair Color", 800, 60),
        ("Facial", 600, 45),
        ("Hair Spa", 1200, 90),
        ("Foot & calf massage", 199, 20),
        ("Head massage", 121, 10),
        ("Head, neck and shoulder massage", 299, 30),
        ("Neck & shoulder massage", 199, 20),
        ("Hydrating face massage", 299, 20),
        ("Chocolate & vanilla sole rejuvenating pedicure", 899, 120),
        ("Express manicure", 499, 30),
        ("Nail cut & file (feet)", 99, 10),
    ]

    for name, price, duration in service_details:
        service = find_by_name(Service, name)
        if service is None:
            db.session.add(Service(
                name=name,
                price=price,
                duration=duration,
                status="active",
            ))

    db.session.flush()

    shop_details = [
        ("Royal Cuts", "Hazratganj, Lucknow",
         "demo-royal@trimq.local", "open"),
        ("The Blade Room", "Gomtinagar, Lucknow",
         "demo-blade@trimq.local", "open"),
        ("Style Studio", "Alambagh, Lucknow",
         "demo-style@trimq.local", "open"),
        ("Classic Barber", "Chowk, Lucknow",
         "demo-classic@trimq.local", "closed"),
    ]

    for shop_name, address, email, shop_status in shop_details:
        shop = find_by_name(Shop, shop_name)

        if shop is None:
            shop = Shop(
                name=shop_name,
                address=address,
                status=shop_status,
            )
            db.session.add(shop)
            db.session.flush()

        barber = Barber.query.filter_by(shop_id=shop.id).first()

        if barber is None:
            barber_user = User.query.filter_by(email=email).first()

            if barber_user is None:
                barber_user = User(
                    name=f"{shop_name} Barber",
                    email=email,
                    password="demo-only-change-before-production",
                    role="barber",
                )
                db.session.add(barber_user)
                db.session.flush()

            db.session.add(Barber(
                user_id=barber_user.id,
                shop_id=shop.id,
                specialization="General Barber",
                status="available",
            ))

    db.session.commit()


# --------------------------------------------------
# SERIALIZATION
# --------------------------------------------------

def queue_item_json(item):
    return {
        "id": item.id,
        "token": item.token_number,
        "name": item.customer.name,
        "service": item.service.name,
        "duration": item.service.duration,
        "price": item.service.price,
        "status": item.status,
        "shop_id": item.shop_id,
        "shop_name": item.shop.name,
        "joined_at": (
            item.joined_at.isoformat()
            if item.joined_at else None
        ),
        "payment_method": item.payment_method,
        "payment_status": item.payment_status,
    }


def shop_json(shop):
    owner = (
        shop.barbers[0].user.name
        if shop.barbers and shop.barbers[0].user
        else ""
    )
    return {
        "id": shop.id,
        "name": shop.name,
        "owner": owner,
        "address": shop.address,
        "status": shop.status,
        "phone": shop.phone,
        "email": shop.contact_email,
        "gender_served": shop.gender_served or "unisex",
        "opening_time": shop.opening_time,
        "closing_time": shop.closing_time,
        "upi_id": shop.upi_id,
        "upi_qr_url": shop.upi_qr_url,
        "photos": [
            {"id": p.id, "url": p.image_url}
            for p in shop.photos
        ],
    }


def service_json(service):
    return {
        "id": service.id,
        "name": service.name,
        "price": service.price,
        "duration": service.duration,
        "status": service.status,
    }


# --------------------------------------------------
# INITIALIZE DEMO DATA
# --------------------------------------------------

@queue_bp.route("/api/queue/initialize-demo", methods=["POST"])
def initialize_demo():
    try:
        ensure_demo_data()
        return jsonify({
            "success": True,
            "message": "Demo records are ready."
        })
    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Demo initialization failed")
        return error_response(
            "Could not initialize demo records. Check the Flask terminal.",
            500
        )


# --------------------------------------------------
# LIST SHOPS AND SERVICES
# --------------------------------------------------

@queue_bp.route("/api/shops", methods=["GET"])
def get_shops():
    try:
        shops = Shop.query.order_by(Shop.name.asc()).all()
        return jsonify({
            "success": True,
            "shops": [shop_json(shop) for shop in shops],
        })
    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Could not fetch shops")
        return error_response("Could not load shops.", 500)


@queue_bp.route("/api/services", methods=["GET"])
def get_services():
    try:
        services = Service.query.filter(
            func.lower(Service.status) == "active"
        ).order_by(Service.name.asc()).all()

        return jsonify({
            "success": True,
            "services": [service_json(s) for s in services],
        })
    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Could not fetch services")
        return error_response("Could not load services.", 500)


# @queue_bp.route("/api/shops/sync", methods=["POST"])
# @barber_required
# def sync_shop():
#     data = request.get_json(silent=True) or {}
#     shop = g.barber.shop

#     try:
#         if "open" in data:
#             shop.status = "open" if data["open"] else "closed"

#         if data.get("address"):
#             shop.address = safe_text(data["address"], 255)

#         db.session.commit()
#         return jsonify({
#             "success": True,
#             "shop": shop_json(shop)
#         })

#     except Exception:
#         db.session.rollback()
#         return error_response("Could not update the shop.", 500)
@queue_bp.route("/api/shops/sync", methods=["POST"])
def sync_shop():
    data = request.get_json(silent=True) or {}
    shop_name = clean_text(data.get("shop_name") or data.get("name"))

    if not shop_name:
        return error_response("Shop name is required.")

    try:
        shop = register_shop(
            shop_name,
            data.get("address"),
            data.get("barber_name"),
            data.get("email"),
            data.get("open"),
        )
        db.session.commit()
        return jsonify({"success": True, "shop": shop_json(shop)})
    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Shop sync failed")
        return error_response("Could not update the shop.", 500)


@queue_bp.route("/api/services/sync", methods=["POST"])
def sync_service():
    data = request.get_json(silent=True) or {}

    name = clean_text(data.get("name") or data.get("service_name"))

    if not name:
        return error_response("Service name is required.")

    try:
        price = float(data.get("price", 0))
        duration = int(data.get("duration", 0))

        if price < 0 or duration <= 0:
            return error_response(
                "Price must be non-negative and duration must be positive."
            )

        service = find_by_name(Service, name)

        if service is None:
            service = Service(
                name=name,
                price=price,
                duration=duration,
                status="active",
            )
            db.session.add(service)
        else:
            service.price = price
            service.duration = duration
            service.status = "active"

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Service saved successfully.",
            "service": service_json(service),
        })

    except (TypeError, ValueError):
        return error_response("Invalid service price or duration.")
    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Service synchronization failed")
        return error_response(
            "Could not save service. Check the Flask terminal.",
            500
        )


# --------------------------------------------------
# BARBER SHOP UPI QR CODE
# --------------------------------------------------

MAX_QR_BYTES = 5 * 1024 * 1024


@queue_bp.route("/api/shops/upi-qr", methods=["POST"])
@barber_required
def upload_shop_upi_qr():
    """Upload the logged-in barber's shop UPI QR image and details."""
    shop = g.barber.shop
    upi_id = safe_text(request.form.get("upi_id"), 100)
    qr_file = request.files.get("qr_image")

    if upi_id and not UPI_RE.fullmatch(upi_id):
        return error_response("Enter a valid UPI ID.")

    if not qr_file or not qr_file.filename:
        return error_response("Please choose a QR image.")

    data = qr_file.stream.read(MAX_QR_BYTES + 1)

    if len(data) > MAX_QR_BYTES:
        return error_response("QR image must be 5 MB or smaller.", 413)

    kind, ext = sniff_media(data[:16])
    if kind != "image" or ext not in ("jpg", "png", "webp"):
        return error_response("Upload a valid JPG, PNG, or WEBP QR image.")

    folder = upload_dir()
    filename = f"{uuid4().hex}.{ext}"
    filepath = os.path.join(folder, filename)

    old_filename = None
    if shop.upi_qr_url:
        old_filename = shop.upi_qr_url.rsplit("/", 1)[-1]

    try:
        with open(filepath, "wb") as out:
            out.write(data)

        shop.upi_id = upi_id or None
        shop.upi_qr_url = f"/media/{filename}"
        db.session.commit()

        if old_filename and old_filename != filename:
            stem, _, old_ext = old_filename.rpartition(".")
            if (
                len(stem) == 32
                and all(c in "0123456789abcdef" for c in stem)
                and old_ext in ("jpg", "png", "webp")
            ):
                try:
                    os.remove(os.path.join(folder, old_filename))
                except OSError:
                    pass

        return jsonify({
            "success": True,
            "message": "Shop UPI QR saved successfully.",
            "upi_id": shop.upi_id,
            "upi_qr_url": shop.upi_qr_url,
        }), 200

    except Exception:
        db.session.rollback()
        try:
            os.remove(filepath)
        except OSError:
            pass

        import logging
        logging.exception("Shop UPI QR upload failed")
        return error_response("Could not save the QR image.", 500)


# --------------------------------------------------
# BARBER ACCOUNTS
# --------------------------------------------------

@queue_bp.route("/api/barbers/register", methods=["POST"])
def barber_register():
    d = request.get_json(silent=True) or {}
    name = safe_text(d.get("name"), 100)
    shop_name = safe_text(d.get("shop_name"), 150)
    address = safe_text(d.get("address"), 255)
    email = clean_text(d.get("email")).lower()
    phone = phone10(d.get("phone"))
    password = str(d.get("password") or "")
    gender = clean_text(d.get("gender_served")).lower()

    if not name or not shop_name or not address:
        return error_response("Name, shop name and address are required.")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return error_response("Enter a valid email address.")
    if len(phone) != 10:
        return error_response("Enter a valid 10-digit phone number.")
    if len(password) < 8:
        return error_response("Password must be at least 8 characters.")
    if gender not in GENDERS:
        return error_response("Choose men, women or unisex.")
    if User.query.filter(
        (User.email == email) | (User.phone == phone)
    ).first():
        return error_response(
            "This email or phone number is already registered.", 409
        )
    if find_by_name(Shop, shop_name):
        return error_response("A shop with this name already exists.", 409)

    try:
        user = User(
            name=name,
            email=email,
            phone=phone,
            role="barber",
            password=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.flush()

        shop = Shop(
            name=shop_name,
            address=address,
            phone=phone,
            contact_email=email,
            gender_served=gender,
            status="open"
        )
        db.session.add(shop)
        db.session.flush()

        db.session.add(Barber(
            user_id=user.id,
            shop_id=shop.id,
            specialization="General",
            status="available"
        ))
        db.session.commit()

        return jsonify({
            "success": True,
            "token": make_token(user.id),
            "shop": shop_json(shop)
        }), 201

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Barber registration failed")
        return error_response("Could not create the account.", 500)


@queue_bp.route("/api/barbers/login", methods=["POST"])
def barber_login():
    d = request.get_json(silent=True) or {}
    email = clean_text(d.get("email")).lower()
    password = str(d.get("password") or "")

    user = User.query.filter_by(email=email, role="barber").first()
    barber = Barber.query.filter_by(user_id=user.id).first() if user else None

    if not user or not barber or not check_password_hash(user.password, password):
        return error_response("Wrong email or password.", 401)

    return jsonify({
        "success": True,
        "token": make_token(user.id),
        "shop": shop_json(barber.shop)
    })


@queue_bp.route("/api/barbers/me", methods=["GET", "PUT"])
@barber_required
def barber_me():
    shop = g.barber.shop

    if request.method == "GET":
        return jsonify({"success": True, "shop": shop_json(shop)})

    d = request.get_json(silent=True) or {}

    try:
        if d.get("shop_name"):
            new_name = safe_text(d["shop_name"], 150)
            other = find_by_name(Shop, new_name)
            if other is not None and other.id != shop.id:
                return error_response(
                    "A shop with this name already exists.", 409
                )
            shop.name = new_name

        if d.get("address"):
            shop.address = safe_text(d["address"], 255)

        if d.get("phone"):
            phone = phone10(d["phone"])
            if len(phone) != 10:
                return error_response("Enter a valid 10-digit phone number.")

            taken = User.query.filter(
                User.phone == phone,
                User.id != g.barber.user_id
            ).first()

            if taken:
                return error_response("This phone number is already used.", 409)

            shop.phone = phone
            g.barber.user.phone = phone

        if d.get("name"):
            g.barber.user.name = safe_text(d["name"], 100)

        if d.get("gender_served"):
            gs = clean_text(d["gender_served"]).lower()
            if gs not in GENDERS:
                return error_response("Choose men, women or unisex.")
            shop.gender_served = gs

        if "opening_time" in d:
            shop.opening_time = safe_text(d["opening_time"], 10)

        if "closing_time" in d:
            shop.closing_time = safe_text(d["closing_time"], 10)

        if "open" in d:
            shop.status = "open" if d["open"] else "closed"

        db.session.commit()
        return jsonify({"success": True, "shop": shop_json(shop)})

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Profile update failed")
        return error_response("Could not save changes.", 500)


# --------------------------------------------------
# SHOP PHOTOS
# --------------------------------------------------

@queue_bp.route("/api/barbers/me/photos", methods=["POST"])
@barber_required
def add_shop_photos():
    shop = g.barber.shop

    if (request.content_length or 0) > 40 * 1024 * 1024:
        return error_response("Upload is too large.", 413)

    files = request.files.getlist("photos")
    if not files:
        return error_response("Choose at least one photo.")

    if len(shop.photos) + len(files) > MAX_SHOP_PHOTOS:
        return error_response(
            f"A shop can have up to {MAX_SHOP_PHOTOS} photos."
        )

    prepared = []
    for f in files:
        data = f.read(MAX_QR_BYTES + 1)
        kind, ext = sniff_media(data[:16])

        if kind != "image" or ext not in ("jpg", "png", "webp"):
            return error_response("Only JPG, PNG or WEBP photos are allowed.")

        if len(data) > MAX_QR_BYTES:
            return error_response("Each photo must be 5 MB or smaller.", 413)

        prepared.append((data, ext))

    saved = []
    try:
        folder = upload_dir()

        for data, ext in prepared:
            name = f"{uuid4().hex}.{ext}"
            with open(os.path.join(folder, name), "wb") as out:
                out.write(data)

            saved.append(name)
            db.session.add(ShopPhoto(
                shop_id=shop.id,
                image_url=f"/media/{name}"
            ))

        db.session.commit()
        return jsonify({
            "success": True,
            "photos": shop_json(shop)["photos"]
        }), 201

    except Exception:
        db.session.rollback()
        for name in saved:
            try:
                os.remove(os.path.join(upload_dir(), name))
            except OSError:
                pass

        import logging
        logging.exception("Shop photo upload failed")
        return error_response("Could not save the photos.", 500)


@queue_bp.route("/api/barbers/me/photos/<int:photo_id>", methods=["DELETE"])
@barber_required
def delete_shop_photo(photo_id):
    photo = db.session.get(ShopPhoto, photo_id)

    if photo is None or photo.shop_id != g.barber.shop_id:
        return error_response("Photo not found.", 404)

    name = photo.image_url.rsplit("/", 1)[-1]

    try:
        db.session.delete(photo)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Could not delete the photo.", 500)

    try:
        os.remove(os.path.join(upload_dir(), name))
    except OSError:
        pass

    return jsonify({"success": True})


# --------------------------------------------------
# BARBER CONFIRMS A UPI-QR PAYMENT
# --------------------------------------------------

@queue_bp.route("/api/queue/<int:entry_id>/payment", methods=["POST"])
@barber_required
def confirm_upi_payment(entry_id):
    entry = db.session.get(Queue, entry_id)

    if entry is None or entry.shop_id != g.barber.shop_id:
        return error_response("Booking not found.", 404)

    if entry.payment_method != "upi_qr":
        return error_response("This booking was not paid by UPI QR.")

    received = bool(
        (request.get_json(silent=True) or {}).get("received")
    )
    entry.payment_status = "paid" if received else "not_received"
    db.session.commit()

    return jsonify({
        "success": True,
        "payment_status": entry.payment_status
    })


# --------------------------------------------------
# GET QUEUE
# --------------------------------------------------

@queue_bp.route("/api/queue", methods=["GET"])
def get_queue():
    shop_name = clean_text(
        request.args.get("shop_name") or "Royal Cuts"
    )

    try:
        shop = find_by_name(Shop, shop_name)

        if shop is None:
            return jsonify({
                "success": True,
                "shop_id": None,
                "shop_name": shop_name,
                "queue": [],
            })

        active_statuses = ["waiting", "serving", "cur", "nxt", "wait"]

        items = (
            Queue.query
            .filter(
                Queue.shop_id == shop.id,
                Queue.status.in_(active_statuses),
            )
            .order_by(Queue.token_number.asc())
            .all()
        )

        return jsonify({
            "success": True,
            "shop_id": shop.id,
            "shop_name": shop.name,
            "queue": [queue_item_json(item) for item in items],
        })

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Queue retrieval failed")
        return error_response("Could not load queue.", 500)


# --------------------------------------------------
# CREATE QUEUE ENTRY
# --------------------------------------------------

@queue_bp.route("/api/queue", methods=["POST"])
def create_queue_entry():
    data = request.get_json(silent=True) or {}

    shop_name = clean_text(data.get("shop_name"))
    service_name = clean_text(data.get("service_name"))
    customer_name = clean_text(
        data.get("customer_name")
    ) or "Demo Customer"

    if not shop_name:
        return error_response("Shop name is required.")

    if not service_name:
        return error_response("Service name is required.")

    try:
        ensure_demo_data()

        shop = find_by_name(Shop, shop_name)
        if shop is None:
            shop = register_shop(
                shop_name,
                data.get("shop_address"),
                data.get("shop_owner"),
            )

        service = None
        try:
            want_price = float(data.get("service_price"))
            want_duration = int(data.get("service_duration"))

            service = Service.query.filter(
                func.lower(func.trim(Service.name)) == service_name.lower(),
                Service.price == want_price,
                Service.duration == want_duration,
            ).first()

            if service is None:
                service = Service(
                    name=safe_text(service_name, 100),
                    price=max(0, want_price),
                    duration=want_duration if want_duration > 0 else 30,
                    status="active",
                )
                db.session.add(service)
                db.session.flush()

        except (TypeError, ValueError):
            service = find_by_name(Service, service_name)
            if service is None:
                service = register_service(service_name, None, None)

        if clean_text(shop.status).lower() != "open":
            return error_response("This shop is currently closed.", 400)

        if clean_text(service.status).lower() != "active":
            return error_response(
                "This service is currently unavailable.", 400
            )

        barber = Barber.query.filter_by(shop_id=shop.id).first()
        if barber is None:
            return error_response(
                "No barber is configured for this shop.", 400
            )

        customer = get_or_create_customer(customer_name)

        last_token = (
            db.session.query(func.max(Queue.token_number))
            .filter_by(shop_id=shop.id)
            .scalar()
        ) or 0

        entry = Queue(
            customer_id=customer.id,
            barber_id=barber.id,
            service_id=service.id,
            shop_id=shop.id,
            token_number=last_token + 1,
            status="waiting",
            joined_at=datetime.utcnow(),
        )

        db.session.add(entry)
        db.session.flush()

        phone = phone10(data.get("customer_phone"))
        if len(phone) == 10:
            db.session.add(
                CustomerBooking(phone=phone, queue_id=entry.id)
            )

        advance_queue(shop.id)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Successfully joined the queue.",
            "booking": queue_item_json(entry),
        }), 201

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Queue booking failed")
        return error_response(
            "Booking could not be saved. Check the Flask terminal.",
            500
        )


# --------------------------------------------------
# ADVANCE QUEUE
# --------------------------------------------------

def advance_queue(shop_id):
    """Serve the earliest waiting token when nobody is serving."""

    serving = Queue.query.filter(
        Queue.shop_id == shop_id,
        Queue.status.in_(["serving", "cur"]),
    ).first()

    if serving is not None:
        return

    next_entry = (
        Queue.query
        .filter_by(shop_id=shop_id, status="waiting")
        .order_by(Queue.token_number.asc())
        .first()
    )

    if next_entry is not None:
        next_entry.status = "serving"
        next_entry.started_at = datetime.utcnow()


# --------------------------------------------------
# COMPLETE TOKEN
# --------------------------------------------------

@queue_bp.route("/api/queue/<int:entry_id>/complete", methods=["POST"])
def complete_queue_entry(entry_id):
    try:
        entry = db.session.get(Queue, entry_id)

        if entry is None:
            return error_response("Queue entry not found.", 404)

        if entry.status in ("completed", "skipped"):
            return error_response(
                "This queue entry is already closed.", 400
            )

        entry.status = "completed"
        entry.completed_at = datetime.utcnow()

        advance_queue(entry.shop_id)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Token completed.",
        })

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Token completion failed")
        return error_response("Could not complete token.", 500)


# --------------------------------------------------
# SKIP TOKEN
# --------------------------------------------------

@queue_bp.route("/api/queue/<int:entry_id>/skip", methods=["POST"])
def skip_queue_entry(entry_id):
    try:
        entry = db.session.get(Queue, entry_id)

        if entry is None:
            return error_response("Queue entry not found.", 404)

        if entry.status in ("completed", "skipped"):
            return error_response(
                "This queue entry is already closed.", 400
            )

        entry.status = "skipped"

        advance_queue(entry.shop_id)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Token skipped.",
        })

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Token skip failed")
        return error_response("Could not skip token.", 500)


# --------------------------------------------------
# STATUS OF ONE BOOKING (customer polls this)
# --------------------------------------------------

@queue_bp.route("/api/queue/<int:entry_id>/status", methods=["GET"])
def queue_entry_status(entry_id):
    entry = db.session.get(Queue, entry_id)
    if entry is None:
        return error_response("Queue entry not found.", 404)

    return jsonify({
        "success": True,
        "id": entry.id,
        "token": entry.token_number,
        "status": entry.status,
    })

@queue_bp.route("/api/queue/<int:entry_id>/cancel", methods=["POST"])
def cancel_queue_entry(entry_id):
    try:
        entry = db.session.get(Queue, entry_id)
        if entry is None:
            return error_response("Queue entry not found.", 404)

        if entry.status in ("completed", "skipped", "cancelled"):
            return error_response("This booking is already closed.", 400)

        entry.status = "cancelled"
        advance_queue(entry.shop_id)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "You left the queue."
        })

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Cancel failed")
        return error_response("Could not leave the queue.", 500)
    

@queue_bp.route("/api/queue/history", methods=["GET"])
def queue_history():
    shop_name = clean_text(request.args.get("shop_name"))
    if not shop_name:
        return error_response("Shop name is required.")

    try:
        days = int(request.args.get("days", 60))
    except ValueError:
        days = 60
    days = max(1, min(days, 365))

    shop = find_by_name(Shop, shop_name)
    if shop is None:
        return jsonify({"success": True, "history": []})

    try:
        since = datetime.utcnow() - timedelta(days=days)

        rows = (
            Queue.query
            .filter(
                Queue.shop_id == shop.id,
                Queue.status.in_(["completed", "skipped", "cancelled"]),
                Queue.joined_at >= since,
            )
            .order_by(Queue.id.desc())
            .limit(1000)
            .all()
        )

        ids = [e.id for e in rows]
        phones = {}
        if ids:
            for cb in CustomerBooking.query.filter(
                CustomerBooking.queue_id.in_(ids)
            ).all():
                phones[cb.queue_id] = cb.phone

        def iso(dt):
            return dt.isoformat() + "Z" if dt else None

        return jsonify({
            "success": True,
            "history": [{
                "id": e.id,
                "token": e.token_number,
                "name": e.customer.name if e.customer else "Customer",
                "phone": phones.get(e.id, ""),
                "service": e.service.name,
                "duration": e.service.duration,
                "price": e.service.price,
                "status": e.status,
                "joined_at": iso(e.joined_at),
                "started_at": iso(e.started_at),
                "completed_at": iso(e.completed_at),
                "payment_method": e.payment_method,
                "payment_status": e.payment_status,
            } for e in rows],
        })

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Queue history failed")
        return error_response("Could not load history.", 500)   
    
@queue_bp.route("/api/customers/<phone>/active", methods=["GET"])
def customer_active_booking(phone):
    phone = phone10(phone)
    if len(phone) != 10:
        return error_response("Invalid phone number.")

    row = (
        db.session.query(Queue, Shop, Service)
        .join(CustomerBooking, CustomerBooking.queue_id == Queue.id)
        .join(Shop, Shop.id == Queue.shop_id)
        .join(Service, Service.id == Queue.service_id)
        .filter(
            CustomerBooking.phone == phone,
            Queue.status.in_(["waiting", "serving", "cur"])
        )
        .order_by(Queue.id.desc())
        .first()
    )

    if row is None:
        return jsonify({"success": True, "active": None})

    entry, shop, service = row

    return jsonify({
        "success": True,
        "active": {
            "id": entry.id,
            "token": entry.token_number,
            "status": entry.status,
            "shop_name": shop.name,
            "shop_address": getattr(shop, "address", "") or "",
            "service": service.name,
        }
    })


@queue_bp.route("/api/customers/<phone>/history", methods=["GET"])
def customer_history(phone):
    phone = phone10(phone)
    if len(phone) != 10:
        return error_response("Invalid phone number.")

    rows = (
        db.session.query(Queue, Shop, Service)
        .join(CustomerBooking, CustomerBooking.queue_id == Queue.id)
        .join(Shop, Shop.id == Queue.shop_id)
        .join(Service, Service.id == Queue.service_id)
        .filter(
            CustomerBooking.phone == phone,
            Queue.status == "completed"
        )
        .order_by(Queue.id.desc())
        .limit(100)
        .all()
    )

    return jsonify({
        "success": True,
        "visits": [{
            "id": e.id,
            "token": e.token_number,
            "shop_name": sh.name,
            "service": sv.name,
            "completed_at": (
                (e.completed_at or e.joined_at).isoformat() + "Z"
            ),
        } for e, sh, sv in rows]
    })


# --------------------------------------------------
# SUPPORT TICKETS
# --------------------------------------------------

def ticket_json(t):
    return {
        "id": t.id,
        "ref": f"BQ-{1000 + t.id}",
        "category": t.category,
        "subject": t.subject,
        "description": t.description,
        "status": t.status,
        "created_at": t.created_at.isoformat() + "Z"
    }


@queue_bp.route("/api/tickets", methods=["POST"])
def create_ticket():
    data = request.get_json(silent=True) or {}
    subject = safe_text(data.get("subject"), 150)
    description = safe_text(data.get("description"), 2000)

    if len(subject) < 3 or len(description) < 5:
        return error_response(
            "Please add a subject and describe the problem."
        )

    try:
        t = SupportTicket(
            phone=phone10(data.get("phone")),
            category=safe_text(data.get("category"), 60) or "Other",
            subject=subject,
            description=description,
        )
        db.session.add(t)
        db.session.commit()

        return jsonify({"success": True, "ticket": ticket_json(t)}), 201

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Ticket creation failed")
        return error_response("Could not save the ticket.", 500)


@queue_bp.route("/api/tickets", methods=["GET"])
def list_tickets():
    phone = phone10(request.args.get("phone"))
    if len(phone) != 10:
        return error_response("Invalid phone number.")

    rows = (
        SupportTicket.query
        .filter_by(phone=phone)
        .order_by(SupportTicket.id.desc())
        .limit(20)
        .all()
    )

    return jsonify({
        "success": True,
        "tickets": [ticket_json(t) for t in rows]
    })


# --------------------------------------------------
# REVIEW PHOTOS & VIDEOS
# --------------------------------------------------

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_VIDEO_BYTES = 25 * 1024 * 1024
MAX_IMAGES = 3
MAX_VIDEOS = 1


def upload_dir():
    path = os.path.join(
        os.path.dirname(current_app.root_path),
        "uploads"
    )
    os.makedirs(path, exist_ok=True)
    return path


def sniff_media(head):
    """Decide the file type from its first bytes, never from its name."""
    if head.startswith(b"\xff\xd8\xff"):
        return "image", "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", "png"
    if head.startswith(b"GIF8"):
        return "image", "gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image", "webp"
    if head[4:8] == b"ftyp":
        return "video", "mp4"
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        return "video", "webm"
    return None, None


@queue_bp.route("/api/queue/<int:entry_id>/media", methods=["POST"])
def upload_review_media(entry_id):
    entry = db.session.get(Queue, entry_id)

    if entry is None:
        return error_response("Booking not found.", 404)

    if entry.status != "completed":
        return error_response(
            "You can add photos after the service is complete."
        )

    if ReviewMedia.query.filter_by(queue_id=entry_id).first():
        return error_response("Photos were already added for this visit.")

    if (request.content_length or 0) > 40 * 1024 * 1024:
        return error_response("Upload is too large.", 413)

    files = request.files.getlist("files")
    if not files:
        return error_response("Choose at least one photo or video.")

    prepared = []
    images = videos = 0

    for f in files:
        data = f.read(MAX_VIDEO_BYTES + 1)
        kind, ext = sniff_media(data[:16])

        if kind is None:
            return error_response(
                "Only photos (JPG, PNG, WEBP, GIF) and videos "
                "(MP4, WEBM) are allowed."
            )

        if kind == "image":
            images += 1
            if len(data) > MAX_IMAGE_BYTES:
                return error_response("Each photo must be under 5 MB.")
        else:
            videos += 1
            if len(data) > MAX_VIDEO_BYTES:
                return error_response("The video must be under 25 MB.")

        prepared.append((data, kind, ext))

    if images > MAX_IMAGES or videos > MAX_VIDEOS:
        return error_response("Up to 3 photos and 1 video are allowed.")

    saved = []

    try:
        folder = upload_dir()

        for data, kind, ext in prepared:
            name = f"{uuid4().hex}.{ext}"

            with open(os.path.join(folder, name), "wb") as out:
                out.write(data)

            db.session.add(ReviewMedia(
                shop_id=entry.shop_id,
                queue_id=entry_id,
                filename=name,
                kind=kind
            ))
            saved.append(name)

        db.session.commit()
        return jsonify({"success": True, "count": len(saved)}), 201

    except Exception:
        db.session.rollback()

        for name in saved:
            try:
                os.remove(os.path.join(upload_dir(), name))
            except OSError:
                pass

        import logging
        logging.exception("Media upload failed")
        return error_response("Could not save the files.", 500)


@queue_bp.route("/media/<name>", methods=["GET"])
def serve_media(name):
    stem, _, ext = name.rpartition(".")

    if (
        len(stem) != 32
        or any(c not in "0123456789abcdef" for c in stem)
        or ext not in ("jpg", "png", "gif", "webp", "mp4", "webm")
    ):
        return error_response("Not found.", 404)

    resp = send_from_directory(upload_dir(), name)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


@queue_bp.route("/api/shops/reviews", methods=["GET"])
def shop_reviews():
    shop = find_by_name(Shop, request.args.get("shop_name"))

    if shop is None:
        return jsonify({"success": True, "reviews": []})

    ratings = (
        Rating.query
        .filter_by(shop_id=shop.id)
        .order_by(Rating.id.desc())
        .limit(40)
        .all()
    )

    media_by_q = {}
    for m in ReviewMedia.query.filter_by(shop_id=shop.id).all():
        media_by_q.setdefault(m.queue_id, []).append({
            "url": f"/media/{m.filename}",
            "kind": m.kind
        })

    out = []

    for r in ratings:
        media = media_by_q.get(r.queue_id, []) if r.queue_id else []

        if not media and not (r.review or "").strip():
            continue

        name = "Customer"

        if r.queue_id:
            q = db.session.get(Queue, r.queue_id)
            u = db.session.get(User, q.customer_id) if q else None
            if u and u.name:
                name = u.name.split()[0]

        out.append({
            "stars": r.stars,
            "review": r.review or "",
            "name": name,
            "date": r.created_at.isoformat() + "Z",
            "media": media,
        })

    return jsonify({"success": True, "reviews": out[:20]})


# --------------------------------------------------
# RATINGS
# --------------------------------------------------

@queue_bp.route("/api/ratings", methods=["POST"])
def add_rating():
    data = request.get_json(silent=True) or {}

    shop = find_by_name(Shop, data.get("shop_name"))
    if shop is None:
        return error_response("Shop not found.", 404)

    try:
        stars = int(data.get("stars"))
    except (TypeError, ValueError):
        return error_response("Stars must be a number from 1 to 5.")

    if stars < 1 or stars > 5:
        return error_response("Stars must be a number from 1 to 5.")

    queue_id = data.get("queue_id")
    try:
        queue_id = int(queue_id) if queue_id is not None else None
    except (TypeError, ValueError):
        queue_id = None

    try:
        # if queue_id is not None and Rating.query.filter_by(
        #     shop_id=shop.id, queue_id=queue_id
        # ).first():
        #     return error_response("This visit was already rated.")

        db.session.add(Rating(
            shop_id=shop.id,
            queue_id=queue_id,
            stars=stars,
            review=safe_text(data.get("review"), 500),
        ))
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Thanks for rating!"
        })

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Rating failed")
        return error_response("Could not save rating.", 500)


# --------------------------------------------------
# BARBER ANALYTICS
# --------------------------------------------------

@queue_bp.route("/api/analytics", methods=["GET"])
def shop_analytics():
    shop_name = clean_text(request.args.get("shop_name"))

    try:
        tz = int(request.args.get("tz", 0))
    except ValueError:
        tz = 0

    result = {
        "success": True,
        "today": {"done": 0, "earnings": 0, "avg_wait": None},
        "week": {
            "daily": [0] * 7,
            "done": 0,
            "revenue": 0,
            "services": []
        },
        "rating": {"average": 0, "count": 0},
    }

    shop = find_by_name(Shop, shop_name)
    if shop is None:
        return jsonify(result)

    try:
        offset = timedelta(minutes=tz)
        today = (datetime.utcnow() + offset).date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=7)

        done = (
            Queue.query
            .filter(
                Queue.shop_id == shop.id,
                Queue.status == "completed",
                Queue.completed_at.isnot(None),
            )
            .all()
        )

        waits = []
        service_counts = {}

        for e in done:
            day = (e.completed_at + offset).date()
            price = float(e.service.price or 0)

            if day == today:
                result["today"]["done"] += 1
                result["today"]["earnings"] += price

                if e.started_at and e.joined_at:
                    waits.append(max(
                        0,
                        (e.started_at - e.joined_at).total_seconds() / 60
                    ))

            if week_start <= day < week_end:
                result["week"]["daily"][day.weekday()] += 1
                result["week"]["done"] += 1
                result["week"]["revenue"] += price

                name = e.service.name
                service_counts[name] = service_counts.get(name, 0) + 1

        if waits:
            result["today"]["avg_wait"] = round(
                sum(waits) / len(waits)
            )

        result["week"]["services"] = sorted(
            service_counts.items(),
            key=lambda kv: kv[1],
            reverse=True
        )

        ratings = Rating.query.filter_by(shop_id=shop.id).all()
        if ratings:
            result["rating"]["count"] = len(ratings)
            result["rating"]["average"] = round(
                sum(r.stars for r in ratings) / len(ratings), 1
            )

        return jsonify(result)

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Analytics failed")
        return error_response("Could not load analytics.", 500)
