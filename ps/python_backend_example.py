# Python Backend Example for Safety Console
# Install: pip install flask flask-cors opencv-python

from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global camera object
camera = cv2.VideoCapture(0)  # 0 for default camera

def generate_frames():
    """Generate video frames from camera"""
    while True:
        success, frame = camera.read()
        if not success:
            break
        else:
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            
            # Yield frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/status')
def get_status():
    """Get current incident status"""
    return jsonify({
        'status': 'NORMAL',  # or 'ALERT', 'ESCALATED'
        'timestamp': datetime.datetime.now().isoformat(),
        'type': None,
        'acknowledged': False
    })

@app.route('/api/evidence')
def get_evidence():
    """Get evidence files"""
    return jsonify([
        # Example evidence
        # {
        #     'filename': 'incident_001.jpg',
        #     'timestamp': datetime.datetime.now().isoformat(),
        #     'url': 'http://127.0.0.1:5055/evidence/incident_001.jpg'
        # }
    ])

@app.route('/api/acknowledge', methods=['POST'])
def acknowledge():
    """Acknowledge incident"""
    # Add your logic here
    return jsonify({'success': True})

@app.route('/api/false-alarm', methods=['POST'])
def false_alarm():
    """Mark as false alarm"""
    # Add your logic here
    return jsonify({'success': True})

@app.route('/api/escalate', methods=['POST'])
def escalate():
    """Escalate incident"""
    # Add your logic here
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5055, debug=True, threaded=True)
