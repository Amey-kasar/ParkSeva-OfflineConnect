# Twilio SMS & Call Troubleshooting Guide

## Common Issues & Solutions

### 1. SMS/Calls Not Sending

**Check these first:**

1. **Twilio Account Setup**
   - Go to https://www.twilio.com/console
   - Verify your account is active
   - Check your account balance (trial accounts need credit)

2. **Phone Number Verification**
   - Trial accounts can ONLY send to verified numbers
   - Go to: https://www.twilio.com/console/phone-numbers/verified
   - Add and verify your phone number

3. **Get Credentials**
   ```
   Account SID: Found at https://www.twilio.com/console
   Auth Token: Found at https://www.twilio.com/console (click "Show")
   Twilio Phone: Buy one at https://www.twilio.com/console/phone-numbers
   ```

4. **Update Configuration**
   Edit `twilio_backend.py`:
   ```python
   TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxx'  # Your actual SID
   TWILIO_AUTH_TOKEN = 'your_actual_token'
   TWILIO_PHONE_NUMBER = '+15551234567'  # Your Twilio number
   OPERATOR_PHONE_NUMBER = '+919876543210'  # Your verified number
   ```

### 2. Installation

```bash
pip install twilio flask flask-cors
```

### 3. Test Configuration

```bash
# Run the backend
python twilio_backend.py

# In another terminal, test configuration:
curl http://localhost:5055/api/config/check

# Test SMS:
curl -X POST http://localhost:5055/api/test/sms \
  -H "Content-Type: application/json" \
  -d '{"message": "Test SMS"}'

# Test Call:
curl -X POST http://localhost:5055/api/test/call
```

### 4. Common Error Messages

**Error: "Unable to create record: The number is unverified"**
- Solution: Verify your phone number in Twilio console

**Error: "Authenticate"**
- Solution: Check your Account SID and Auth Token are correct

**Error: "The 'From' number is not a valid phone number"**
- Solution: Buy a Twilio phone number first

**Error: "Insufficient funds"**
- Solution: Add credit to your Twilio account

### 5. Trial Account Limitations

- Can only call/SMS verified numbers
- Messages include "Sent from a Twilio trial account"
- Limited to specific countries

**Upgrade to remove limitations:**
https://www.twilio.com/console/billing

### 6. Phone Number Format

Always use E.164 format:
```
Correct: +919876543210
Wrong: 9876543210
Wrong: +91 98765 43210
```

### 7. Check Twilio Logs

View all SMS/call attempts:
https://www.twilio.com/console/sms/logs
https://www.twilio.com/console/voice/logs

### 8. Test from Twilio Console

Before using the backend, test directly:
1. Go to https://www.twilio.com/console/sms/getting-started/build
2. Send a test SMS
3. If this works, your backend will work too

### 9. Firewall/Network Issues

If running on a server:
- Ensure port 5055 is open
- Check firewall rules
- Verify outbound HTTPS is allowed (Twilio API uses HTTPS)

### 10. Debug Mode

Enable detailed logging in your Python backend:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Quick Setup Checklist

- [ ] Twilio account created
- [ ] Phone number verified
- [ ] Twilio phone number purchased
- [ ] Account SID copied
- [ ] Auth Token copied
- [ ] Configuration updated in twilio_backend.py
- [ ] Dependencies installed (pip install twilio flask flask-cors)
- [ ] Backend running (python twilio_backend.py)
- [ ] Test SMS sent successfully
- [ ] Test call made successfully

## Support

If still not working:
1. Check Twilio error logs: https://www.twilio.com/console/sms/logs
2. Review Twilio documentation: https://www.twilio.com/docs
3. Contact Twilio support: https://support.twilio.com
