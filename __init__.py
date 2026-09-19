from flask import Flask
from flask_cors import CORS

from config import Config
from .extensions import db


def create_app():
    # Create Flask application
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    CORS(app)

    # Import models
    from .models import (
        User,
        Shop,
        Barber,
        Service,
        Queue,
        Appointment
    )

    # Create database tables
    with app.app_context():
        db.create_all()

    # Home route
    @app.route("/")
    def home():
        return "TrimQ Backend is Running!"

    return app