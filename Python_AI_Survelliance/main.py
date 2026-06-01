# main.py
import os, time, threading, atexit
from dotenv import load_dotenv
from flask import (
    Flask,
    request,
    Response,
    jsonify,
    send_file,
    abort,
    render_template,
    stream_with_context,
)
from flask_cors import CORS
from alert_system import AlertSystem
from camera_module import CameraMonitor
from audio_module import AudioMonitor
from incident_manager import IncidentManager
import cv2
import numpy as np
from datetime import datetime
import pathlib
import textwrap
from evidence_storage import EvidenceRepository, EvidenceDirectoryWatcher
from io import BytesIO
from realtime_bus import EventBus, sse_stream

load_dotenv()

# ---- Config ----
VIDEO_URL = os.getenv("VIDEO_URL", "mac:0")
AUDIO_URL = os.getenv("AUDIO_URL", "mic:default")

FALL_WEIGHTS = os.getenv("FALL_WEIGHTS", "yolov8n.pt")
VIOLENCE_WEIGHTS = os.getenv("VIOLENCE_WEIGHTS", "yolov8n.pt")

PRIMARY = os.getenv("PRIMARY_CONTACT_NUMBER")
POLICE  = os.getenv("POLICE_NUMBER")
AMBUL   = os.getenv("AMBULANCE_NUMBER")

SNAPSHOT_DIR = os.getenv("SNAPSHOT_DIR", "./evidence")
UI_FONT_SCALE = float(os.getenv("UI_FONT_SCALE", "0.9"))
UI_THICKNESS  = int(os.getenv("UI_THICKNESS", "2"))
EVIDENCE_POLL_SEC = float(os.getenv("EVIDENCE_POLL_SEC", "5.0"))
EVIDENCE_SETTLE_SEC = float(os.getenv("EVIDENCE_SETTLE_SEC", "1.0"))
GUI_STREAM_FPS = float(os.getenv("GUI_STREAM_FPS", "25.0"))  # Increased from 18
MONITOR_LOOP_DELAY = float(os.getenv("MONITOR_LOOP_DELAY", "0.05"))  # Increased from 0.01

# ---- Globals ----
event_bus = EventBus()
alert_system = AlertSystem()
incident_manager = IncidentManager()
camera = CameraMonitor(VIDEO_URL, FALL_WEIGHTS, VIOLENCE_WEIGHTS)
audio  = AudioMonitor(["help me", "call ambulance", "rape", "accident", "madad", "bachao", "ambulance"], AUDIO_URL)
evidence_repository = EvidenceRepository.from_env()
evidence_watcher = None
def _emit_evidence_event(meta):
    event_bus.publish({"type": "evidence", "evidence": meta})

if evidence_repository:
    evidence_watcher = EvidenceDirectoryWatcher(
        pathlib.Path(SNAPSHOT_DIR),
        evidence_repository,
        poll_interval=EVIDENCE_POLL_SEC,
        settle_seconds=EVIDENCE_SETTLE_SEC,
        on_new_evidence=_emit_evidence_event,
    )
    evidence_watcher.start()
    def _close_evidence_resources():
        evidence_watcher.stop()
        evidence_repository.close()
    atexit.register(_close_evidence_resources)
else:
    print("[Evidence] MongoDB connection not configured; evidence sync disabled.")

# simple thread-safe queue for recent incidents to overlay and snapshot
from collections import deque
_incident_feed = deque(maxlen=10)
_last_snapshot_ts = 0.0
_snapshot_cooldown = 3.0  # seconds between two auto-snapshots

# ---- Flask (Twilio webhooks) ----
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.post("/twilio/sms")
def twilio_sms():
    """Inbound SMS: 'ACK <id>' to acknowledge, 'STOP' to pause alerts."""
    body = request.form.get("Body", "").strip().lower()
    if body.startswith("ack"):
        parts = body.split()
        if len(parts) >= 2:
            incident_id = parts[1].upper()
            alert_system.acknowledge(incident_id)
            return _twiml_sms("Incident acknowledged. Thank you.")
        return _twiml_sms("Please reply 'ACK <incident_id>'.")
    if body == "stop":
        alert_system.pause()
        return _twiml_sms("Alerts paused. Reply 'resume' to re-enable.")
    if body == "resume":
        alert_system.resume()
        return _twiml_sms("Alerts resumed.")
    return _twiml_sms("Reply 'ACK <incident_id>' to acknowledge, 'stop' to pause alerts.")

def _twiml_sms(text):
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{text}</Message></Response>',
                    mimetype="application/xml")

@app.post("/twilio/voice")
def twilio_voice():
    """Outbound call IVR: press 1 to acknowledge incident."""
    incident_id = request.args.get("incident_id", "")
    digits = request.form.get("Digits")
    if digits == "1" and incident_id:
        alert_system.acknowledge(incident_id)
        return _twiml_voice(f"Incident {incident_id} acknowledged. Goodbye.")
    return _twiml_gather(incident_id)

def _twiml_gather(incident_id):
    return Response(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" timeout="8" action="/twilio/voice?incident_id={incident_id}">
    <Say voice="Polly.Raveena" language="en-IN">
      ParkSeva alert. Press 1 to acknowledge and stop escalation.
    </Say>
  </Gather>
  <Say voice="Polly.Raveena" language="en-IN">No input received. Goodbye.</Say>
  <Hangup/>
</Response>''', mimetype="application/xml"
    )

def _twiml_voice(text):
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><Response><Say>{text}</Say><Hangup/></Response>',
                    mimetype="application/xml")

# ---- Evidence API ----
@app.get("/api/status")
def get_status():
    try:
        return jsonify({
            "status": "running",
            "camera": "active" if camera else "inactive",
            "audio": "active" if audio else "inactive",
            "evidence_store": "connected" if evidence_repository else "local_only"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ---- Incident API ----
@app.post("/api/incident/acknowledge")
def acknowledge_incident():
    try:
        data = request.get_json() or {}
        incident_id = data.get("incident_id")
        if not incident_id:
            return jsonify({"error": "incident_id required"}), 400
        
        incident = incident_manager.acknowledge_incident(incident_id)
        if incident:
            return jsonify(incident)
        return jsonify({"error": "Incident not found or already processed"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/incident/false_alarm")
def false_alarm_incident():
    try:
        data = request.get_json() or {}
        incident_id = data.get("incident_id")
        if not incident_id:
            return jsonify({"error": "incident_id required"}), 400
        
        incident = incident_manager.mark_false_alarm(incident_id)
        if incident:
            return jsonify(incident)
        return jsonify({"error": "Incident not found or already processed"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.get("/api/incident/current")
def get_current_incident():
    try:
        incident = incident_manager.get_current_incident()
        if incident:
            return jsonify(incident)
        return jsonify({"message": "No active incident"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.get("/api/evidence")
def list_evidence():
    try:
        if not evidence_repository:
            ensure_dir(SNAPSHOT_DIR)
            files = []
            evidence_path = pathlib.Path(SNAPSHOT_DIR)
            if evidence_path.exists():
                for f in sorted(evidence_path.glob("*.jpg"), key=lambda p: p.stat().st_mtime, reverse=True):
                    files.append({
                        "id": f.name,
                        "filename": f.name,
                        "path": str(f),
                        "size": f.stat().st_size,
                        "stored_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                        "content_type": "image/jpeg"
                    })
            return jsonify(files)
        items = list(evidence_repository.list_evidence())
        return jsonify(items)
    except Exception as e:
        return jsonify([]), 200


@app.get("/api/evidence/<string:image_id>")
def fetch_evidence(image_id: str):
    try:
        if not evidence_repository:
            evidence_path = pathlib.Path(SNAPSHOT_DIR) / image_id
            if not evidence_path.exists():
                abort(404, description="Evidence not found.")
            return send_file(str(evidence_path), mimetype="image/jpeg", as_attachment=False)
        doc = evidence_repository.get_image(image_id)
        if not doc:
            abort(404, description="Evidence not found.")
        content_type = doc.get("content_type", "application/octet-stream")
        filename = doc.get("filename", f"{image_id}.bin")
        data = bytes(doc["data"])
        return send_file(
            BytesIO(data),
            mimetype=content_type,
            download_name=filename,
            as_attachment=False,
            conditional=True,
        )
    except Exception as e:
        if "404" in str(e):
            abort(404, description="Evidence not found.")
        return jsonify({"error": str(e)}), 500

@app.get("/evidence/<string:image_id>")
def fetch_evidence_alias(image_id: str):
    return fetch_evidence(image_id)

@app.get("/api/events")
def stream_events():
    response = Response(
        stream_with_context(sse_stream(event_bus)),
        mimetype="text/event-stream",
    )
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


def _video_stream_generator():
    boundary = b"--frame"
    delay = 1.0 / GUI_STREAM_FPS if GUI_STREAM_FPS > 0 else 0.033
    
    placeholder = None
    jpeg_quality = int(os.getenv("STREAM_JPEG_QUALITY", "70"))
    
    while True:
        frame = camera.get_last_frame()
        if frame is None:
            if placeholder is None:
                placeholder = (np.ones((360, 480, 3), dtype=np.uint8) * 50)
                cv2.putText(placeholder, "Camera Unavailable", (120, 180),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            frame = placeholder
        
        # Resize for streaming
        h, w = frame.shape[:2]
        if w > 480:
            scale = 480 / w
            frame = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
                
        ok, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
        if ok:
            yield (
                boundary
                + b"\r\nContent-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )
        time.sleep(delay)


@app.get("/api/video_feed")
def video_feed():
    return Response(
        stream_with_context(_video_stream_generator()),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache", "Pragma": "no-cache"},
    )

@app.get("/video_feed")
def video_feed_alias():
    return video_feed()


@app.get("/")
def dashboard():
    return render_template("dashboard.html")

# ---- Helpers ----
def ensure_dir(path):
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)

def timestamp():
    return datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

def slug(s):
    return "".join(c.lower() if c.isalnum() else "_" for c in s)[:40].strip("_")

def save_snapshot(kind, detail_text=None):
    """Grab last frame from camera, persist to disk and Mongo (if enabled)."""
    global _last_snapshot_ts
    now = time.time()
    if now - _last_snapshot_ts < _snapshot_cooldown:
        return None  # throttle
    frame = camera.get_last_frame()
    if frame is None:
        return None
    ensure_dir(SNAPSHOT_DIR)
    name = f"{timestamp()}_{slug(kind)}.jpg"
    path = os.path.join(SNAPSHOT_DIR, name)

    overlay = frame.copy()
    label = f"{kind.upper()}"
    if detail_text:
        label += f": {detail_text}"
    label = textwrap.shorten(label, width=80, placeholder="…")

    cv2.rectangle(overlay, (10, 10), (10 + 600, 10 + 58), (0, 0, 0), -1)
    cv2.putText(overlay, label, (20, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2, cv2.LINE_AA)

    cv2.imwrite(path, overlay)
    _last_snapshot_ts = now

    evidence_meta = None
    if evidence_repository:
        try:
            meta = evidence_repository.insert_image(pathlib.Path(path))
            if meta:
                evidence_meta = meta
                if evidence_watcher:
                    evidence_watcher.register_hash(meta["hash"])
                _emit_evidence_event(meta)
        except Exception as exc:
            print(f"[Snapshot] Failed to store evidence: {exc}")

    return {"path": path, "evidence": evidence_meta}

def _severity_for_event(kind, default="info"):
    label = (kind or "").lower()
    if "medical" in label:
        return "critical"
    if "violence" in label:
        return "critical"
    if "fall" in label:
        return "high"
    return default


def _broadcast_alert(kind, detail, source, severity=None, evidence_meta=None, extra=None):
    payload = {
        "type": "alert",
        "kind": kind,
        "detail": detail,
        "source": source,
        "severity": severity or _severity_for_event(kind),
    }
    if evidence_meta:
        payload["evidence"] = evidence_meta
    if extra:
        payload["extra"] = extra
    event_bus.publish(payload)

# ---- Monitor loop (detect + alerts + snapshot) ----
def monitor_loop():
    print("[Monitor] started.")
    while True:
        try:
            video_evt = camera.check_camera_events()   # "fall" or "medical" or None
            audio_evt = audio.check_audio_emergency()  # ("audio", sev, text) or None

            if video_evt and audio_evt:
                kind = f"{video_evt}+audio"
                detail = f"Cam:{video_evt} | Audio:{audio_evt[2]}"
                keyword = audio_evt[3] if len(audio_evt) > 3 else "audio alert"
                
                # Create incident
                incident = incident_manager.create_incident(
                    incident_type=keyword,
                    location=os.getenv("LOCATION", "Amrutvahini Polytechnic")
                )
                
                try:
                    alert_system.raise_alert(incident["incident_id"], detail, to_number=PRIMARY)
                except Exception as exc:
                    print(f"[Alert] Failed to notify Twilio: {exc}")
                _incident_feed.append((time.time(), kind, detail))
                snapshot = save_snapshot(kind, detail)
                evidence_meta = snapshot["evidence"] if snapshot else None
                extra = {
                    "audio_text": audio_evt[2],
                    "audio_severity": audio_evt[1],
                    "keyword": keyword,
                    "incident_id": incident["incident_id"]
                }
                _broadcast_alert(
                    kind,
                    detail,
                    source="video+audio",
                    severity="critical",
                    evidence_meta=evidence_meta,
                    extra=extra,
                )

            elif video_evt:
                detail = f"Camera: {video_evt}"
                
                # Create incident for violence
                if "violence" in video_evt.lower():
                    incident = incident_manager.create_incident(
                        incident_type="violence",
                        location=os.getenv("LOCATION", "Amrutvahini Polytechnic")
                    )
                    extra_data = {"incident_id": incident["incident_id"]}
                else:
                    extra_data = None
                
                try:
                    alert_system.raise_alert(incident["incident_id"] if "violence" in video_evt.lower() else video_evt, detail, to_number=PRIMARY)
                except Exception as exc:
                    print(f"[Alert] Failed to notify Twilio: {exc}")
                _incident_feed.append((time.time(), video_evt, detail))
                snapshot = save_snapshot(video_evt, detail)
                evidence_meta = snapshot["evidence"] if snapshot else None
                _broadcast_alert(
                    video_evt,
                    detail,
                    source="video",
                    evidence_meta=evidence_meta,
                    extra=extra_data,
                )

            elif audio_evt:
                _, sev, text = audio_evt[:3]
                keyword = audio_evt[3] if len(audio_evt) > 3 else "audio alert"
                detail = f"Audio: {text}"
                
                # Create incident (will auto-call after escalation delay if not acknowledged)
                incident = incident_manager.create_incident(
                    incident_type=keyword,
                    location=os.getenv("LOCATION", "Amrutvahini Polytechnic")
                )
                
                print(f"[Audio Alert] Created incident {incident['incident_id']}: keyword='{keyword}' text='{text}'")
                print(f"[Audio Alert] Will escalate to call after delay if not acknowledged")
                
                _incident_feed.append((time.time(), "audio", detail))
                snapshot = save_snapshot("audio", text)
                evidence_meta = snapshot["evidence"] if snapshot else None
                _broadcast_alert(
                    "audio",
                    detail,
                    source="audio",
                    severity=sev,
                    evidence_meta=evidence_meta,
                    extra={"transcript": text, "keyword": keyword, "incident_id": incident["incident_id"]},
                )

            time.sleep(MONITOR_LOOP_DELAY)
        except Exception as e:
            print(f"[Monitor] error: {e}")
            time.sleep(max(0.1, MONITOR_LOOP_DELAY))

# ---- Full-screen viewer loop ----
def viewer_loop():
    win = "ParkSeva Live"
    cv2.namedWindow(win, cv2.WINDOW_NORMAL)
    # force full screen
    cv2.setWindowProperty(win, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    font = cv2.FONT_HERSHEY_SIMPLEX
    while True:
        frame = camera.get_last_frame()
        if frame is None:
            # pull a frame to seed last_frame
            frame = camera.read_frame()
            if frame is None:
                time.sleep(0.02)
                continue

        display = frame.copy()

        # draw recent incidents (last 6s)
        now = time.time()
        y = 40
        for ts, kind, detail in list(_incident_feed):
            if now - ts > 6.0:
                continue
            text = f"{kind.upper()} — {detail}"
            cv2.putText(display, textwrap.shorten(text, 80, placeholder="…"),
                        (20, y), font, UI_FONT_SCALE, (0,0,255), UI_THICKNESS, cv2.LINE_AA)
            y += int(34 * UI_FONT_SCALE + 8)

        cv2.imshow(win, display)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):  # quit
            break
        elif key == ord('s'):  # manual snapshot
            snap = save_snapshot("manual", "user pressed S")
            if snap and snap.get("path"):
                print(f"[Snapshot] saved -> {snap['path']}")
        elif key == ord('f'):  # toggle fullscreen
            # toggle windowed/fullscreen
            state = int(cv2.getWindowProperty(win, cv2.WND_PROP_FULLSCREEN))
            cv2.setWindowProperty(
                win,
                cv2.WND_PROP_FULLSCREEN,
                cv2.WINDOW_NORMAL if state == cv2.WINDOW_FULLSCREEN else cv2.WINDOW_FULLSCREEN
            )

    cv2.destroyAllWindows()

def _env_bool(k, default=True):
    return os.getenv(k, "true" if default else "false").strip().lower() in ("1","true","yes","y","on")

# ---- Full-screen viewer loop (must run on main thread on macOS) ----
def viewer_loop():
    if not _env_bool("SHOW_VIEWER", True):  # allow disabling viewer in headless mode
        return

    win = os.getenv("VIEWER_WINDOW", "ParkSeva Live")
    fullscreen = _env_bool("VIEWER_FULLSCREEN", True)
    created = False
    font = cv2.FONT_HERSHEY_SIMPLEX

    while True:
        frame = camera.get_last_frame()
        if frame is None:
            # seed a frame if needed
            frame = camera.read_frame()
            if frame is None:
                time.sleep(0.02)
                continue

        # draw recent incidents (last 6s)
        display = frame.copy()
        now = time.time()
        y = 40
        for ts, kind, detail in list(_incident_feed):
            if now - ts > 6.0:
                continue
            text = f"{kind.upper()} — {detail}"
            cv2.putText(display, textwrap.shorten(text, 80, placeholder="…"),
                        (20, y), font, UI_FONT_SCALE, (0,0,255), UI_THICKNESS, cv2.LINE_AA)
            y += int(34 * UI_FONT_SCALE + 8)

        if not created:
            try:
                cv2.namedWindow(win, cv2.WINDOW_NORMAL)
                if fullscreen:
                    cv2.setWindowProperty(win, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
                created = True
            except cv2.error as e:
                print(f"[Viewer] UI disabled: {e}")
                # If UI fails (e.g., headless or wrong backend), exit viewer cleanly
                return

        cv2.imshow(win, display)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):  # quit viewer only (app keeps running)
            break
        elif key == ord('s'):
            snap = save_snapshot("manual", "user pressed S")
            if snap and snap.get("path"):
                print(f"[Snapshot] saved -> {snap['path']}")
        elif key == ord('f'):
            state = int(cv2.getWindowProperty(win, cv2.WND_PROP_FULLSCREEN))
            cv2.setWindowProperty(
                win,
                cv2.WND_PROP_FULLSCREEN,
                cv2.WINDOW_NORMAL if state == cv2.WINDOW_FULLSCREEN else cv2.WINDOW_FULLSCREEN
            )

    cv2.destroyAllWindows()

def run_flask():
    port = int(os.getenv("PORT", "5055"))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)

# ---- App entrypoint (UI on main thread) ----
if __name__ == "__main__":
    # Start non-UI threads
    threading.Thread(target=run_flask, daemon=True).start()
    threading.Thread(target=monitor_loop, daemon=True).start()

    # IMPORTANT: on macOS, OpenCV HighGUI must run on the main thread
    viewer_loop()

    # Clean shutdown
    try:
        camera.release()
    except Exception:
        pass
