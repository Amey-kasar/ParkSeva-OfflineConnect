#!/usr/bin/env python3
"""Check Twilio account status and capabilities."""

from twilio.rest import Client

# Your credentials
import os
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = "5f84bf4798f5a2418e1aa0f73fdea5b6"
from_number = "+15076291926"
to_number = "+917385192422"

print("=== TWILIO ACCOUNT DIAGNOSTICS ===")
print(f"Account SID: {account_sid}")
print(f"From Number: {from_number}")
print(f"To Number: {to_number}")

client = Client(account_sid, auth_token)

print("\n1. Testing Account Access...")
try:
    account = client.api.accounts(account_sid).fetch()
    print(f"✓ Account Status: {account.status}")
    print(f"✓ Account Type: {account.type}")
    print(f"✓ Account Name: {account.friendly_name}")
except Exception as e:
    print(f"✗ Account Access Failed: {e}")
    exit(1)

print("\n2. Testing Phone Number...")
try:
    phone_numbers = client.incoming_phone_numbers.list(phone_number=from_number)
    if phone_numbers:
        phone = phone_numbers[0]
        print(f"✓ Phone Number Status: Active")
        print(f"✓ Phone Capabilities: Voice={phone.capabilities['voice']}, SMS={phone.capabilities['sms']}")
    else:
        print(f"✗ Phone Number {from_number} not found in account")
except Exception as e:
    print(f"✗ Phone Number Check Failed: {e}")

print("\n3. Testing SMS (should work)...")
try:
    message = client.messages.create(
        to=to_number,
        from_=from_number,
        body="[DIAGNOSTIC] SMS test from ParkSeva"
    )
    print(f"✓ SMS Sent: {message.sid}")
except Exception as e:
    print(f"✗ SMS Failed: {e}")

print("\n4. Testing Voice Call (the failing one)...")
try:
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        twiml='<Response><Say>Diagnostic test call from ParkSeva.</Say></Response>'
    )
    print(f"✓ Call Initiated: {call.sid}")
except Exception as e:
    print(f"✗ Call Failed: {e}")
    print("\nPossible causes:")
    print("- Trial account: Can only call verified numbers")
    print("- Account suspended: Need to verify phone/payment")
    print("- Geographic restrictions: Some countries blocked")
    print("- Phone number not voice-enabled")

print("\n5. Checking Account Balance...")
try:
    balance = client.balance.fetch()
    print(f"Balance: {balance.balance} {balance.currency}")
except Exception as e:
    print(f"Balance check failed: {e}")

print("\nDone! Check results above.")