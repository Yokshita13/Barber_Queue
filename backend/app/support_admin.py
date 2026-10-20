"""Support desk v2 — owner desk, per-shop tickets, private tickets, e-mail alert.

SETUP
  1. Put this file next to queue.py.
  2. Where the other blueprints are registered (BEFORE db.create_all()):
         from .support_admin import support_bp
         app.register_blueprint(support_bp)
  3. In queue.py replace the old  list_tickets()  function body (see the
     patch in the chat) so tickets can no longer be listed by phone number.
  4. Render -> Environment:
         ADMIN_KEY    = long secret only you know            (required)
         ADMIN_EMAIL  = where new-ticket e-mails go          (optional)
         SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS       (optional, e.g. Gmail
                        smtp.gmail.com / 587 / you@gmail.com / an *app password*)
"""
import os
import hmac
import secrets
import smtplib
import threading
from datetime import datetime
from email.message import EmailMessage

from flask import Blueprint, jsonify, request

from .extensions import db
from .queue import SupportTicket, ticket_json, error_response, phone10, safe_text

support_bp = Blueprint("support_admin", __name__)
STATUSES = ("Open", "In progress", "Resolved")


# ------------------------------------------------------------------ tables
class TicketMeta(db.Model):
    """Which shop a ticket is about + the private key only the sender holds."""
    __tablename__ = "ticket_meta"
    ticket_id = db.Column(db.Integer, primary_key=True)
    shop_name = db.Column(db.String(120), index=True)
    token = db.Column(db.String(64), nullable=False)


class TicketReply(db.Model):
    __tablename__ = "ticket_replies"
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, index=True, nullable=False)
    author = db.Column(db.String(10), default="owner")        # owner | shop
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ----------------------------------------------------------------- helpers
def _admin_ok():
    expected = os.environ.get("ADMIN_KEY", "")
    return bool(expected) and hmac.compare_digest(expected, request.headers.get("X-Admin-Key", ""))


def _norm(s):
    return " ".join(str(s or "").lower().split())


def _replies(ids):
    if not ids:
        return {}
    out = {}
    rows = (TicketReply.query.filter(TicketReply.ticket_id.in_(ids))
            .order_by(TicketReply.id).all())
    for r in rows:
        out.setdefault(r.ticket_id, []).append({
            "author": r.author, "message": r.message,
            "created_at": r.created_at.isoformat() + "Z"})
    return out


def _pack(rows, include_phone="full"):
    ids = [t.id for t in rows]
    rep = _replies(ids)
    meta = {m.ticket_id: m for m in TicketMeta.query.filter(TicketMeta.ticket_id.in_(ids)).all()} if ids else {}
    out = []
    for t in rows:
        j = ticket_json(t)
        if include_phone == "full":
            j["phone"] = t.phone
        elif include_phone == "masked":
            j["phone"] = "••••••" + (t.phone or "")[-4:]
        j["shop_name"] = meta[t.id].shop_name if t.id in meta else ""
        j["replies"] = rep.get(t.id, [])
        out.append(j)
    return out


def _mail_owner(t, shop):
    to, host = os.environ.get("ADMIN_EMAIL"), os.environ.get("SMTP_HOST")
    user, pw = os.environ.get("SMTP_USER"), os.environ.get("SMTP_PASS")
    if not (to and host and user and pw):
        return
    def send():
        try:
            m = EmailMessage()
            m["Subject"] = f"New support ticket BQ-{1000 + t['id']}: {t['subject']}"
            m["From"], m["To"] = user, to
            m.set_content(f"Shop: {shop or '-'}\nCategory: {t['category']}\n\n{t['description']}")
            with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587")), timeout=15) as s:
                s.starttls()
                s.login(user, pw)
                s.send_message(m)
        except Exception:
            pass
    threading.Thread(target=send, daemon=True).start()


# --------------------------------------------------------------- customers
@support_bp.route("/api/support/tickets", methods=["POST"])
def create_ticket_private():
    data = request.get_json(silent=True) or {}
    subject = safe_text(data.get("subject"), 150)
    description = safe_text(data.get("description"), 2000)
    if len(subject) < 3 or len(description) < 5:
        return error_response("Please add a subject and describe the problem.")
    shop = safe_text(data.get("shop_name"), 120)
    try:
        t = SupportTicket(phone=phone10(data.get("phone")),
                          category=safe_text(data.get("category"), 60) or "Other",
                          subject=subject, description=description)
        db.session.add(t)
        db.session.flush()
        token = secrets.token_urlsafe(18)
        db.session.add(TicketMeta(ticket_id=t.id, shop_name=shop, token=token))
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Could not save the ticket.", 500)
    j = ticket_json(t)
    _mail_owner(j, shop)
    return jsonify({"success": True, "ticket": j, "token": token}), 201


@support_bp.route("/api/support/mine", methods=["POST"])
def my_tickets():
    """Body: {items:[{id, token}]}. Only tickets whose private token matches."""
    items = (request.get_json(silent=True) or {}).get("items") or []
    ids = []
    for it in items[:30]:
        try:
            tid, tok = int(it.get("id")), str(it.get("token") or "")
        except (TypeError, ValueError):
            continue
        m = TicketMeta.query.get(tid)
        if m and hmac.compare_digest(m.token, tok):
            ids.append(tid)
    if not ids:
        return jsonify({"success": True, "tickets": []})
    rows = (SupportTicket.query.filter(SupportTicket.id.in_(ids))
            .order_by(SupportTicket.id.desc()).all())
    return jsonify({"success": True, "tickets": _pack(rows, include_phone=None)})


# ------------------------------------------------------------------- owner
@support_bp.route("/api/admin/tickets", methods=["GET"])
def admin_list():
    if not _admin_ok():
        return error_response("Wrong or missing admin key.", 401)
    q = SupportTicket.query
    if request.args.get("status") in STATUSES:
        q = q.filter_by(status=request.args["status"])
    rows = q.order_by(SupportTicket.id.desc()).limit(200).all()
    return jsonify({"success": True, "tickets": _pack(rows, "full")})


def _apply_reply(t, author, data):
    message = safe_text(data.get("message"), 1500)
    status = data.get("status")
    if status and status not in STATUSES:
        return error_response("Status must be Open, In progress or Resolved.")
    if not message and not status:
        return error_response("Write a reply or choose a status.")
    try:
        if message:
            db.session.add(TicketReply(ticket_id=t.id, author=author, message=message))
        if status:
            t.status = status
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Could not save.", 500)
    return jsonify({"success": True})


@support_bp.route("/api/admin/tickets/<int:tid>/reply", methods=["POST"])
def admin_reply(tid):
    if not _admin_ok():
        return error_response("Wrong or missing admin key.", 401)
    t = SupportTicket.query.get(tid)
    if t is None:
        return error_response("Ticket not found.", 404)
    return _apply_reply(t, "owner", request.get_json(silent=True) or {})


# -------------------------------------------------------------------- shop
@support_bp.route("/api/support/shop", methods=["GET"])
def shop_list():
    name = _norm(request.args.get("shop_name"))
    if not name:
        return error_response("shop_name is required.")
    ids = [m.ticket_id for m in TicketMeta.query.all() if _norm(m.shop_name) == name]
    if not ids:
        return jsonify({"success": True, "tickets": []})
    rows = (SupportTicket.query.filter(SupportTicket.id.in_(ids))
            .order_by(SupportTicket.id.desc()).limit(100).all())
    return jsonify({"success": True, "tickets": _pack(rows, "masked")})


@support_bp.route("/api/support/shop/<int:tid>/reply", methods=["POST"])
def shop_reply(tid):
    data = request.get_json(silent=True) or {}
    m = TicketMeta.query.get(tid)
    if m is None or _norm(m.shop_name) != _norm(data.get("shop_name")):
        return error_response("This ticket does not belong to your shop.", 403)
    t = SupportTicket.query.get(tid)
    if t is None:
        return error_response("Ticket not found.", 404)
    return _apply_reply(t, "shop", data)