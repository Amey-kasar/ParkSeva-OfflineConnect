import os
import time
import threading
from twilio.rest import Client

class AlertSystem:
    def __init__(self, account_sid=None, auth_token=None, from_number=None):
        self.account_sid = account_sid or os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token  = auth_token  or os.getenv("TWILIO_AUTH_TOKEN")
        self.from_num    = from_number or os.getenv("TWILIO_FROM_NUMBER")
        self.msg_service = os.getenv("TWILIO_MESSAGING_SERVICE_SID")

        if not self.account_sid or not self.auth_token:
            raise RuntimeError("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN.")
        if not (self.from_num or self.msg_service):
            raise RuntimeError("Missing TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.")

        self.client = Client(self.account_sid, self.auth_token)
        self.stop_alerts = False
        self.response = {}  # incident_id -> {to, ack, sms_sid, ts}

    # --- SMS sending ---
    def send_sms(self, to_number, message):
        if self.stop_alerts:
            return None

        params = {"to": to_number, "body": message}
        if self.msg_service:
            params["messaging_service_sid"] = self.msg_service
        else:
            params["from_"] = self.from_num

        sms = self.client.messages.create(**params)
        return sms.sid

    # --- Raise alert and handle escalation ---
    def raise_alert(self, incident_id, message, to_number):
        body = f"[ParkSeva ALERT {incident_id}] {message}\nReply 'ACK {incident_id}' to acknowledge."
        sid = self.send_sms(to_number, body)
        if sid:
            self.response[incident_id] = {
                "to": to_number, "ack": False, "sms_sid": sid, "ts": time.time()
            }
            delay = int(os.getenv("ESCALATE_AFTER_SEC", "300"))
            threading.Thread(
                target=self._escalate_after_delay,
                args=(incident_id, delay),
                daemon=True
            ).start()
        return sid

    def _escalate_after_delay(self, incident_id, delay):
        time.sleep(delay)
        rec = self.response.get(incident_id)
        if not rec or rec.get("ack"):
            return
        self.client.calls.create(
            to=rec["to"],
            from_=self.from_num,
            twiml=(
                '<Response>'
                '<Say voice="Polly.Raveena" language="en-IN">'
                'Urgent ParkSeva safety alert. Please check the app for details.'
                '</Say>'
                '<Gather input="dtmf" timeout="10" numDigits="1">'
                '<Say>To acknowledge, press 1.</Say>'
                '</Gather>'
                '</Response>'
            )
        )

    def acknowledge(self, incident_id):
        if incident_id in self.response:
            self.response[incident_id]["ack"] = True
            return True
        return False

    def pause(self):
        """Pause alert system."""
        self.stop_alerts = True
        print("[AlertSystem] Alerts paused")

    def resume(self):
        """Resume alert system."""
        self.stop_alerts = False
        print("[AlertSystem] Alerts resumed")
