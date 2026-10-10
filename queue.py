from uuid import uuid4
from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from .extensions import db
from .models import User, Shop, Barber, Service, Queue

queue_bp = Blueprint("queue", __name__)


def ensure_demo_data():
    """Create demo records only when they don't already exist."""
    service_details = [
        ("Hair Cut", 250, 20),
        ("Beard Trim", 150, 15),
        ("Hair Color", 800, 60),
        ("Facial", 600, 45),
        ("Hair Spa", 1200, 90),
    ]

    services = {}
    for name, price, duration in service_details:
        service = Service.query.filter_by(name=name).first()
        if service is None:
            service = Service(
                name=name,
                price=price,
                duration=duration,
                status="active",
            )
            db.session.add(service)
        services[name] = service

    shop_details = [
        ("Royal Cuts", "Hazratganj, Lucknow", "demo-royal@trimq.local"),
        ("The Blade Room", "Gomtinagar, Lucknow", "demo-blade@trimq.local"),
        ("Style Studio", "Alambagh, Lucknow", "demo-style@trimq.local"),
        ("Classic Barber", "Chowk, Lucknow", "demo-classic@trimq.local"),
    ]

    for shop_name, address, email in shop_details:
        shop = Shop.query.filter_by(name=shop_name).first()
        if shop is None:
            shop = Shop(
                name=shop_name,
                address=address,
                status="open" if shop_name != "Classic Barber" else "closed",
            )
            db.session.add(shop)
            db.session.flush()

        # Create one demo barber for each shop if it has none.
        barber = Barber.query.filter_by(shop_id=shop.id).first()
        if barber is None:
            barber_user = User.query.filter_by(email=email).first()
            if barber_user is None:
                barber_user = User(
                    name=shop_name + " Barber",
                    email=email,
                    password="demo-only-change-before-production",
                    role="barber",
                )
                db.session.add(barber_user)
                db.session.flush()

            barber = Barber(
                user_id=barber_user.id,
                shop_id=shop.id,
                specialization="General Barber",
                status="available",
            )
            db.session.add(barber)

    customer = User.query.filter_by(
        email="demo.customer@trimq.local"
    ).first()

    if customer is None:
        customer = User(
            name="Demo Customer",
            email="demo.customer@trimq.local",
            password="demo-only-change-before-production",
            role="customer",
        )
        db.session.add(customer)

    db.session.commit()


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
        "joined_at": item.joined_at.isoformat() if item.joined_at else None,
    }


@queue_bp.route("/api/queue/initialize-demo", methods=["POST"])
def initialize_demo():
    try:
        ensure_demo_data()
        return jsonify({"success": True, "message": "Demo records are ready."})
    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Could not initialize demo records. Check the Flask terminal.",
        }), 500


@queue_bp.route("/api/queue", methods=["GET"])
def get_queue():
    shop_name = request.args.get("shop_name", "Royal Cuts")
    shop = Shop.query.filter_by(name=shop_name).first()

    if shop is None:
        return jsonify({"success": False, "error": "Shop not found."}), 404

    items = (
        Queue.query
        .filter(
            Queue.shop_id == shop.id,
            Queue.status.in_(["waiting", "serving", "cur", "nxt", "wait"]),
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


@queue_bp.route("/api/queue", methods=["POST"])
def create_queue_entry():
    data = request.get_json(silent=True) or {}
    shop_name = data.get("shop_name")
    service_name = data.get("service_name")
    customer_name = (data.get("customer_name") or "Demo Customer").strip()

    if not shop_name or not service_name:
        return jsonify({
            "success": False,
            "error": "Shop and service are required.",
        }), 400

    try:
        ensure_demo_data()

        shop = Shop.query.filter_by(name=shop_name).first()
        service = Service.query.filter_by(name=service_name).first()

        if shop is None or service is None:
            return jsonify({
                "success": False,
                "error": "Shop or service not found.",
            }), 404

        barber = Barber.query.filter_by(shop_id=shop.id).first()
        if barber is None:
            return jsonify({
                "success": False,
                "error": "No barber is configured for this shop.",
            }), 400

        # customer = User.query.filter_by(
        #     email="demo.customer@trimq.local"
        # ).first()
        customer = User(
        name=customer_name or "Demo Customer",
        email=f"demo.customer.{uuid4().hex}@trimq.local",
        password="demo-only-change-before-production",
        role="customer",
        )

        db.session.add(customer)
        db.session.flush()
        
        if customer is None:
            return jsonify({
                "success": False,
                "error": "Demo customer was not initialized.",
            }), 500

        # Keep the demo customer name up to date.
        if customer_name:
            customer.name = customer_name

        last_token = db.session.query(
            func.max(Queue.token_number)
        ).filter_by(shop_id=shop.id).scalar() or 0

        entry = Queue(
            customer_id=customer.id,
            barber_id=barber.id,
            service_id=service.id,
            shop_id=shop.id,
            token_number=last_token + 1,
            status="waiting",
            joined_at=datetime.utcnow(),
        )

        # db.session.add(entry)
        # db.session.commit()
        db.session.add(entry)
        db.session.flush()
        advance_queue(shop.id)
        db.session.commit()
        return jsonify({
            "success": True,
            "booking": queue_item_json(entry),
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Booking could not be saved. Check the Flask terminal.",
        }), 500


def advance_queue(shop_id):
    """Set the earliest waiting entry to serving if none is currently serving."""
    serving = Queue.query.filter(
        Queue.shop_id == shop_id,
        Queue.status.in_(["serving", "cur"]),
    ).first()

    if serving is None:
        next_entry = (
            Queue.query
            .filter_by(shop_id=shop_id, status="waiting")
            .order_by(Queue.token_number.asc())
            .first()
        )
        if next_entry:
            next_entry.status = "serving"


@queue_bp.route("/api/queue/<int:entry_id>/complete", methods=["POST"])
def complete_queue_entry(entry_id):
    entry = db.session.get(Queue, entry_id)
    if entry is None:
        return jsonify({"success": False, "error": "Queue entry not found."}), 404

    entry.status = "completed"
    entry.completed_at = datetime.utcnow()
    advance_queue(entry.shop_id)
    db.session.commit()

    return jsonify({"success": True, "message": "Token completed."})


@queue_bp.route("/api/queue/<int:entry_id>/skip", methods=["POST"])
def skip_queue_entry(entry_id):
    entry = db.session.get(Queue, entry_id)
    if entry is None:
        return jsonify({"success": False, "error": "Queue entry not found."}), 404

    entry.status = "skipped"
    advance_queue(entry.shop_id)
    db.session.commit()

    return jsonify({"success": True, "message": "Token skipped."})
