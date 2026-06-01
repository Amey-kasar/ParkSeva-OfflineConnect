import os
import time
import threading
import uuid
from datetime import datetime
from twilio.rest import Client
from dotenv import load_dotenv

class IncidentManager:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        self.incidents = {}
        self.current_incident = None
        self.lock = threading.Lock()
        self.escalation_delay = int(os.getenv("ESCALATE_AFTER_SEC", "30"))
        
        # Hardcode working Twilio credentials (temporary fix)
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = "5f84bf4798f5a2418e1aa0f73fdea5b6"   # UPDATE THIS
        self.from_number = "+15076291926"                        # UPDATE THIS
        self.to_number = "+917385192422"
        
        print(f"[Incident] Using SID: {self.account_sid}")
        print(f"[Incident] Using From: {self.from_number}")
        print(f"[Incident] Using To: {self.to_number}")
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
            print("[Incident] Twilio client initialized successfully")
        else:
            self.client = None
            print("[Incident] Twilio not configured - no credentials")

    def create_incident(self, incident_type, location="Unknown"):
        with self.lock:
            incident_id = str(uuid.uuid4())[:8].upper()
            incident = {
                "incident_id": incident_id,
                "incident_type": incident_type,
                "timestamp": datetime.utcnow().isoformat(),
                "location": location,
                "status": "PENDING",
                "timer_active": True
            }
            self.incidents[incident_id] = incident
            self.current_incident = incident_id
            
            # Start escalation timer
            threading.Thread(
                target=self._escalation_timer,
                args=(incident_id,),
                daemon=True
            ).start()
            
            return incident

    def _escalation_timer(self, incident_id):
        time.sleep(self.escalation_delay)
        
        with self.lock:
            incident = self.incidents.get(incident_id)
            if not incident or not incident.get("timer_active"):
                return
            if incident["status"] != "PENDING":
                return
            incident["status"] = "ESCALATED"
            incident["timer_active"] = False
            incident_copy = dict(incident)  # copy so we can use outside lock

        # Call outside the lock to avoid deadlock during sleep/network calls
        self._trigger_call(incident_copy)

    def _trigger_call(self, incident):
        # Use EXACT same code as working test script
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = "5f84bf4798f5a2418e1aa0f73fdea5b6"
        from_number = "+15076291926"
        to_number = "+917385192422"
        
        client = Client(account_sid, auth_token)
        
        incident_type = incident["incident_type"]
        location = incident["location"]
        incident_id = incident["incident_id"]
        
        LOCATION = "Amrutvahini Polytechnic"

        # 1. Send SMS first
        sms_sent = False
        try:
            sms_body = f"[ParkSeva ALERT {incident_id}] {incident_type} detected at {LOCATION}. Reply ACK to acknowledge."
            message = client.messages.create(
                to=to_number,
                from_=from_number,
                body=sms_body
            )
            print(f"[Incident] ✓ SMS sent! SID: {message.sid}")
            sms_sent = True
        except Exception as e:
            print(f"[Incident] ✗ SMS failed: {e}")

        # 2. Wait 15 seconds after SMS, then make voice call
        if sms_sent:
            print(f"[Incident] Waiting 15 seconds before call...")
            time.sleep(15)

        call_msg = f"Urgent ParkSeva safety alert. {incident_type} is detected at {LOCATION}."
        twiml = f'<Response><Say voice="Polly.Raveena" language="en-IN">{call_msg} Press 1 to acknowledge.</Say></Response>'

        try:
            call = client.calls.create(
                to=to_number,
                from_=from_number,
                twiml=twiml
            )
            print(f"[Incident] ✓ CALL SUCCESS! Escalated {incident_id} via call {call.sid}")
        except Exception as e:
            print(f"[Incident] ✗ Call failed: {e}")

    def acknowledge_incident(self, incident_id):
        with self.lock:
            incident = self.incidents.get(incident_id)
            if not incident:
                return None
            
            if incident["status"] == "PENDING":
                incident["status"] = "ACKNOWLEDGED"
                incident["timer_active"] = False
                
                if self.current_incident == incident_id:
                    self.current_incident = None
                
                return incident
            return None

    def mark_false_alarm(self, incident_id):
        with self.lock:
            incident = self.incidents.get(incident_id)
            if not incident:
                return None
            
            if incident["status"] == "PENDING":
                incident["status"] = "FALSE_ALARM"
                incident["timer_active"] = False
                
                if self.current_incident == incident_id:
                    self.current_incident = None
                
                return incident
            return None

    def get_current_incident(self):
        with self.lock:
            if self.current_incident:
                return self.incidents.get(self.current_incident)
            return None

    def get_incident(self, incident_id):
        with self.lock:
            return self.incidents.get(incident_id)
