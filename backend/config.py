import os
import re
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

_db_url = os.environ.get("DATABASE_URL", "sqlite:///trimq.db")
# always use the psycopg2 driver that requirements.txt installs
_db_url = re.sub(r"^postgres(ql)?(\+\w+)?://", "postgresql+psycopg2://", _db_url)


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "trimq-development-secret-key")

    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")
