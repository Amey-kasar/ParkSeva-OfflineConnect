# debug_pose.py — live MoveNet skeleton viewer (no Twilio, no alerts)
import os, platform, time
import cv2
import numpy as np

os.environ["USE_TF_POSE"] = "true"  # force-enable for this viewer

from event_models import PoseFallHealthDetector

# MoveNet edges for drawing (MoveNet indexing)
EDGES = [
    (5,6), (5,7), (7,9), (6,8), (8,10),
    (5,11), (6,12), (11,12),
    (11,13), (13,15), (12,14), (14,16),
    (0,1), (1,2), (2,3), (3,4)  # face/eyes – optional
]

def draw_skeleton(frame, kp_xyc, conf_thresh=0.25, color=(255, 0, 0)):
    """kp_xyc: (17,3) normalized (x,y,conf)"""
    h, w = frame.shape[:2]
    pts = []
    for i in range(kp_xyc.shape[0]):
        x, y, c = kp_xyc[i]
        if c >= conf_thresh:
            px, py = int(x * w), int(y * h)
            pts.append((px, py, c))
            cv2.circle(frame, (px, py), 3, color, -1)
        else:
            pts.append(None)

    # connect edges
    for a, b in EDGES:
        pa = pts[a]; pb = pts[b]
        if pa is not None and pb is not None:
            cv2.line(frame, (pa[0], pa[1]), (pb[0], pb[1]), color, 2)

def main():
    # open Mac webcam
    backend = cv2.CAP_AVFOUNDATION if platform.system() == "Darwin" else cv2.CAP_ANY
    cap = cv2.VideoCapture(0, backend)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 15)

    if not cap.isOpened():
        print("Could not open camera 0")
        return

    det = PoseFallHealthDetector()  # uses MoveNet Thunder 256x256 per your event_models.py

    # We’ll reuse the detector’s private _infer for visualization (fine for debugging)
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        # get keypoints and draw
        try:
            kp_xyc, _ = det._infer(frame)  # (17,3) normalized
            draw_skeleton(frame, kp_xyc, conf_thresh=0.25, color=(255, 0, 0))
            # Optional: show state/result
            evt = det.detect(frame)  # run logic too
            if evt:
                cv2.putText(frame, f"EVENT: {evt}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,0), 2)
        except Exception as e:
            cv2.putText(frame, f"Pose error: {str(e)[:40]}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,0,255), 2)

        cv2.imshow("MoveNet Thunder — Skeleton Viewer", frame)
        k = cv2.waitKey(1) & 0xFF
        if k == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
