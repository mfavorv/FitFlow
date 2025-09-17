from flask import Flask, request, current_app, render_template, jsonify
from sqlalchemy import extract, func
from flask_cors import CORS
from flask_migrate import Migrate
from flask_restful import Api, Resource, reqparse
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
from dotenv import load_dotenv
from config import Config
from auth import bcrypt, check_password, hash_password
from models import db,Client, Admin, Expense, Subscription, Payment
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from flask_apscheduler import APScheduler
from mpesa import lipa_na_mpesa
import secrets
import string


load_dotenv()
blacklist = set()

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
migrate = Migrate(app, db)  
api = Api(app)
jwt = JWTManager(app)

CORS(app, 
     origins="http://localhost:3000",
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return jti in blacklist

def send_email(to_email, subject, message):
    """
    Simple plaintext email sender (Gmail SMTP).
    Expects MAIL_USERNAME and MAIL_PASSWORD in env.
    """
    sender_email = os.environ.get("MAIL_USERNAME")
    sender_password = os.environ.get("MAIL_PASSWORD")
    if not sender_email or not sender_password:
        current_app.logger.warning("Email creds missing; skipping email send.")
        return False

    smtp_server = "smtp.gmail.com"
    smtp_port = 587

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(message, "plain"))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        current_app.logger.error(f"Email failed: {e}")
        return False

def generate_password(length=10):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(chars) for _ in range(length))

class ConfigWithScheduler(Config):
    SCHEDULER_API_ENABLED = True

app.config.from_object(ConfigWithScheduler)
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

@scheduler.task('cron', id='check_expired_subscriptions', hour=0)  # Runs daily at midnight
def check_expired_subscriptions():
    with app.app_context():
        today = datetime.utcnow().date()
        expired_clients = Client.query.filter(Client.subscription_expiry <= today).all()

        for client in expired_clients:
            send_email(
                client.email,
                "Subscription Expired",
                f"Hi {client.first_name}, your subscription has expired. Please renew to continue accessing the gym."
            )

@scheduler.task('cron', id='send_monthly_report', day=1, hour=6)  # every 1st of the month at 6 AM
def send_monthly_report():
    with app.app_context():
        now = datetime.utcnow()
        month = now.month
        year = now.year

        # Total expenses for the current month
        monthly_expenses = db.session.query(
            db.func.sum(Expense.cost)
        ).filter(
            extract('month', Expense.created_at) == month,
            extract('year', Expense.created_at) == year
        ).scalar() or 0

        # Total earnings from subscriptions renewed or bought this month
        clients = Client.query.filter(
            extract('month', Client.subscription_expiry) == month,
            extract('year', Client.subscription_expiry) == year
        ).all()

        total_earnings = 0
        for client in clients:
            if client.subscription:
                total_earnings += client.subscription.price

        # Email all admins
        admins = Admin.query.all()
        for admin in admins:
            send_email(
                to_email=admin.email,
                subject=f"Monthly Gym Financial Report - {now.strftime('%B %Y')}",
                message=f"""
Hello {admin.name},

Here is your monthly financial report:

📅 Month: {now.strftime('%B %Y')}
💰 Total Earnings: KES {total_earnings}
💸 Total Expenses: KES {monthly_expenses}

Regards,
FitFlow Gym Management System                """
            )

class ClientResource(Resource):
    def patch(self, client_id):
        client = Client.query.get(client_id)
        if not client:
            return {"message": "Client not found"}, 404

        data = request.get_json()

        client.first_name = data.get("first_name", client.first_name)
        client.last_name = data.get("last_name", client.last_name)
        client.email = data.get("email", client.email)
        client.phone = data.get("phone", client.phone)

        #  Handle password change
        old_password = data.get("old_password")
        new_password = data.get("new_password")

        if old_password and new_password:
            if not check_password(client.password_hash, old_password):
                return {"message": "Incorrect password! Failed to update."}, 400

            client.password_hash = hash_password(new_password)

        db.session.commit()
        return {"message": "Client updated successfully", "client": client.to_dict()}, 200

    def delete(self, client_id):
        client = Client.query.get(client_id)
        if not client:
            return {"message": "Client not found"}, 404
        
        db.session.delete(client)
        db.session.commit()
        return {"message": "Client deleted successfully"}, 200


class ClientLogin(Resource):
    def post(self):
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        user = Client.query.filter_by(email = email).first()
        if user and check_password(password, user.password_hash):
            token = create_access_token(
                identity=user.email,
                expires_delta=timedelta(days=7)  # Extend expiry to 7 days
            ) 
            return {
                "message": "Login successful",
                "access_token": token,
                "user": user.to_dict()
            }, 200

        return {"message": "Invalid email or password"}, 401

class DashboardResource(Resource):
    @jwt_required()
    def get(self):
        user_email = get_jwt_identity()
        user = Client.query.filter_by(email=user_email).first()

        if not user:
            return {"error": "User not found"}, 404

        # Get subscription
        subscription = Subscription.query.filter_by(client_id=user.id).first()
        subscription_data = {
            "type": subscription.type if subscription else "None",
            "price": subscription.price if subscription else "N/A",
            "expiry": subscription.expiry.strftime("%d/%m/%Y") if subscription else "N/A"
        }

        # Get last payment
        last_payment = Payment.query.filter_by(client_id=user.id).order_by(Payment.date.desc()).first()
        payment_data = {
            "amount": last_payment.amount if last_payment else "N/A",
            "date": last_payment.date.strftime("%d/%m/%Y") if last_payment else "N/A",
            "method": last_payment.method if last_payment else "N/A"
        }

        return {
            "user": {
                "name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "phone": user.phone,
                "created_at": user.created_at.strftime("%d/%m/%Y")
            },
            "subscription": subscription_data,
            "last_payment": payment_data
        }, 200

class AdminLogin(Resource):
    def post(self):
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        user = Admin.query.filter_by(email=email).first()
        if user and check_password(password, user.password_hash):
            token = create_access_token(
                identity=user.email,
                expires_delta=timedelta(days=7)  # Extend expiry to 7 days
            )            
            return {
                "message": "Login successful",
                "token": token,
                "user": user.to_dict()
            }, 200
        
        return {
            "message": "Invalid email or password"
        }, 401


class Logout(Resource):
    @jwt_required()
    def post(self):
        # Force Flask-RESTful to parse an (empty) JSON payload
        parser = reqparse.RequestParser()
        parser.parse_args()
        _ = request.get_json(force=True, silent=True)

        jti = get_jwt()["jti"]
        blacklist.add(jti)
        return {"message": "Logged out successfully"}, 200
    

class AddClient(Resource):
    @jwt_required()
    def post(self):
        try:
            # Get current admin user
            current_user_email = get_jwt_identity()
            admin = Admin.query.filter_by(email=current_user_email).first()
            if not admin:
                return {"error": "Unauthorized, admin access required"}, 403
            
            # Parse request data
            data = request.get_json()
            if not data:
                return {"error": "No data provided"}, 400
            
            # Validate required fields
            required_fields = ['first_name', 'last_name', 'email', 'phone']
            missing = [field for field in required_fields if field not in data or not data[field]]
            if missing:
                return {'error': f'Missing required fields: {", ".join(missing)}'}, 400
            
            # Check email format
            if '@' not in data['email']:
                return {'error': 'Invalid email format'}, 400
                
            # Check phone format
            if not isinstance(data['phone'], str) or not data['phone'].isdigit() or len(data['phone']) < 10:
                return {'error': 'Phone number must be at least 10 digits'}, 400
                
            # Check if email/phone exists
            if Client.query.filter_by(email=data['email']).first():
                return {'error': 'Email already in use'}, 400
            if Client.query.filter_by(phone=data['phone']).first():
                return {'error': 'Phone number already in use'}, 400
            
            # Handle subscription if provided
            subscription = None
            subscription_expiry = None
            if 'subscription' in data and data['subscription']:
                subscription = Subscription.query.filter_by(name=data['subscription']).first()
                if not subscription:
                    return {'error': 'Invalid subscription name'}, 400
                
                subscription_expiry = datetime.utcnow() + timedelta(days=subscription.duration_days)
            
            # Generate a random default password
            random_password = generate_password()
            
            # Create new client
            new_client = Client(
                first_name=data['first_name'],
                last_name=data['last_name'],
                email=data['email'],
                phone=data['phone'],
                password_hash=bcrypt.generate_password_hash(random_password).decode('utf-8'),
                status=data.get('status', 'Active'),
                subscription=subscription,
                subscription_expiry=subscription_expiry
            )

            db.session.add(new_client)
            db.session.commit()

            # Create reset token and link
            reset_token = create_access_token(identity=new_client.email, expires_delta=timedelta(hours=1))
            reset_link = f"http://localhost:3000/reset-password?token={reset_token}"

            # Send welcome email
            send_email(
                to_email=new_client.email,
                subject="Welcome to FitFlow - Set Your Password",
                message=f"""
                Hi {new_client.first_name},

                🎉 Welcome to FitFlow! Your account has been created.

                👉 Temporary password: {random_password}

                Please use this temporary password to log in.  
                For security, we recommend you set your own password using the link below (expires in 1 hour):

                {reset_link}

                Thank you for joining us!

                Kind regards,
                FitFlow Management
                """
            )

            return {
                "message": "Client added successfully",
                "client": new_client.to_dict(),
            }, 201

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500


class ResetPassword(Resource):
    @jwt_required()
    def post(self):
        identity = get_jwt_identity()
        user = Client.query.filter_by(email=identity).first()
        if not user:
            return {"error": "User not found"}, 404

        data = request.get_json()
        new_password = data.get("new_password")
        if not new_password:
            return {"error": "New password required"}, 400

        user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        db.session.commit()

        return {"message": "Password updated successfully"}, 200

class AddExpense(Resource):
    @jwt_required()
    def post(self):
        current_user = get_jwt_identity()
        print("JWT Identity:", current_user) 

        admin = Admin.query.filter_by(email=current_user).first()
        if not admin:
            print("Unauthorized attempt by:", current_user)
            return {"error": "Unauthorized, admin access required"}, 403

        data = request.get_json()
        print("Incoming expense data:", data)  # 👈 Debug what React sends

        try:
            new_expense = Expense(
                expense=data.get("expense"),
                cost=(data.get("cost")),
            )

            db.session.add(new_expense)
            db.session.commit()

            print("✅ Expense added:", new_expense.expense, new_expense.cost)
            return {"message": "Expense added successfully!"}, 201

        except Exception as e:
            db.session.rollback()
            print("❌ Error adding expense:", str(e))
            return {"error": "Failed to add expense"}, 500
        
class ChooseSubscription(Resource):
    @jwt_required()
    def post(self):
        current_user_email = get_jwt_identity()
        client = Client.query.filter_by(email=current_user_email).first()

        if not client:
            return {"error": "Client not found"}, 404

        data = request.get_json()
        subscription_name = data.get("subscription")

        subscription = Subscription.query.filter_by(name=subscription_name).first()
        if not subscription:
            return {"error": "Subscription plan not found"}, 404

        # Calculate expiry date
        expiry_date = datetime.utcnow() + timedelta(days=subscription.duration_days)

        client.subscription = subscription.name
        client.subscription_expiry = expiry_date

        db.session.commit()

        return {
            "message": f"Subscribed to {subscription.name} until {expiry_date.date()}",
            "subscription_expiry": expiry_date.isoformat()
        }, 200

class UpdateClient(Resource):
    # Update client details
    @jwt_required()
    def put(self):
        data = request.get_json()
        current_user_email = get_jwt_identity()
        client = Client.query.filter_by(email=current_user_email).first()

        if not client:
            return {"message": "Client not found"}, 404

        # Update only provided fields
        if "first_name" in data:
            client.first_name = data["first_name"]
        if "last_name" in data:
            client.last_name = data["last_name"]
        if "email" in data:
            client.email = data["email"]
        if "phone" in data:
            client.phone = data["phone"]

        try:
            db.session.commit()
            return {
                "message": "Client updated successfully",
                "client": {
                    "id": client.id,
                    "first_name": client.first_name,
                    "last_name":client.last_name,
                    "email": client.email,
                    "phone": client.phone
                }
            }, 200
        except Exception as e:
            db.session.rollback()
            return {"message": "Error updating client", "error": str(e)}, 500

class Subscriptions(Resource):
    def get(self):
        subs = Subscription.query.all()
        return [plan.to_dict() for plan in subs]

class MarkCashPayment(Resource):
    @jwt_required()
    def post(self):

        try:
            current_user = get_jwt_identity()
            admin = Admin.query.filter_by(email=current_user).first()
            if not admin:
                return {"error": "Unauthorized, admin access required"}, 403

            data = request.get_json() 
            phone = data.get("phone")
            subscription_name = data.get("subscription")
            payment_status = (data.get("payment_status") or "").lower()
            amount_paid = data.get("amount")
            payment_date_str = data.get("payment_date")  # YYYY-MM-DD

            if not phone or not subscription_name or not payment_status:
                return {
                    "error": "Missing required fields (phone, subscription, payment_status)"
                }, 400


            client = Client.query.filter_by(phone=phone).first()
            if not client:
                return {"error": f"Client with phone {phone} not found"}, 404

            subscription = Subscription.query.filter_by(name=subscription_name).first()
            if not subscription:
                return {"error": f"Subscription plan '{subscription_name}' not found"}, 404

            if payment_status not in ["success", "pending", "failed"]:
                return {"error": "payment_status must be one of: success, pending, failed"}, 400

            # Resolve effective payment date
            effective_date = datetime.utcnow()
            if payment_date_str:
                try:
                    effective_date = datetime.strptime(payment_date_str, "%Y-%m-%d")
                except ValueError:
                    return {"error": "Invalid payment_date format. Use YYYY-MM-DD"}, 400

            # Default amount = plan price if not provided
            amount_to_record = float(amount_paid) if amount_paid not in [None, ""] else float(subscription.price)

            payment = Payment(
                client_id = client.id,
                subscription_id = subscription.id,
                amount = amount_to_record,
                phone_number = phone,
                status=payment_status.capitalize(),                
                method = "Cash"
            )

            db.session.add(payment)

            response_payload = {
                "client": f"{client.first_name} {client.last_name}",
                "subscription": subscription.name,
                "amount": amount_to_record,
                "payment_status": payment_status,
                "payment_date": effective_date.strftime("%Y-%m-%d")
            }
            if payment_status == "success":
                # Determine base date to extend from
                today = effective_date.date()
                current_expiry = client.subscription_expiry.date() if client.subscription_expiry else None

                if current_expiry and current_expiry >= today:
                    base_dt = client.subscription_expiry
                else:
                    base_dt = datetime.combine(today, datetime.min.time())

                new_expiry = base_dt + timedelta(days=subscription.duration_days)

                # Update client
                client.subscription = subscription
                client.subscription_expiry = new_expiry
                client.status = "Active"
                client.last_payment_date = effective_date
                client.last_payment_amount = amount_to_record

                response_payload.update({
                    "new_expiry": new_expiry.strftime("%Y-%m-%d"),
                    "client_status": client.status
                })

                try:
                    send_email(
                        to_email=client.email,
                        subject="Payment Received & Subscription Updated",
                        message=(f"Hi {client.first_name},\n\n"
                                f"We have recorded your payment of KES {amount_to_record:.2f} "
                                f"for the {subscription.name} plan.\n\n"
                                f"Your new subscription expiry date is {new_expiry.strftime('%Y-%m-%d')}.\n\n"
                                f"Thank you!\nFitFlow Gym")
                    )
                except Exception as email_err:
                    current_app.logger.error(f"Email failed: {email_err}")

            else:
                response_payload.update({
                    "note": "Payment recorded without subscription update."
                })
            db.session.commit()
            return {"message": "Payment processed", **response_payload}, 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error in MarkCashPayment: {e}")
            return {"error": "An error occurred while processing payment"}, 500

    
class SelectSubscription(Resource):
    @jwt_required()
    def post(self):
        current_user = get_jwt_identity()
        client = Client.query.filter_by(email=current_user).first()
        if not client:
            return {"error": "Client not found"}, 404

        data = request.get_json()
        subscription_name = data.get("subscription")

        if not subscription_name:
            return {"error": "Subscription name is required"}, 400

        subscription = Subscription.query.filter_by(name=subscription_name).first()
        if not subscription:
            return {"error": "Subscription plan not found"}, 404

        client.subscription = subscription
        client.subscription_expiry = datetime.utcnow() + timedelta(days=subscription.duration_days)

        db.session.commit()

        return {
            "message": f"Successfully subscribed to {subscription.name}.",
            "subscription_expiry": client.subscription_expiry.isoformat()
        }, 200


class AddAdmin(Resource):
    def post(self):
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        name = data.get("name")

        if not all([email, password, name]):
            return{"error": "All fields are required"}, 400
        
        existing = Admin.query.filter_by(email=email).first()

        if existing:
            return{"error": "Admin already exists."}
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        new = Admin(
            email = email,
            name = name,
            password_hash = hashed_password
        )

        db.session.add(new)
        db.session.commit()

        return {"message": "Admin successfully created"}, 201
    
class GetClients(Resource):
    @jwt_required()
    def get(self):
        try:
            current_user = get_jwt_identity()
            admin = Admin.query.filter_by(email=current_user).first()

            if not admin:
                return {"error": "Unauthorized, admin access required"}, 403

            search_term = request.args.get('search', default='', type=str)
            status_filter = request.args.get('status', default=None, type=str)

            query = Client.query

            # Apply search filter
            if search_term:
                search = f"%{search_term}%"
                query = query.filter(
                    db.or_(
                        Client.first_name.ilike(search),
                        Client.last_name.ilike(search),
                        Client.email.ilike(search),
                        Client.phone.ilike(search)
                    )
                )

            # Apply status filter
            if status_filter:
                query = query.filter(Client.status.ilike(status_filter))

            clients = query.order_by(Client.first_name.asc()).all()

  
            return {
                "clients": [{
                    "id": c.id,
                    "first_name": c.first_name,
                    "last_name": c.last_name,
                    "email": c.email,
                    "phone": c.phone,
                    "status": c.status,
                    "subscription": c.subscription.name if c.subscription else None,  # Fixed
                    "subscription_id": c.subscription.id if c.subscription else None,  # Added if needed
                    "subscription_expiry": c.subscription_expiry.isoformat() if c.subscription_expiry else None,
                    "created_at": c.created_at.isoformat() if c.created_at else None  # Added for completeness
                } for c in clients]
            }, 200

        except Exception as e:
            current_app.logger.error(f"Error fetching clients: {str(e)}")
            return {"error": "Failed to fetch clients"}, 500
        
class GetExpense(Resource):
    @jwt_required()
    def get(self):
        current_user = get_jwt_identity()
        admin = Admin.query.filter_by(email=current_user).first()

        if not admin:
            return {"error": "Unauthorized."}, 403
        
        expense_name = request.args.get("expense")
        expense = Expense.query.filter_by(expense=expense_name).first()
        if not expense:
            return {"error": "Expense is not found"}, 404
    
        return {
            "id": expense.id,
            "expense": expense.expense,
            "cost": expense.cost,
            "created_at": expense.created_at.isoformat()
        }, 200  

class ClientDashboard(Resource):
    @jwt_required()
    def get(self):
        current_user_email = get_jwt_identity()
        client = Client.query.filter_by(email=current_user_email).first()

        if not client:
            return {"error": "Client not found"}, 404

        return {
            "client": {
                "id": client.id,
                "first_name": client.first_name,
                "last_name": client.last_name,
                "email": client.email,
                "phone": client.phone,
                "subscription": client.subscription.name if client.subscription else None,
                "subscription_price": client.subscription.price if client.subscription else None,
                "subscription_expiry": client.subscription_expiry.isoformat() if client.subscription_expiry else None,
                "created_at": client.created_at.isoformat() if client.created_at else None,
            },
            "payment_instructions": "To renew your subscription, please go to the payment section and use M-PESA. This feature is coming soon."
        }, 200


class GetAllExpenses(Resource):
    @jwt_required()
    def get(self):
        try:
            current_user = get_jwt_identity()
            admin = Admin.query.filter_by(email=current_user).first()

            if not admin:
                return {"error": "Unauthorized, admin access required"}, 403

            # Get optional month/year filters from query params
            month = request.args.get('month', type=int)
            year = request.args.get('year', type=int, default=datetime.utcnow().year)
            
            # Base query
            query = Expense.query.order_by(Expense.created_at.desc())
            
            # Apply filters if provided
            if month:
                query = query.filter(
                    extract('month', Expense.created_at) == month,
                    extract('year', Expense.created_at) == year
                )
            else:
                # Filter by year only if no month specified
                query = query.filter(
                    extract('year', Expense.created_at) == year
                )

            expenses = query.all()
            
            # Calculate total
            total = sum(exp.cost for exp in expenses)
            
            return {
                "expenses": [
                    {
                        "id": e.id,
                        "expense": e.expense,
                        "cost": e.cost,
                        "created_at": e.created_at.isoformat(),
                    }
                    for e in expenses
                ],
                "total": total,
                "count": len(expenses),
                "month": month,
                "year": year
            }, 200
            
        except Exception as e:
            current_app.logger.error(f"Error fetching expenses: {str(e)}")
            return {"error": "Failed to fetch expenses"}, 


class GetPayments(Resource):
    @jwt_required()
    def get(self):
        client_email = get_jwt_identity()
        client = Client.query.filter_by(email=client_email).first()
        if not client:
            return {"error": "Client not found"}, 404

        payments = Payment.query.filter_by(client_id=client.id).all()
        return [payment.to_dict() for payment in payments], 200


class MpesaInitiate(Resource):
    @jwt_required()
    def post(self):
        data = request.json
        plan_name = data.get("plan_name")  
        phone = data.get("phone_number")
        user_email = data.get("email")

        # Validate input
        if not plan_name or not phone:
            return {"error": "Plan name and phone number required"}, 400

        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif phone.startswith("+254"):
            phone = phone[1:]

        # Find subscription plan
        plan = Subscription.query.filter_by(name=plan_name).first()
        if not plan:
            return {"error": "Invalid subscription plan"}, 400

        # Initiate Mpesa STK push
        response = lipa_na_mpesa(phone, plan.price)
        print("DEBUG: STK push response:", response)

        client = Client.query.filter_by(email=user_email).first()
        if not client:
            return {"error": "Client not found"}, 404
        
        # Save pending payment
        payment = Payment(
            client_id=client.id,
            subscription_id=plan.id,
            amount=plan.price,
            status="Pending",
            method="M-PESA",
            phone_number=phone,
            checkout_request_id=response["CheckoutRequestID"],

        )
        db.session.add(payment)
        db.session.commit()

        return {"message": "STK push sent. Check your phone.", "response": response}

class DashBoard(Resource):
    def get(self):
        now = datetime.now()
        month = now.month
        year = now.year

        # Total clients
        clients_count = Client.query.count()

        # Expenses for current month
        expenses_total = (
            db.session.query(func.sum(Expense.cost))
            .filter(extract("month", Expense.created_at) == month)
            .filter(extract("year", Expense.created_at) == year)
            .scalar() or 0
        )

        # Payments for current month
        payments_total = (
            db.session.query(func.sum(Payment.amount))
            .filter(extract("month", Payment.created_at) == month)
            .filter(extract("year", Payment.created_at) == year)
            .scalar() or 0
        )

        # Subscriptions with number of clients in each
        subscriptions = (
            db.session.query(
                Subscription.id,
                Subscription.name,
                Subscription.price,
                func.count(Client.id).label("client_count")
            )
            .outerjoin(Client, Client.subscription_id == Subscription.id)
            .group_by(Subscription.id)
            .all()
        )

        subscriptions_list = [
            {
                "id": sub.id,
                "name": sub.name,
                "price": sub.price,
                "clients": sub.client_count
            }
            for sub in subscriptions
        ]

        stats = {
            "clients": clients_count,
            "expenses": round(expenses_total, 2),
            "payments": round(payments_total, 2),
            "subscriptions": subscriptions_list,
        }

        return jsonify(stats)

# class AddMpesaPayment(Resource):
#     def post(self):
#         data = request.get_json()
#         body = data["Body"]["stkCallback"]

#         checkout_id = body["CheckoutRequestID"]
#         result_code = body["ResultCode"]
#         result_desc = body["ResultDesc"]

#         if result_code != 0:
#             return {"message": "Payment failed"}, 400
#         else:
#             payment = Payment.query.filter_by(checkout_response=checkout_id).first()
#             callback_metadata = body["CallbackMetadata"]["Item"]
 


#         # Extract Mpesa callback details
#         items = callback_metadata["Item"]
#         receipt, amount_paid, phone = None, None, None

#         for i in items:
#             if i["Name"] == "MpesaReceiptNumber":
#                 receipt = i["Value"]
#             elif i["Name"] == "Amount":
#                 amount_paid = i["Value"]
#             elif i["Name"] == "PhoneNumber":
#                 phone = i["Value"]



#         client = Client.query.filter_by(email=user_email).first()
#         if not client:
#             return {"error": "Client not found"}, 404

#         # Find most recent pending payment for this user
#         payment = (
#             Payment.query.filter_by(client_id=client.id, status="Pending")
#             .order_by(Payment.created_at.desc())
#             .first()
#         )
#         if not payment:
#             return {"error": "Pending payment not found"}, 404

#         # Mark payment as successful
#         payment.mpesa_receipt = receipt
#         payment.status = "Success"
#         payment.phone_number = phone
#         db.session.commit()

#         # Update client subscription
#         plan = Subscription.query.get(payment.subscription_id)

#         today = datetime.utcnow()
#         if not client.subscription_expiry or client.subscription_expiry < today:
#             # New subscription
#             client.subscription_id = plan.id
#             client.subscription_expiry = today + timedelta(days=plan.duration_days)
#             client.status = "active"
#         else:
#             # Renewal → extend expiry
#             client.subscription_expiry += timedelta(days=plan.duration_days)

#         # Track payment history on client
#         client.last_payment_date = today
#         client.last_payment_amount = amount_paid
#         db.session.commit()

#         # Send email receipt
#         send_email(
#             to=client.email,
#             subject="Subscription Payment Successful",
#             body=f"""
#             Hi {client.first_name},

#             Your payment of {amount_paid} KES via M-PESA was successful.
#             Mpesa Receipt: {receipt}

#             Your {plan.name} subscription is now valid until {client.subscription_expiry.date()}.

#             Thank you for staying with us!
#             """
#         )

#         return {"message": "Payment processed and subscription updated"}, 200

class AdminUpdate(Resource):
    @jwt_required()
    def put(self):
        data = request.get_json()
        current_user_email = get_jwt_identity()

        admin = Admin.query.filter_by(email=current_user_email).first()
        if not admin:
            return {"message": "Admin not found"}, 404

        if data.get("name"):
            admin.name = data["name"]

        if data.get("email"):
            admin.email = data["email"]

        if data.get("old_password") and data.get("new_password"):
            if not check_password(admin.password_hash, data["old_password"]):
                return {"message": "Old password is incorrect"}, 400

            admin.password_hash = hash_password(data["new_password"])

        db.session.commit()
        return {"message": "Profile updated successfully", "admin": admin.to_dict()}, 200
    
# ---------------- FORGOT PASSWORD ---------------- #

class ForgotPassword(Resource):
    def post(self):
        data = request.get_json()
        email = data.get("email")

        if not email:
            return {"error": "Email is required"}, 400

        user = Client.query.filter_by(email=email).first()
        if not user:
            return {"message": "If that email exists, a reset link has been sent."}, 200  # Don't leak info

        # Generate a reset token (30 mins expiry)
        reset_token = create_access_token(identity=user.email, expires_delta=timedelta(minutes=30))
        reset_link = f"http://localhost:3000/reset-password?token={reset_token}"

        # Send email
        send_email(
            to_email=user.email,
            subject="Password Reset - FitFlow",
            message=f"""
Hello {user.first_name},

We received a request to reset your password.  
👉 Click the link below to set a new password (expires in 30 minutes):

{reset_link}

If you didn’t request this, please ignore this email.

Kind regards,  
FitFlow Team
"""
        )

        return {"message": "If the email exists, a reset link has been sent."}, 200


class ResetPasswordConfirm(Resource):
    @jwt_required()  # token from reset link
    def post(self):
        identity = get_jwt_identity()
        user = Client.query.filter_by(email=identity).first()

        if not user:
            return {"error": "User not found"}, 404

        data = request.get_json()
        new_password = data.get("new_password")
        if not new_password:
            return {"error": "New password is required"}, 400

        # Update password
        user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        db.session.commit()

        return {"message": "Password reset successful! You can now log in with your new password."}, 200

api.add_resource(ForgotPassword, "/forgot-password")
api.add_resource(ResetPasswordConfirm, "/reset-password")
api.add_resource(AdminUpdate, "/admin/update")
api.add_resource(MpesaInitiate, '/start/payment')
# api.add_resource(AddMpesaPayment, '/callback')
api.add_resource(ClientDashboard, '/dashboard/client')
api.add_resource(ClientLogin, '/client/login')
api.add_resource(AdminLogin, '/admin/login')
api.add_resource(AddAdmin, '/add/admin')
api.add_resource(Logout, '/logout')
api.add_resource(AddClient, '/addClient')
api.add_resource(AddExpense,'/addExpense' )
api.add_resource(ChooseSubscription, '/chooseSubscription')
api.add_resource(MarkCashPayment, '/markCashPayment')
api.add_resource(SelectSubscription, '/selectSubscription')
api.add_resource(GetClients, '/clients')
api.add_resource(GetExpense, '/getExpense')
api.add_resource(GetAllExpenses, '/expenses')
api.add_resource(Subscriptions, '/subscriptions')
api.add_resource(ClientResource, "/clients/<int:client_id>")
api.add_resource(UpdateClient, "/update")
api.add_resource(GetPayments, "/client/payments")
api.add_resource(DashBoard, "/dashboard")
api.add_resource(ResetPassword, "/reset/password")



if __name__ == '__main__':
    app.run(port=5000)