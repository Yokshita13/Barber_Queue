import os
class Config:
    # Secret key for sessions and security
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "trimq-development-secret-key"
    )

    # SQLite database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///trimq.db"
    )

    # Disable unnecessary SQLAlchemy tracking
    SQLALCHEMY_TRACK_MODIFICATIONS = False