#!/usr/bin/env python3
"""
Twilio Integration for Safety Console
Install: pip install twilio flask flask-cors
"""

from twilio.rest import Client
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

# ============================================
# TWILIO CONFIGURATION - UPDATE THESE VALUES
# ============================================
TWILIO_ACCOUNT_SID = 'your_account_sid_here'  # Get from twilio.com/console
TWILIO_AUTH_TOKEN = 'your_auth_token_here'    # Get from twilio.com/console
TWILIO_PHONE_NUMBER = '+1234567890'           # Your Twilio phone number
OPERATOR_PHONE_NUMBER = '+919876543210'       # Your phone number to receive alerts

# Initialize Twilio client
try:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    print("✓ Twilio client initialized successfully")
except Exception as e:
    print(f"✗ Twilio initialization failed: {e}")
    twilio_client = None

app = Flask(__name__)
CORS(app)

def send_sms(message):
    """Send SMS alert"""
    if not twilio_client:
        print("✗ Twilio client not initialized")
        return False
    
    try:
        message = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=OPERATOR_PHONE_NUMBER
        )
        print(f"✓ SMS sent successfully: {message.sid}")
        return True
    except Exception as e:
        print(f"✗ SMS failed: {e}")
        return False

def make_call(twiml_url=None):
    """Make voice call alert"""
    if not twilio_client:
        print("✗ Twilio client not initialized")
        return False
    
    # If no TwiML URL provided, use default message
    if not twiml_url:
        twiml_url = f"http://twimlets.com/message?Message%5B0%5D=Emergency%20incident%20detected.%20Please%20check%20the%20safety%20console%20immediately."
    
    try:
        call = twilio_client.calls.create(
            url=twiml_url,
            to=OPERATOR_PHONE_NUMBER,
            from_=TWILIO_PHONE_NUMBER
        )
        print(f"✓ Call initiated successfully: {call.sid}")
        return True
    except Exception as e:
        print(f"✗ Call failed: {e}")
        return False

@app.route('/api/incident/escalate', methods=['POST'])
def escalate_incident():
    """Escalate incident - Send SMS and make call"""
    print("\n" + "="*50)
    print("ESCALATING INCIDENT")
    print("="*50)
    
    # Send SMS
    sms_message = "🚨 EMERGENCY ALERT: Incident escalated at Safety Console. Immediate action required!"
    sms_sent = send_sms(sms_message)
    
    # Make call
    call_made = make_call()
    
    result = {
        'success': True,
        'sms_sent': sms_sent,
        'call_made': call_made,
        'message': 'Incident escalated'
    }
    
    if not sms_sent and not call_made:
        result['success'] = False
        result['message'] = 'Failed to send alerts. Check Twilio configuration.'
    
    print(f"Result: {result}")
    print("="*50 + "\n")
    
    return jsonify(result)

@app.route('/api/test/sms', methods=['POST'])
def test_sms():
    """Test SMS functionality"""
    message = request.json.get('message', 'Test SMS from Safety Console')
    success = send_sms(message)
    return jsonify({'success': success})

@app.route('/api/test/call', methods=['POST'])
def test_call():
    """Test call functionality"""
    success = make_call()
    return jsonify({'success': success})

@app.route('/api/config/check', methods=['GET'])
def check_config():
    """Check Twilio configuration"""
    config_status = {
        'twilio_initialized': twilio_client is not None,
        'account_sid_set': TWILIO_ACCOUNT_SID != 'your_account_sid_here',
        'auth_token_set': TWILIO_AUTH_TOKEN != 'your_auth_token_here',
        'twilio_number_set': TWILIO_PHONE_NUMBER != '+1234567890',
        'operator_number_set': OPERATOR_PHONE_NUMBER != '+919876543210'
    }
    
    config_status['all_configured'] = all(config_status.values())
    
    return jsonify(config_status)

if __name__ == '__main__':
    print("\n" + "="*50)
    print("TWILIO SAFETY CONSOLE BACKEND")
    print("="*50)
    print(f"Twilio Account SID: {TWILIO_ACCOUNT_SID[:10]}...")
    print(f"Twilio Phone: {TWILIO_PHONE_NUMBER}")
    print(f"Operator Phone: {OPERATOR_PHONE_NUMBER}")
    print("="*50)
    print("\nEndpoints:")
    print("  POST /api/incident/escalate - Escalate incident (SMS + Call)")
    print("  POST /api/test/sms - Test SMS")
    print("  POST /api/test/call - Test voice call")
    print("  GET  /api/config/check - Check configuration")
    print("="*50)
    print("\nStarting server on http://localhost:5055")
    print("Press Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=5055, debug=True)
