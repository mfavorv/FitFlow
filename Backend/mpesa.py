import requests
import base64
import datetime
from decouple import config  

# Get credentials from .env
CONSUMER_KEY = config("MPESA_CONSUMER_KEY")
CONSUMER_SECRET = config("MPESA_CONSUMER_SECRET")
BUSINESS_SHORT_CODE = config("MPESA_SHORTCODE")  # e.g., "174379" for test
PASSKEY = config("MPESA_PASSKEY")
CALLBACK_URL = config("MPESA_CALLBACK_URL")  # e.g., https://yourdomain/api/mpesa/callback

BASE_URL = "https://sandbox.safaricom.co.ke"  # Use sandbox first

import requests
from requests.auth import HTTPBasicAuth

def generate_access_token():
    consumer_key = "YOUR_CONSUMER_KEY"
    consumer_secret = "YOUR_CONSUMER_SECRET"
    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

    response = requests.get(url, auth=HTTPBasicAuth(consumer_key, consumer_secret))
    json_response = response.json()
    return json_response["access_token"]

def lipa_na_mpesa(phone_number, amount, account_reference="FitFlow Subscription", description="Subscription Payment"):
    token = generate_access_token()
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode((BUSINESS_SHORT_CODE + PASSKEY + timestamp).encode("utf-8")).decode("utf-8")

    payload = {
        "BusinessShortCode": BUSINESS_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,   
        "PartyB": BUSINESS_SHORT_CODE,
        "PhoneNumber": phone_number,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": account_reference,
        "TransactionDesc": description,
    }

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest", json=payload, headers=headers)
    return response.json()
