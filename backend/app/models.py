"""SQLAlchemy models for BarberQ.

This schema remains compatible with the existing deployed database. The real-shop
flow changes in queue.py do not require a database migration.
"""

from datetime import datetime
# from .extensions import db

# class User(db.Model):
#     __tablename__ = "users"
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(100), nullable=False)
#     email = db.Column(
#         db.String(120),
#         unique=True,
#         nullable=False
#     )
#     phone = db.Column(db.String(15), unique=True)
#     password = db.Column(db.String(255), nullable=False)
#     role = db.Column(
#         db.String(20),
#         nullable=False,
#         default="customer"
#     )
#     created_at = db.Column(
#         db.DateTime,
#         default=datetime.utcnow
#     )
#     barber = db.relationship(
#         "Barber",
#         back_populates="user",
#         uselist=False
#     )
#     queues = db.relationship(
#         "Queue",
#         back_populates="customer",
#         foreign_keys="Queue.customer_id"
#     )
#     appointments = db.relationship(
#         "Appointment",
#         back_populates="customer"
#     )
#     def __repr__(self):
#         return f"<User {self.name}>"


# class Shop(db.Model):
#     __tablename__ = "shops"
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(
#         db.String(150),
#         nullable=False
#     )
#     address = db.Column(db.String(255))
#     phone = db.Column(db.String(15))
#     contact_email = db.Column(db.String(120), nullable=True)
#     upi_id = db.Column(db.String(100), nullable=True)
#     upi_qr_url = db.Column(db.String(500), nullable=True)
   
#     gender_served = db.Column(db.String(10), default="unisex")   
    
#     opening_time = db.Column(db.String(10))
#     closing_time = db.Column(db.String(10))
#     status = db.Column(
#         db.String(20),
#         default="open"
#     )
#     barbers = db.relationship(
#         "Barber",
#         back_populates="shop",
#         cascade="all, delete-orphan"
#     )
    
#     photos = db.relationship(
#     "ShopPhoto",
#     back_populates="shop",
#     cascade="all, delete-orphan",
#     order_by="ShopPhoto.id"
# )

#     queues = db.relationship(
#         "Queue",
#         back_populates="shop"
#     )
#     appointments = db.relationship(
#         "Appointment",
#         back_populates="shop"
#     )
#     def __repr__(self):
#         return f"<Shop {self.name}>"

# class ShopPhoto(db.Model):
#     __tablename__ = "shop_photos"

#     id = db.Column(db.Integer, primary_key=True)

#     shop_id = db.Column(
#         db.Integer,
#         db.ForeignKey("shops.id"),
#         nullable=False
#     )

#     image_url = db.Column(
#         db.String(500),
#         nullable=False
#     )

#     created_at = db.Column(
#         db.DateTime,
#         default=datetime.utcnow
#     )

#     shop = db.relationship(
#         "Shop",
#         back_populates="photos"
#     )

# class Barber(db.Model):
#     __tablename__ = "barbers"
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(
#         db.Integer,
#         db.ForeignKey("users.id"),
#         nullable=False,
#         unique=True
#     )
#     shop_id = db.Column(
#         db.Integer,
#         db.ForeignKey("shops.id"),
#         nullable=False
#     )
#     specialization = db.Column(
#         db.String(100)
#     )
#     status = db.Column(
#         db.String(20),
#         default="available"
#     )
#     user = db.relationship(
#         "User",
#         back_populates="barber"
#     )
#     shop = db.relationship(
#         "Shop",
#         back_populates="barbers"
#     )
#     queues = db.relationship(
#         "Queue",
#         back_populates="barber"
#     )
#     appointments = db.relationship(
#         "Appointment",
#         back_populates="barber"
#     )
#     def __repr__(self):
#         return f"<Barber {self.id}>"

# class Service(db.Model):
#     __tablename__ = "services"
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(
#         db.String(100),
#         nullable=False
#     )
#     description = db.Column(
#         db.Text
#     )
#     price = db.Column(
#         db.Float,
#         nullable=False,
#         default=0
#     )
#     duration = db.Column(
#         db.Integer,
#         nullable=False,
#         default=30
#     )
#     status = db.Column(
#         db.String(20),
#         default="active"
#     )
#     queues = db.relationship(
#         "Queue",
#         back_populates="service"
#     )
#     appointments = db.relationship(
#         "Appointment",
#         back_populates="service"
#     )
#     def __repr__(self):
#         return f"<Service {self.name}>"


# class Queue(db.Model):
#     __tablename__ = "queues"
    
    
#     payment_method = db.Column(db.String(20), default="shop")         
#     payment_status = db.Column(db.String(30), default="pending")      
#     razorpay_payment_id = db.Column(db.String(60), nullable=True)
    
#     id = db.Column(
#         db.Integer,
#         primary_key=True
#     )
#     customer_id = db.Column(
#         db.Integer,
#         db.ForeignKey("users.id"),
#         nullable=False
#     )
#     barber_id = db.Column(
#         db.Integer,
#         db.ForeignKey("barbers.id"),
#         nullable=False
#     )
#     service_id = db.Column(
#         db.Integer,
#         db.ForeignKey("services.id"),
#         nullable=False
#     )
#     shop_id = db.Column(
#         db.Integer,
#         db.ForeignKey("shops.id"),
#         nullable=False
#     )
#     token_number = db.Column(
#         db.Integer,
#         nullable=False
#     )
#     status = db.Column(
#         db.String(20),
#         default="waiting"
#     )
#     joined_at = db.Column(
#         db.DateTime,
#         default=datetime.utcnow
#     )
#     started_at = db.Column(
#         db.DateTime,
#         nullable=True
#     )
#     completed_at = db.Column(
#         db.DateTime,
#         nullable=True
#     )
#     customer = db.relationship(
#         "User",
#         back_populates="queues",
#         foreign_keys=[customer_id]
#     )
#     barber = db.relationship(
#         "Barber",
#         back_populates="queues"
#     )
#     service = db.relationship(
#         "Service",
#         back_populates="queues"
#     )
#     shop = db.relationship(
#         "Shop",
#         back_populates="queues"
#     )
#     def __repr__(self):
#         return f"<Queue Token {self.token_number}>"


# class Appointment(db.Model):
#     __tablename__ = "appointments"
#     id = db.Column(
#         db.Integer,
#         primary_key=True
#     )
#     customer_id = db.Column(
#         db.Integer,
#         db.ForeignKey("users.id"),
#         nullable=False
#     )
#     barber_id = db.Column(
#         db.Integer,
#         db.ForeignKey("barbers.id"),
#         nullable=False
#     )
#     service_id = db.Column(
#         db.Integer,
#         db.ForeignKey("services.id"),
#         nullable=False
#     )
#     shop_id = db.Column(
#         db.Integer,
#         db.ForeignKey("shops.id"),
#         nullable=False
#     )
#     appointment_date = db.Column(
#         db.Date,
#         nullable=False
#     )
#     appointment_time = db.Column(
#         db.String(10),
#         nullable=False
#     )
#     status = db.Column(
#         db.String(20),
#         default="booked"
#     )
#     created_at = db.Column(
#         db.DateTime,
#         default=datetime.utcnow
#     )
#     customer = db.relationship(
#         "User",
#         back_populates="appointments"
#     )
#     barber = db.relationship(
#         "Barber",
#         back_populates="appointments"
#     )
#     service = db.relationship(
#         "Service",
#         back_populates="appointments"
#     )
#     shop = db.relationship(
#         "Shop",
#         back_populates="appointments"
#     )
#     def __repr__(self):
#         return f"<Appointment {self.id}>"


from datetime import datetime
from .extensions import db

#USER MODEL
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )
    phone = db.Column(db.String(15), unique=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.String(20),
        nullable=False,
        default="customer"
    )
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    barber = db.relationship(
        "Barber",
        back_populates="user",
        uselist=False
    )
    queues = db.relationship(
        "Queue",
        back_populates="customer",
        foreign_keys="Queue.customer_id"
    )
    appointments = db.relationship(
        "Appointment",
        back_populates="customer"
    )
    def __repr__(self):
        return f"<User {self.name}>"


#SHOP MODEL
class Shop(db.Model):
    __tablename__ = "shops"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(
        db.String(150),
        nullable=False
    )
    address = db.Column(db.String(255))
    phone = db.Column(db.String(15))
    contact_email = db.Column(db.String(120), nullable=True)
    upi_id = db.Column(db.String(100), nullable=True)
    upi_qr_url = db.Column(db.String(500), nullable=True)
    # UPI QR image stored in the database (used by shop_upi.py)
    upi_qr_data = db.Column(db.Text, nullable=True)
    upi_qr_mime = db.Column(db.String(30), nullable=True)
    # in class Shop
    gender_served = db.Column(db.String(10), default="unisex")   # men / women / unisex
    
    opening_time = db.Column(db.String(10))
    closing_time = db.Column(db.String(10))
    status = db.Column(
        db.String(20),
        default="open"
    )
    barbers = db.relationship(
        "Barber",
        back_populates="shop",
        cascade="all, delete-orphan"
    )
    
    photos = db.relationship(
    "ShopPhoto",
    back_populates="shop",
    cascade="all, delete-orphan",
    order_by="ShopPhoto.id"
)

    queues = db.relationship(
        "Queue",
        back_populates="shop"
    )
    appointments = db.relationship(
        "Appointment",
        back_populates="shop"
    )
    def __repr__(self):
        return f"<Shop {self.name}>"

class ShopPhoto(db.Model):
    __tablename__ = "shop_photos"

    id = db.Column(db.Integer, primary_key=True)

    shop_id = db.Column(
        db.Integer,
        db.ForeignKey("shops.id"),
        nullable=False
    )

    image_url = db.Column(
        db.String(500),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    shop = db.relationship(
        "Shop",
        back_populates="photos"
    )

#BARBER MODEL
class Barber(db.Model):
    __tablename__ = "barbers"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True
    )
    shop_id = db.Column(
        db.Integer,
        db.ForeignKey("shops.id"),
        nullable=False
    )
    specialization = db.Column(
        db.String(100)
    )
    status = db.Column(
        db.String(20),
        default="available"
    )
    user = db.relationship(
        "User",
        back_populates="barber"
    )
    shop = db.relationship(
        "Shop",
        back_populates="barbers"
    )
    queues = db.relationship(
        "Queue",
        back_populates="barber"
    )
    appointments = db.relationship(
        "Appointment",
        back_populates="barber"
    )
    def __repr__(self):
        return f"<Barber {self.id}>"

#SERVICE MODEL
class Service(db.Model):
    __tablename__ = "services"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(
        db.String(100),
        nullable=False
    )
    description = db.Column(
        db.Text
    )
    price = db.Column(
        db.Float,
        nullable=False,
        default=0
    )
    duration = db.Column(
        db.Integer,
        nullable=False,
        default=30
    )
    status = db.Column(
        db.String(20),
        default="active"
    )
    queues = db.relationship(
        "Queue",
        back_populates="service"
    )
    appointments = db.relationship(
        "Appointment",
        back_populates="service"
    )
    def __repr__(self):
        return f"<Service {self.name}>"

#QUEUE MODEL

class Queue(db.Model):
    __tablename__ = "queues"
    
    
    # in class Queue
    payment_method = db.Column(db.String(20), default="shop")         # razorpay / upi_qr / shop
    payment_status = db.Column(db.String(30), default="pending")      # paid / awaiting_confirmation / pending
    razorpay_payment_id = db.Column(db.String(60), nullable=True)
    
    id = db.Column(
        db.Integer,
        primary_key=True
    )
    customer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )
    barber_id = db.Column(
        db.Integer,
        db.ForeignKey("barbers.id"),
        nullable=False
    )
    service_id = db.Column(
        db.Integer,
        db.ForeignKey("services.id"),
        nullable=False
    )
    shop_id = db.Column(
        db.Integer,
        db.ForeignKey("shops.id"),
        nullable=False
    )
    token_number = db.Column(
        db.Integer,
        nullable=False
    )
    status = db.Column(
        db.String(20),
        default="waiting"
    )
    joined_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    started_at = db.Column(
        db.DateTime,
        nullable=True
    )
    completed_at = db.Column(
        db.DateTime,
        nullable=True
    )
    customer = db.relationship(
        "User",
        back_populates="queues",
        foreign_keys=[customer_id]
    )
    barber = db.relationship(
        "Barber",
        back_populates="queues"
    )
    service = db.relationship(
        "Service",
        back_populates="queues"
    )
    shop = db.relationship(
        "Shop",
        back_populates="queues"
    )
    def __repr__(self):
        return f"<Queue Token {self.token_number}>"

#APPOINTMENT MODEL 
class Appointment(db.Model):
    __tablename__ = "appointments"
    id = db.Column(
        db.Integer,
        primary_key=True
    )
    customer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )
    barber_id = db.Column(
        db.Integer,
        db.ForeignKey("barbers.id"),
        nullable=False
    )
    service_id = db.Column(
        db.Integer,
        db.ForeignKey("services.id"),
        nullable=False
    )
    shop_id = db.Column(
        db.Integer,
        db.ForeignKey("shops.id"),
        nullable=False
    )
    appointment_date = db.Column(
        db.Date,
        nullable=False
    )
    appointment_time = db.Column(
        db.String(10),
        nullable=False
    )
    status = db.Column(
        db.String(20),
        default="booked"
    )
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    customer = db.relationship(
        "User",
        back_populates="appointments"
    )
    barber = db.relationship(
        "Barber",
        back_populates="appointments"
    )
    service = db.relationship(
        "Service",
        back_populates="appointments"
    )
    shop = db.relationship(
        "Shop",
        back_populates="appointments"
    )
    def __repr__(self):
        return f"<Appointment {self.id}>"
