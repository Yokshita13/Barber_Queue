
from uuid import uuid4
from datetime import datetime

from flask import Blueprint, request, jsonify
from sqlalchemy import func

from .extensions import db
from .models import User, Shop, Barber, Service, Queue

queue_bp = Blueprint("queue", __name__)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

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


def get_or_create_customer(customer_name):
    """Create a unique customer record."""
    customer_name = clean_text(customer_name) or "Demo Customer"

    customer = User(
        name=customer_name,
        email=f"demo.customer.{uuid4().hex}@trimq.local",
        password="demo-only-change-before-production",
        role="customer",
    )

    db.session.add(customer)
    db.session.flush()

    return customer


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
    }


def shop_json(shop):
    return {
        "id": shop.id,
        "name": shop.name,
        "address": shop.address,
        "status": shop.status,
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
        # Keep the detailed exception in the Flask terminal.
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


# --------------------------------------------------
# REGISTER / SYNC A CUSTOM SHOP
# --------------------------------------------------

@queue_bp.route("/api/shops/sync", methods=["POST"])
def sync_shop():
    """
    Register a custom shop in the database.

    JSON:
    {
        "shop_name": "My Shop",
        "address": "Lucknow",
        "email": "barber@example.com",
        "barber_name": "Barber Name"
    }

    The frontend must call this endpoint when the barber
    saves or updates their shop profile.
    """
    data = request.get_json(silent=True) or {}

    shop_name = clean_text(
        data.get("shop_name") or data.get("name")
    )
    address = clean_text(data.get("address")) or "Address not provided"
    email = clean_text(data.get("email")).lower()
    barber_name = clean_text(data.get("barber_name")) or "Shop Barber"

    if not shop_name:
        return error_response("Shop name is required.")

    if not email:
        return error_response(
            "Barber email is required to register a custom shop."
        )

    try:
        shop = find_by_name(Shop, shop_name)

        if shop is None:
            shop = Shop(
                name=shop_name,
                address=address,
                status="open",
            )
            db.session.add(shop)
            db.session.flush()
        else:
            shop.address = address

        barber_user = User.query.filter_by(email=email).first()

        if barber_user is None:
            barber_user = User(
                name=barber_name,
                email=email,
                password="demo-only-change-before-production",
                role="barber",
            )
            db.session.add(barber_user)
            db.session.flush()

        barber = Barber.query.filter_by(shop_id=shop.id).first()

        if barber is None:
            db.session.add(Barber(
                user_id=barber_user.id,
                shop_id=shop.id,
                specialization="General Barber",
                status="available",
            ))

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Shop registered successfully.",
            "shop": shop_json(shop),
        })

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Custom shop registration failed")
        return error_response(
            "Could not register shop. Check the Flask terminal.",
            500
        )


# --------------------------------------------------
# REGISTER / SYNC A CUSTOM SERVICE
# --------------------------------------------------

@queue_bp.route("/api/services/sync", methods=["POST"])
def sync_service():
    """
    Create or update a service.

    JSON:
    {
        "name": "Foot & calf massage",
        "price": 199,
        "duration": 20
    }
    """
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
            return error_response(
                f"Shop '{shop_name}' was not found in the database. "
                "Register the shop first.",
                404
            )

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
        # Ensure the predefined demo shops/services exist.
        ensure_demo_data()

        shop = find_by_name(Shop, shop_name)
        service = find_by_name(Service, service_name)

        if shop is None:
            return error_response(
                f"Shop '{shop_name}' is not registered. "
                "Save/sync the shop profile first.",
                404
            )

        if service is None:
            return error_response(
                f"Service '{service_name}' is not registered. "
                "Save/sync the service first.",
                404
            )

        if clean_text(shop.status).lower() != "open":
            return error_response(
                "This shop is currently closed.",
                400
            )

        if clean_text(service.status).lower() != "active":
            return error_response(
                "This service is currently unavailable.",
                400
            )

        barber = Barber.query.filter_by(
            shop_id=shop.id
        ).first()

        if barber is None:
            return error_response(
                "No barber is configured for this shop.",
                400
            )

        # Create the customer and booking in one transaction.
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


# --------------------------------------------------
# COMPLETE TOKEN
# --------------------------------------------------

@queue_bp.route(
    "/api/queue/<int:entry_id>/complete",
    methods=["POST"]
)
def complete_queue_entry(entry_id):
    try:
        entry = db.session.get(Queue, entry_id)

        if entry is None:
            return error_response("Queue entry not found.", 404)

        if entry.status in ("completed", "skipped"):
            return error_response(
                "This queue entry is already closed.",
                400
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
        return error_response(
            "Could not complete token.",
            500
        )


# --------------------------------------------------
# SKIP TOKEN
# --------------------------------------------------

@queue_bp.route(
    "/api/queue/<int:entry_id>/skip",
    methods=["POST"]
)
def skip_queue_entry(entry_id):
    try:
        entry = db.session.get(Queue, entry_id)

        if entry is None:
            return error_response("Queue entry not found.", 404)

        if entry.status in ("completed", "skipped"):
            return error_response(
                "This queue entry is already closed.",
                400
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
        return error_response(
            "Could not skip token.",
            500
        )