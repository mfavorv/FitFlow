from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData  
from datetime import datetime
from app import bcrypt

metadata = MetaData(naming_convention={
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
})

db = SQLAlchemy(metadata=metadata)

class Client(db.Model):
    __tablename__ = "clients"
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(150), nullable=False)
    last_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(12), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    status = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_payment_date = db.Column(db.DateTime)
    last_payment_amount = db.Column(db.Float)
        
    
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id'))
    subscription = db.relationship('Subscription', backref='clients')

    subscription_expiry = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "status": self.status,
            "subscription": self.subscription.name if self.subscription else None,
            "subscription_expiry": self.subscription_expiry.isoformat() if self.subscription_expiry else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Client {self.id} - {self.email}>"

class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)  
    price = db.Column(db.Float, nullable=False)
    duration_days = db.Column(db.Integer, nullable=False) 

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "duration_days": self.duration_days,
        }

    def __repr__(self):
        return f"<Subscription {self.name} - {self.price}>"

class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey("subscriptions.id"), nullable=False)

    amount = db.Column(db.Float, nullable=False)
    mpesa_receipt = db.Column(db.String(120), unique=True, nullable=True)
    phone_number = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default="Pending")  # Pending, Success, Failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    method = db.Column(db.String(20), nullable=False)
    checkout_response =db.Column(db.String(100), nullable=True)

    client = db.relationship("Client", backref="payments")
    subscription = db.relationship("Subscription")

    def to_dict(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "subscription_id": self.subscription_id,
            "amount": self.amount,
            "mpesa_receipt": self.mpesa_receipt,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            }
    
    def __repr__(self):
        return f"<Payment {self.id} - {self.amount}>"
    
class Admin(db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)


    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)   
    
    def __repr__(self):
        return f"<Admin {self.name}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name
        }
    
class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    expense = db.Column(db.String, nullable = False)
    cost = db.Column(db.Integer, nullable = False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


    def __repr__(self):
        return f"<Expense {self.expense} - {self.cost}>"


