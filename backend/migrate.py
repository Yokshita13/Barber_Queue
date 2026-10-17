from sqlalchemy import inspect, text
from app import create_app
from app.extensions import db

NEW_COLUMNS = [
    ("shops",  "gender_served",       "VARCHAR(10) DEFAULT 'unisex'"),
    ("queues", "payment_method",      "VARCHAR(20) DEFAULT 'shop'"),
    ("queues", "payment_status",      "VARCHAR(30) DEFAULT 'pending'"),
    ("queues", "razorpay_payment_id", "VARCHAR(60)"),
]

app = create_app()
with app.app_context():
    insp = inspect(db.engine)
    for table, column, ddl in NEW_COLUMNS:
        existing = [c["name"] for c in insp.get_columns(table)]
        if column in existing:
            print(f"skip  {table}.{column} (already there)")
            continue
        db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
        db.session.commit()
        print(f"added {table}.{column}")
print("Done.")