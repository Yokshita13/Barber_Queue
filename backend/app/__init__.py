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
    app.register_blueprint(payments_bp)
    app.register_blueprint(queue_bp)
    from .models import (
        User,
        Shop,
        Barber,
        Service,
        Queue,
        Appointment
    )
    with app.app_context():
        db.create_all()
    @app.route("/")
    def home():
        return "TrimQ Backend is Running!"
    return app