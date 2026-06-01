#!/usr/bin/env python3
"""
Gate Control Server - runs on port 5001
Receives HTTP requests from Angular frontend and publishes MQTT commands to the gate.

Endpoints:
  POST /open   -> publishes CMD_OPEN_ENTRY  (entry gate)
  POST /exit   -> publishes CMD_OPEN_EXIT   (exit gate)
  POST /DETECT -> publishes CMD_DETECT      (slot detection trigger)
"""

from flask import Flask, jsonify
from flask_cors import CORS
import paho.mqtt.publish as publish

app = Flask(__name__)
CORS(app)

# ── MQTT CONFIG ──────────────────────────────────────────────────────────────
MQTT_BROKER   = "10.199.116.184"   # IP from: mosquitto_pub -h 10.199.116.184
MQTT_PORT     = 1883
MQTT_TOPIC    = "parkseva/command"
# ─────────────────────────────────────────────────────────────────────────────

def publish_command(command: str):
    """Publish a single MQTT message and return success/error."""
    try:
        publish.single(
            topic=MQTT_TOPIC,
            payload=command,
            hostname=MQTT_BROKER,
            port=MQTT_PORT,
        )
        print(f"[MQTT] Published '{command}' to {MQTT_BROKER}:{MQTT_PORT}/{MQTT_TOPIC}")
        return True, None
    except Exception as e:
        print(f"[MQTT] ERROR publishing '{command}': {e}")
        return False, str(e)


@app.route("/open", methods=["POST"])
def open_entry_gate():
    ok, err = publish_command("CMD_OPEN_ENTRY")
    if ok:
        return jsonify({"status": "ok", "command": "CMD_OPEN_ENTRY"}), 200
    return jsonify({"status": "error", "detail": err}), 500


@app.route("/exit", methods=["POST"])
def open_exit_gate():
    ok, err = publish_command("CMD_OPEN_EXIT")
    if ok:
        return jsonify({"status": "ok", "command": "CMD_OPEN_EXIT"}), 200
    return jsonify({"status": "error", "detail": err}), 500


@app.route("/DETECT", methods=["POST"])
def trigger_detect():
    ok, err = publish_command("CMD_DETECT")
    if ok:
        return jsonify({"status": "ok", "command": "CMD_DETECT"}), 200
    return jsonify({"status": "error", "detail": err}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "running", "broker": MQTT_BROKER, "topic": MQTT_TOPIC}), 200


if __name__ == "__main__":
    print("=" * 50)
    print("  ParkSeva Gate Control Server")
    print("=" * 50)
    print(f"  MQTT Broker : {MQTT_BROKER}:{MQTT_PORT}")
    print(f"  MQTT Topic  : {MQTT_TOPIC}")
    print(f"  HTTP Server : http://localhost:5001")
    print("=" * 50)
    print("  POST /open   -> CMD_OPEN_ENTRY")
    print("  POST /exit   -> CMD_OPEN_EXIT")
    print("  POST /DETECT -> CMD_DETECT")
    print("  GET  /health -> status check")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5001, debug=False)
