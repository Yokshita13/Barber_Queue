            pass

        import logging
        logging.exception("Shop UPI QR upload failed")
        return error_response("Could not save the QR image.", 500)


# --------------------------------------------------
# BARBER ACCOUNTS
# --------------------------------------------------

@queue_bp.route("/api/barbers/register", methods=["POST"])
def barber_register():
    d = request.get_json(silent=True) or {}
    name = safe_text(d.get("name"), 100)
    shop_name = safe_text(d.get("shop_name"), 150)
    address = safe_text(d.get("address"), 255)
    email = clean_text(d.get("email")).lower()
    phone = phone10(d.get("phone"))
    password = str(d.get("password") or "")
    gender = clean_text(d.get("gender_served")).lower()

    if not name or not shop_name or not address:
        return error_response("Name, shop name and address are required.")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return error_response("Enter a valid email address.")
    if len(phone) != 10:
        return error_response("Enter a valid 10-digit phone number.")
    if len(password) < 8:
        return error_response("Password must be at least 8 characters.")
    if gender not in GENDERS:
        return error_response("Choose men, women or unisex.")
    if User.query.filter(
        (User.email == email) | (User.phone == phone)
    ).first():
        return error_response(
            "This email or phone number is already registered.", 409
        )
    if find_by_name(Shop, shop_name):
        return error_response("A shop with this name already exists.", 409)

    try:
        user = User(
            name=name,
            email=email,
            phone=phone,
            role="barber",
            password=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.flush()

        shop = Shop(
            name=shop_name,
            address=address,
            phone=phone,
            contact_email=email,
            gender_served=gender,
            status="open"
        )
        db.session.add(shop)
        db.session.flush()

        db.session.add(Barber(
            user_id=user.id,
            shop_id=shop.id,
            specialization="General",
            status="available"
        ))
        db.session.commit()

        return jsonify({
            "success": True,
            "token": make_token(user.id),
            "shop": shop_json(shop)
        }), 201

    except Exception:
        db.session.rollback()
        import logging
        logging.exception("Barber registration failed")
        return error_response("Could not create the account.", 500)


@queue_bp.route("/api/barbers/login", methods=["POST"])
def barber_login():
    d = request.get_json(silent=True) or {}
    email = clean_text(d.get("email")).lower()
    password = str(d.get("password") or "")

    user = User.query.filter_by(email=email, role="barber").first()
    barber = Barber.query.filter_by(user_id=user.id).first() if user else None

    if not user or not barber or not check_password_hash(user.password, password):
        return error_response("Wrong email or password.", 401)

    return jsonify({
        "success": True,
        "token": make_token(user.id),
        "shop": shop_json(barber.shop)
    })


@queue_bp.route("/api/barbers/me", methods=["GET", "PUT"])
@barber_required
def barber_me():
    shop = g.barber.shop

    if request.method == "GET":
        return jsonify({"success": True, "shop": shop_json(shop)})

    d = request.get_json(silent=True) or {}

    try:
        if d.get("shop_name"):
            new_name = safe_text(d["shop_name"], 150)
            other = find_by_name(Shop, new_name)
            if other is not None and other.id != shop.id:
                return error_response(
                    "A shop with this name already exists.", 409
                )
            shop.name = new_name

        if d.get("address"):
            shop.address = safe_text(d["address"], 255)

        if d.get("phone"):
            phone = phone10(d["phone"])
            if len(phone) != 10:
                return error_response("Enter a valid 10-digit phone number.")

            taken = User.query.filter(
                User.phone == phone,
                User.id != g.barber.user_id
            ).first()

            if taken:
                return error_response("This phone number is already used.", 409)

            shop.phone = phone
            g.barber.user.phone = phone

        if d.get("name"):
            g.barber.user.name = safe_text(d["name"], 100)

        if d.get("gender_served"):
            gs = clean_text(d["gender_served"]).lower()
            if gs not in GENDERS:
                return error_response("Choose men, women or unisex.")
            shop.gender_served = gs

        if "opening_time" in d:
            shop.opening_time = safe_text(d["opening_time"], 10)

        if "closing_time" in d:
            shop.closing_time = safe_text(d["closing_time"], 10)

        if "open" in d:
            shop.status = "open" if d["open"] else "closed"
