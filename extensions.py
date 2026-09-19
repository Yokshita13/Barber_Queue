from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Database
db = SQLAlchemy()

# Allow frontend to communicate with Flask backend
cors = CORS