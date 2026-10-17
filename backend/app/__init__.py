from flask import Flask
from flask_cors import CORS
from config import Config
from .extensions import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    CORS(app)

    from .payments import payments_bp
    from .queue import queue_bp
    from .shop_upi import shop_upi_bp, ensure_upi_columns
    from .bookings import bookings_bp

    app.register_blueprint(payments_bp)
    app.register_blueprint(queue_bp)
    app.register_blueprint(shop_upi_bp)
    app.register_blueprint(bookings_bp)

    from .models import (
        User,
        Shop,
        Barber,
        Service,
        Queue,
        Appointment,
        ShopPhoto
    )

    with app.app_context():
        db.create_all()         # also creates the new booking tables
        ensure_upi_columns()    # adds the QR columns to the existing shops table

    @app.route("/")
    def home():
        return "Glowora Backend is Running!"

    return app
