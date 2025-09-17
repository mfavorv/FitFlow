from app import app, db
from models import Client, Subscription, Admin, Expense
from auth import hash_password
from datetime import datetime, timedelta

# ---------- Sample Data ---------- #

subscriptions = [
    {"name": "Monthly", "price": 3000.0, "duration_days": 30},
    {"name": "Quarterly", "price": 8000.0, "duration_days": 90},
    {"name": "Annual", "price": 30000.0, "duration_days": 365}
]

clients = [
    {
        "first_name": "Alice",
        "last_name": "Smith",
        "email": "alice@example.com",
        "phone": "0712345678",
        "password": "password123",
        "subscription_name": "Monthly",
        "subscription_expiry": datetime.utcnow() + timedelta(days=30)
    },
    {
        "first_name": "Bob",
        "last_name": "Johnson",
        "email": "bob@example.com",
        "phone": "0798765432",
        "password": "secure456",
        "subscription_name": "Quarterly",
        "subscription_expiry": datetime.utcnow() + timedelta(days=90)
    }
]

admins = [
    {
        "name": "AdminOne",
        "email": "admin1@example.com",
        "password": "adminpass1"
    },
    {
        "name": "AdminTwo",
        "email": "admin2@example.com",
        "password": "adminpass2"
    }
]

expenses = [
    {"expense": "Electricity", "cost": 5000, "created_at": datetime.utcnow()},
    {"expense": "Water", "cost": 1200, "created_at": datetime.utcnow()},
    {"expense": "Cleaning Supplies", "cost": 800, "created_at": datetime.utcnow()}
]

# ---------- Seeding ---------- #

with app.app_context():
    print("🔄 Resetting database...")
    db.drop_all()
    db.create_all()

    print("📦 Seeding subscriptions...")
    subscription_map = {}
    for s in subscriptions:
        sub = Subscription(
            name=s["name"],
            price=s["price"],
            duration_days=s["duration_days"]
        )
        db.session.add(sub)
        db.session.flush()
        subscription_map[s["name"]] = sub.id

    print("👤 Seeding clients...")
    for c in clients:
        client = Client(
            first_name=c["first_name"],
            last_name=c["last_name"],
            email=c["email"],
            phone=c["phone"],
            password_hash=hash_password(c["password"]),
            subscription_id=subscription_map[c["subscription_name"]],
            subscription_expiry=c["subscription_expiry"]
        )
        db.session.add(client)

    print("🛠️ Seeding admins...")
    for a in admins:
        admin = Admin(
            name=a["name"],
            email=a["email"],
            password_hash=hash_password(a["password"])
        )
        db.session.add(admin)

    print("💸 Seeding expenses...")
    for e in expenses:
        expense = Expense(
            expense=e["expense"],
            cost=e["cost"],
            created_at=e["created_at"]
        )
        db.session.add(expense)

    db.session.commit()
    print("✅ Seeding complete.")
