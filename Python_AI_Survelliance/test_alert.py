#!/usr/bin/env python3
"""Test script to manually trigger an alert without detection."""

import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Trigger incident via API
url = "http://localhost:5055/api/test_alert"

print("Triggering test alert...")
print("This will create an incident and start 30s countdown.")
print("If not acknowledged, it will call:", os.getenv("PRIMARY_CONTACT_NUMBER"))

# You can also directly test Twilio
from twilio.rest import Client

account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
from_number = os.getenv("TWILIO_FROM_NUMBER")
to_number = os.getenv("PRIMARY_CONTACT_NUMBER")

if not all([account_sid, auth_token, from_number, to_number]):
    print("ERROR: Missing Twilio credentials in .env")
    exit(1)

client = Client(account_sid, auth_token)

# Test SMS
print("\n1. Sending test SMS...")
try:
    message = client.messages.create(
        to=to_number,
        from_=from_number,
        body="[ParkSeva TEST] This is a test alert. System is working."
    )
    print(f"✓ SMS sent successfully! SID: {message.sid}")
except Exception as e:
    print(f"✗ SMS failed: {e}")

# Test Call
print("\n2. Sending test call...")
try:
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        twiml='<Response><Say voice="Polly.Raveena" language="en-IN">This is a test call from ParkSeva. System is working properly.</Say></Response>'
    )
    print(f"✓ Call initiated! SID: {call.sid}")
except Exception as e:
    print(f"✗ Call failed: {e}")

print("\nDone! Check your phone.")
