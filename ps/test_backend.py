#!/usr/bin/env python3
"""
Safety Console Backend - Test Server
Run this to test camera feed: python test_backend.py
"""

from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import datetime
import time

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Try to open camera
camera = None
try:
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        print("WARNING: Could not open camera. Using test pattern instead.")
        camera = None
except Exception as e:
    print(f"ERROR: Could not initialize camera: {e}")
    camera = None

def generate_frames():
    """Generate video frames from camera or test pattern"""
    import numpy as np
    
    while True:
        if camera and camera.isOpened():
            success, frame = camera.read()
            if not success:
                # Generate test pattern if camera fails
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, 'Camera Not Available', (150, 240), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        else:
            # Generate test pattern
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, 'Test Pattern', (200, 200), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, time.strftime('%H:%M:%S'), (220, 280), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        # Yield frame in multipart format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/status')
def get_status():
    """Get current incident status"""
    return jsonify({
        'status': 'NORMAL',
        'timestamp': datetime.datetime.now().isoformat(),
        'type': None,
        'acknowledged': False
    })

@app.route('/api/evidence')
def get_evidence():
    """Get evidence files"""
    # Example: Return sample evidence
    # In production, scan your evidence folder and return actual files
    import os
    evidence_list = []
    
    # Check if evidence folder exists
    evidence_folder = 'evidence'
    if os.path.exists(evidence_folder):
        for filename in os.listdir(evidence_folder):
            if filename.endswith(('.jpg', '.jpeg', '.png')):
                evidence_list.append({
                    'filename': filename,
                    'timestamp': datetime.datetime.now().isoformat(),
                    'url': f'http://localhost:5055/evidence/{filename}'
                })
    
    # If no evidence, return sample data for testing
    if not evidence_list:
        evidence_list = [
            {
                'filename': 'sample_incident_1.jpg',
                'timestamp': datetime.datetime.now().isoformat(),
                'url': 'http://localhost:5055/sample_evidence/1'
            },
            {
                'filename': 'sample_incident_2.jpg',
                'timestamp': (datetime.datetime.now() - datetime.timedelta(minutes=5)).isoformat(),
                'url': 'http://localhost:5055/sample_evidence/2'
            }
        ]
    
    return jsonify(evidence_list)

@app.route('/api/acknowledge', methods=['POST'])
def acknowledge():
    """Acknowledge incident"""
    print("Incident acknowledged")
    return jsonify({'success': True})

@app.route('/api/false-alarm', methods=['POST'])
def false_alarm():
    """Mark as false alarm"""
    print("Marked as false alarm")
    return jsonify({'success': True})

@app.route('/api/escalate', methods=['POST'])
def escalate():
    """Escalate incident"""
    print("Incident escalated")
    return jsonify({'success': True})

@app.route('/sample_evidence/<int:num>')
def sample_evidence(num):
    """Generate sample evidence images"""
    import numpy as np
    
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    
    if num == 1:
        img[:, :] = [50, 50, 150]
        text = 'Incident Evidence #1'
    else:
        img[:, :] = [150, 50, 50]
        text = 'Incident Evidence #2'
    
    cv2.putText(img, text, (150, 200), 
               cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(img, time.strftime('%Y-%m-%d %H:%M:%S'), (180, 280), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
    
    ret, buffer = cv2.imencode('.jpg', img)
    return Response(buffer.tobytes(), mimetype='image/jpeg')

@app.route('/evidence/<path:filename>')
def serve_evidence(filename):
    """Serve evidence files from evidence folder"""
    from flask import send_from_directory
    return send_from_directory('evidence', filename)

@app.route('/')
def index():
    """Test page"""
    return '''
    <html>
        <body>
            <h1>Safety Console Backend</h1>
            <p>Backend is running!</p>
            <p><a href="/video_feed">View Camera Feed</a></p>
        </body>
    </html>
    '''

if __name__ == '__main__':
    print("=" * 50)
    print("Safety Console Backend Starting...")
    print("=" * 50)
    print(f"Server: http://localhost:5055")
    print(f"Video Feed: http://localhost:5055/video_feed")
    print(f"API Status: http://localhost:5055/api/status")
    print("=" * 50)
    print("\nPress Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=5055, debug=True, threaded=True)
