import hmac
import hashlib
import razorpay
from flask import Blueprint, request, jsonify, current_app

payments_bp = Blueprint("payments", __name__)

def get_razorpay_client():
    return razorpay.Client(
        auth=(
            current_app.config["RAZORPAY_KEY_ID"],
            current_app.config["RAZORPAY_KEY_SECRET"]
        )
    )

@payments_bp.route("/api/payments/create-order", methods=["POST"])
def create_order():

    data = request.get_json() or {}

    amount = data.get("amount")

    if not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({
            "error": "Invalid amount"
        }), 400

    client = get_razorpay_client()

    order = client.order.create({
        "amount": int(amount * 100),
        "currency": "INR",
        "payment_capture": 1
    })

    return jsonify({
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key_id": current_app.config["RAZORPAY_KEY_ID"]
    })


@payments_bp.route("/api/payments/verify", methods=["POST"])
def verify_payment():

    data = request.get_json() or {}

    order_id = data.get("razorpay_order_id")
    payment_id = data.get("razorpay_payment_id")
    signature = data.get("razorpay_signature")

    if not all([order_id, payment_id, signature]):
        return jsonify({
            "verified": False,
            "error": "Missing payment details"
        }), 400

    body = f"{order_id}|{payment_id}"

    expected_signature = hmac.new(
        current_app.config["RAZORPAY_KEY_SECRET"].encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(
        expected_signature,
        signature
    ):
        return jsonify({
            "verified": False,
            "error": "Signature mismatch"
        }), 400

    return jsonify({
        "verified": True
    })