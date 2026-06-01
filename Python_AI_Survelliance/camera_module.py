# camera_module.py
import os
import platform
import time
import threading
import cv2

# Detectors from event_models.py
# - PoseFallHealthDetector: emits "fall"/"medical" (if USE_TF_POSE=true), else returns None
# - FallDetector: YOLO-based fall (needs FALL_WEIGHTS)
# - ViolenceDetector: YOLO-based violence (needs VIOLENCE_WEIGHTS)
from event_models import PoseFallHealthDetector
try:
    from event_models import FallDetector, ViolenceDetector
except Exception:
    FallDetector = None
    ViolenceDetector = None


def _get_env_bool(name: str, default: bool = False) -> bool:
    v = os.getenv(name, str(default).lower()).strip().lower()
    return v in ("1", "true", "yes", "y", "on")


class CameraMonitor:
    """
    Unified camera/stream reader with optional detectors.

    - Keeps `last_frame` so other threads (viewer/snapshot) can access it.
    - Detectors are optional; if weights or TF pose are not configured, they're skipped.
    - Preview is optional and lightweight; the full-screen view should be handled by main.py's viewer_loop().
    """

    def __init__(self, source, fall_model_path=None, violence_model_path=None):
        self.cap = None
        self.source = source
        self.last_frame = None
        self._lock = threading.Lock()
        self._frame_skip = int(os.getenv("DETECTION_FRAME_SKIP", "3"))  # Process every Nth frame
        self._frame_count = 0
        self._running = False
        self._capture_thread = None

        # ---- Camera config from env (overridable) ----
        self.cam_width  = int(os.getenv("CAM_WIDTH", 640))  # Reduced default
        self.cam_height = int(os.getenv("CAM_HEIGHT", 480))  # Reduced default
        self.cam_fps    = float(os.getenv("CAM_FPS", "30"))

        # ---- Preview knobs (optional, for debugging) ----
        self.show_preview = _get_env_bool("SHOW_PREVIEW", False)
        self.preview_win  = "ParkSeva Safety Preview"
        self.preview_fps  = float(os.getenv("PREVIEW_FPS", "12"))
        self.process_fps  = float(os.getenv("PROCESS_FPS", "0"))
        self._last_tick   = 0.0
        self._preview_inited = False
        self._preview_fullscreen = _get_env_bool("PREVIEW_FULLSCREEN", False)

        # ---- Open video source ----
        try:
            if isinstance(source, str) and source.startswith("mac:"):
                idx = int(source.split(":", 1)[1] or 0)
                backend = cv2.CAP_AVFOUNDATION if platform.system() == "Darwin" else cv2.CAP_ANY
                self.cap = cv2.VideoCapture(idx, backend)
            else:
                # RTSP/HTTP/FILE
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
                self.cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)

            if not self.cap or not self.cap.isOpened():
                print(f"[Camera] Could not open stream: {source}")
                self.cap = None
            else:
                # apply basic properties (best-effort)
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  self.cam_width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.cam_height)
                if self.cam_fps > 0:
                    self.cap.set(cv2.CAP_PROP_FPS, self.cam_fps)
                # Performance optimizations
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer lag
                self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))  # Use MJPEG codec
        except Exception as e:
            print(f"[Camera] init error: {e}")
            self.cap = None

        # ---- Detectors (optional) ----
        self.pose_det = None
        self.fall_det = None
        self.viol_det = None

        # Pose fall/medical (requires USE_TF_POSE=true)
        try:
            self.pose_det = PoseFallHealthDetector()
            # If USE_TF_POSE=false, PoseFallHealthDetector is a stub and returns None.
        except Exception as e:
            print(f"[Detector] PoseFallHealthDetector init error: {e}")
            self.pose_det = None

        # YOLO fall (needs weights)
        if fall_model_path and FallDetector:
            try:
                self.fall_det = FallDetector(fall_model_path)
                print("[Detector] YOLO FallDetector ready")
            except Exception as e:
                print(f"[Detector] FallDetector init error: {e}")
                self.fall_det = None
        elif fall_model_path and not FallDetector:
            print("[Detector] FallDetector unavailable (ultralytics not imported)")

        # YOLO violence (needs weights)
        if violence_model_path and ViolenceDetector:
            try:
                self.viol_det = ViolenceDetector(violence_model_path)
                print("[Detector] YOLO ViolenceDetector ready")
            except Exception as e:
                print(f"[Detector] ViolenceDetector init error: {e}")
                self.viol_det = None
        elif violence_model_path and not ViolenceDetector:
            print("[Detector] ViolenceDetector unavailable (ultralytics not imported)")
        
        # Start continuous frame capture thread
        self._start_capture_thread()

    # ---------- Frame IO ----------
    def _start_capture_thread(self):
        """Start background thread for continuous frame capture."""
        if not self.cap:
            return
        self._running = True
        self._capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._capture_thread.start()
    
    def _capture_loop(self):
        """Continuously capture frames in background."""
        while self._running:
            if self.cap:
                ok, frame = self.cap.read()
                if ok:
                    with self._lock:
                        self.last_frame = frame
            time.sleep(0.001)  # Minimal delay
    
    def read_frame(self):
        """Read one frame from the source and update last_frame."""
        return self.get_last_frame()

    def get_last_frame(self):
        """Return the most recent frame (may be None initially)."""
        with self._lock:
            return self.last_frame

    # ---------- Main detector entry ----------
    def check_camera_events(self):
        """
        Returns:
          - "medical" | "fall" | "violence" | None
        """
        frame = self.read_frame()
        if frame is None:
            return None

        # Skip frames for detection to improve performance
        self._frame_count += 1
        if self._frame_count % self._frame_skip != 0:
            return None

        # 1) Pose medical/fall (if enabled)
        if self.pose_det:
            try:
                evt = self.pose_det.detect(frame)  # "fall" | "medical" | None
                if evt in ("medical", "fall"):
                    self._preview(frame, f"POSE: {evt}")
                    return evt
            except Exception as e:
                print(f"[Detect] pose error: {e}")

        # 2) YOLO Fall (if enabled)
        if self.fall_det:
            try:
                if self.fall_det.detect_fall(frame):
                    self._preview(frame, "YOLO: fall")
                    return "fall"
            except Exception as e:
                print(f"[Detect] yolo-fall error: {e}")

        # 3) YOLO Violence (if enabled)
        if self.viol_det:
            try:
                lab = self.viol_det.detect_violence(frame)  # "violence" | None
                if lab:
                    self._preview(frame, "YOLO: violence")
                    return lab
            except Exception as e:
                print(f"[Detect] yolo-violence error: {e}")

        # Optional passive preview
        self._preview(frame, "OK")
        return None

    # ---------- Preview helpers (debug only; full-screen is handled in main.py) ----------
    def _ensure_preview_window(self):
        if not self.show_preview or self._preview_inited:
            return
        cv2.namedWindow(self.preview_win, cv2.WINDOW_NORMAL)
        if self._preview_fullscreen:
            cv2.setWindowProperty(self.preview_win, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
        self._preview_inited = True

    def _preview(self, frame, text):
        if not self.show_preview:
            return
        try:
            self._ensure_preview_window()
            vis = frame.copy()
            cv2.putText(vis, text, (16, 36),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 200, 0), 2, cv2.LINE_AA)
            cv2.imshow(self.preview_win, vis)
            cv2.waitKey(1)
        except Exception:
            pass

    def _throttle(self):
        # Removed throttling for better streaming performance
        pass

    # ---------- Cleanup ----------
    def release(self):
        try:
            self._running = False
            if self._capture_thread:
                self._capture_thread.join(timeout=1.0)
            if self.cap:
                self.cap.release()
            if self.show_preview:
                cv2.destroyAllWindows()
        except Exception:
            pass
