"""backend/app/shop_upi.py

Saves each shop's own UPI ID + QR image in the database and serves it back.
The image is stored inside the DB (base64), so it survives Render restarts
and redeploys, unlike files written to disk.
"""
import base64
import re
import time
from urllib.parse import quote

from flask import Blueprint, Response, jsonify, request
from sqlalchemy import inspect, text

from .extensions import db
from .models import Shop

shop_upi_bp = Blueprint("shop_upi", __name__)

MAX_BYTES = 2 * 1024 * 1024
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}
UPI_RE = re.compile(r"^[\w.\-]{2,}@[A-Za-z]{2,}$")

# columns this feature needs on the shops table
UPI_COLUMNS = [
    ("contact_email", "VARCHAR(120)"),
    ("upi_id", "VARCHAR(100)"),
    ("upi_qr_url", "VARCHAR(500)"),
    ("upi_qr_data", "TEXT"),
    ("upi_qr_mime", "VARCHAR(30)"),
]


def ensure_upi_columns():
    """Adds any missing columns to an existing database. Safe to run on every start."""
    existing = {c["name"] for c in inspect(db.engine).get_columns("shops")}
    for name, ddl in UPI_COLUMNS:
        if name not in existing:
            db.session.execute(text(f"ALTER TABLE shops ADD COLUMN {name} {ddl}"))
    db.session.commit()


def _find_shop(name):
    name = (name or "").strip().lower()
    if not name:
        return None
    return Shop.query.filter(db.func.lower(Shop.name) == name).first()


@shop_upi_bp.route("/api/shops/upi", methods=["POST"])
def save_shop_upi():
    shop = _find_shop(request.form.get("shop_name"))
    if not shop:
        return jsonify({
            "success": False,
            "error": "Shop not found. Save your shop details in Profile first."
        }), 404

    upi_id = (request.form.get("upi_id") or "").strip()
    if upi_id and not UPI_RE.match(upi_id):
        return jsonify({"success": False, "error": "Invalid UPI ID"}), 400

    qr = request.files.get("qr")
    if qr and qr.filename:
        if qr.mimetype not in ALLOWED_MIME:
            return jsonify({"success": False, "error": "Use a PNG, JPG or WebP image"}), 400
        data = qr.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            return jsonify({"success": False, "error": "QR image must be under 2 MB"}), 400
        shop.upi_qr_data = base64.b64encode(data).decode("ascii")
        shop.upi_qr_mime = qr.mimetype
        # ?v= changes on every upload so phones never show an old cached QR
        shop.upi_qr_url = (
            f"/api/shops/upi/qr?shop_name={quote(shop.name)}&v={int(time.time())}"
        )

    if upi_id:
        shop.upi_id = upi_id

    db.session.commit()
    return jsonify({
        "success": True,
        "upi_id": shop.upi_id,
        "upi_qr_url": shop.upi_qr_url if shop.upi_qr_data else None
    })


@shop_upi_bp.route("/api/shops/upi", methods=["GET"])
def get_shop_upi():
    shop = _find_shop(request.args.get("shop_name"))
    if not shop:
        return jsonify({"success": False, "error": "Shop not found"}), 404
    return jsonify({
        "success": True,
        "upi_id": shop.upi_id,
        "upi_qr_url": shop.upi_qr_url if shop.upi_qr_data else None
    })


@shop_upi_bp.route("/api/shops/upi/qr", methods=["GET"])
def get_shop_qr_image():
    shop = _find_shop(request.args.get("shop_name"))
    if not shop or not shop.upi_qr_data:
        return jsonify({"success": False, "error": "No QR uploaded"}), 404
    return Response(
        base64.b64decode(shop.upi_qr_data),
        mimetype=shop.upi_qr_mime or "image/png",
        headers={"Cache-Control": "public, max-age=300"}
    )