#!/usr/bin/env python3
"""Simple Twilio test without dependencies."""

from twilio.rest import Client

# Your new credentials
import os
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = "5f84bf4798f5a2418e1aa0f73fdea5b6"
from_number = "+15076291926"
to_number = "+917385192422"

print("Testing new Twilio account...")
print(f"From: {from_number}")
print(f"To: {to_number}")

client = Client(account_sid, auth_token)

# Test SMS
print("\n1. Sending test SMS...")
try:
    message = client.messages.create(
        to=to_number,
        from_=from_number,
        body="[ParkSeva TEST] New Twilio account working!"
    )
    print(f"✓ SMS sent! SID: {message.sid}")
except Exception as e:
    print(f"✗ SMS failed: {e}")

# Test Call
print("\n2. Making test call...")
try:
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        twiml='<Response><Say>ParkSeva test call successful. New account is working.</Say></Response>'
    )
    print(f"✓ Call initiated! SID: {call.sid}")
except Exception as e:
    print(f"✗ Call failed: {e}")

print("\nDone! Check your phone.")