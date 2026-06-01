# event_models.py
# Drop-in detectors for ParkSeva AI safety layer
# - FallDetector (YOLO) with frame smoothing
# - PoseFallHealthDetector (MoveNet Thunder @ 256x256) for 'medical' escalation
# - ViolenceDetector (YOLO, optional)

import os
import time
from collections import deque
import numpy as np

# ---------- YOLO wrapper (shared) ----------
try:
    from ultralytics import YOLO
    _YOLO_AVAILABLE = True
except Exception:
    YOLO = None
    _YOLO_AVAILABLE = False


class YOLOWrapper:
    """Small helper to get (label, conf) from a YOLO model per frame."""
    def __init__(self, weights_path: str):
        if not _YOLO_AVAILABLE:
            raise RuntimeError("Ultralytics YOLO is not available. Install 'ultralytics'.")
        self.model = YOLO(weights_path)

    def detect_labels(self, frame, conf_thresh=0.5):
        out = self.model(frame, verbose=False)
        labels = []
        for r in out:
            names = r.names  # dict: class_id -> class_name
            if getattr(r, "boxes", None) is None:
                continue
            cls = r.boxes.cls.tolist() if hasattr(r.boxes, "cls") else []
            conf = r.boxes.conf.tolist() if hasattr(r.boxes, "conf") else []
            for c, p in zip(cls, conf):
                if p >= conf_thresh:
                    labels.append((names.get(int(c), str(int(c))).lower(), float(p)))
        return labels


# ---------- YOLO FallDetector with smoothing ----------
class FallDetector:
    """
    YOLO-based fall detector.
    Emits True only when at least FALL_FRAMES consecutive frames include
    a 'fall'/'fallen'/'lying' label above FALL_CONF.
    """
    def __init__(self, weights_path: str):
        self.yolo = YOLOWrapper(weights_path)
        self.conf_thresh = float(os.getenv("FALL_CONF", "0.5"))
        self.min_frames  = int(os.getenv("FALL_FRAMES", "6"))
        self._consec_hits = 0

    def detect_fall(self, frame) -> bool:
        labels = self.yolo.detect_labels(frame, conf_thresh=self.conf_thresh)
        is_fall_frame = any(
            ("fall" in name or "lying" in name or "fallen" in name)
            for name, _ in labels
        )
        if is_fall_frame:
            self._consec_hits += 1
        else:
            self._consec_hits = 0
        return self._consec_hits >= self.min_frames


# ---------- Pose-based fall + medical escalation (Thunder 256x256) ----------
def _pose_enabled() -> bool:
    return os.getenv("USE_TF_POSE", "false").lower() == "true"


if _pose_enabled():
    import cv2
    import tensorflow as tf
    import tensorflow_hub as hub

    def _angle_deg(p1, p2):
        # angle of vector p1->p2 against vertical axis (0 deg = near vertical)
        dy = p2[1] - p1[1]
        dx = p2[0] - p1[0]
        ang = np.degrees(np.arctan2(dx, dy))  # swap so 'vertical' is the reference
        return abs(ang)

    def _motion_level(kp_hist):
        if len(kp_hist) < 2:
            return 0.0
        _, first = kp_hist[0]
        _, last  = kp_hist[-1]
        disp = np.linalg.norm(last[:, :2] - first[:, :2], axis=1)  # normalized (0..1)
        return float(np.nanmean(disp))

    class PoseFallHealthDetector:
        """
        Lightweight fall + health emergency detector using MoveNet keypoints and temporal rules.
        Uses MoveNet Thunder at 256x256 to avoid shape mismatch errors.
        Emits:
          - "fall": when horizontal posture persists for N frames
          - "medical": when immobile for POSE_IMMOBILE_SEC after a fall
        """
        def __init__(self):
            self.movenet_url = os.getenv(
                "MOVENET_URL",
                "https://tfhub.dev/google/movenet/singlepose/thunder/4"
            )
            self.input_size = int(os.getenv("MOVENET_INPUT", "256"))
            self.model = hub.load(self.movenet_url).signatures['serving_default']

            # thresholds (env-tunable)
            self.min_kp_conf            = float(os.getenv("POSE_MIN_KP_CONF", "0.35"))
            self.horiz_angle_thresh     = float(os.getenv("POSE_HORIZ_ANGLE", "32.0"))
            self.flatness_ratio_thresh  = float(os.getenv("POSE_FLAT_RATIO", "0.70"))
            self.persist_frames         = int(os.getenv("POSE_PERSIST_FRAMES", "8"))

            self.immobile_sec_after_fall = float(os.getenv("POSE_IMMOBILE_SEC", "10.0"))
            self.motion_thresh          = float(os.getenv("POSE_MOTION_THRESH", "0.010"))

            fps_assume  = int(os.getenv("POSE_FPS_ASSUME", "12"))
            max_hist_s  = float(os.getenv("POSE_MAX_HISTORY_SEC", "8.0"))
            self.kp_hist = deque(maxlen=int(max_hist_s * fps_assume))

            self.state = "normal"    # normal | fallen
            self.last_fall_ts = 0.0
            self._fall_streak = 0
            self._last_emit_ts = 0.0
            self._emit_cooldown_sec = float(os.getenv("POSE_EMIT_COOLDOWN", "6.0"))

            # EMA smoothing
            self.ema_alpha = float(os.getenv("POSE_EMA", "0.4"))
            self.ang_ema = None
            self.flat_ema = None

        def _infer(self, frame_bgr):
            img = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            h, w = img.shape[:2]
            resized = tf.image.resize_with_pad(tf.expand_dims(img, 0), self.input_size, self.input_size)
            resized = tf.cast(resized, dtype=tf.int32)
            out = self.model(resized)['output_0'].numpy()  # (1,1,17,3), (y,x,conf)
            kp = out[0, 0, :, :]
            kp_xyc = np.stack([kp[:, 1], kp[:, 0], kp[:, 2]], axis=1)  # (x,y,conf) normalized
            return kp_xyc, (w, h)

        def _torso_metrics(self, kp_xyc):
            # MoveNet indices: 5=L shoulder, 6=R shoulder, 11=L hip, 12=R hip
            ls, cs_ls = kp_xyc[5, :2], kp_xyc[5, 2]
            rs, cs_rs = kp_xyc[6, :2], kp_xyc[6, 2]
            lh, cs_lh = kp_xyc[11, :2], kp_xyc[11, 2]
            rh, cs_rh = kp_xyc[12, :2], kp_xyc[12, 2]

            conf_torso = min(cs_ls, cs_rs, cs_lh, cs_rh)
            if conf_torso < self.min_kp_conf:
                return None, None

            shoulder_mid = (ls + rs) / 2.0
            hip_mid      = (lh + rh) / 2.0

            # torso angle from vertical (0 ~ upright, large ~ horizontal)
            dy = shoulder_mid[1] - hip_mid[1]
            dx = shoulder_mid[0] - hip_mid[0]
            ang = abs(np.degrees(np.arctan2(dx, dy)))

            xs = [ls[0], rs[0], lh[0], rh[0]]
            ys = [ls[1], rs[1], lh[1], rh[1]]
            width  = max(xs) - min(xs) + 1e-6
            height = max(ys) - min(ys) + 1e-6
            flat_ratio = width / height
            return ang, flat_ratio

        def _ema(self, prev, val):
            if prev is None:
                return val
            a = self.ema_alpha
            return a * val + (1 - a) * prev

        def detect(self, frame_bgr):
            """
            Returns:
              None        -> no event
              "fall"      -> likely fall detected (rate-limited)
              "medical"   -> post-fall immobility detected (rate-limited)
            """
            now = time.time()
            kp_xyc, _ = self._infer(frame_bgr)
            self.kp_hist.append((now, kp_xyc))

            ang, flat = self._torso_metrics(kp_xyc) if kp_xyc is not None else (None, None)
            if ang is None:
                self._fall_streak = 0
                return None

            # EMA smoothing
            self.ang_ema  = self._ema(self.ang_ema, ang)
            self.flat_ema = self._ema(self.flat_ema, flat)
            A = self.ang_ema
            F = self.flat_ema

            is_horizontal = (A is not None and F is not None and A >= self.horiz_angle_thresh and F >= self.flatness_ratio_thresh)

            # frame persistence for fall confirmation
            if is_horizontal:
                self._fall_streak += 1
            else:
                # slow decay to avoid one-frame dropouts
                self._fall_streak = max(0, self._fall_streak - 1)

            if self.state == "normal" and self._fall_streak >= self.persist_frames:
                self.state = "fallen"
                self.last_fall_ts = now
                self._fall_streak = 0
                if now - self._last_emit_ts > self._emit_cooldown_sec:
                    self._last_emit_ts = now
                    return "fall"

            # medical escalation: immobile after fallen
            if self.state == "fallen":
                if now - self.last_fall_ts >= self.immobile_sec_after_fall:
                    motion = _motion_level(self.kp_hist)
                    if motion <= self.motion_thresh:
                        self.state = "normal"
                        if now - self._last_emit_ts > self._emit_cooldown_sec:
                            self._last_emit_ts = now
                            return "medical"
                    else:
                        # movement detected; exit fallen
                        self.state = "normal"

            return None
else:
    # Stub so imports won't fail when pose is disabled
    class PoseFallHealthDetector:
        def __init__(self): ...
        def detect(self, frame_bgr):
            return None


# ---------- Optional YOLO ViolenceDetector ----------
class ViolenceDetector:
    """Simple YOLO-based 'violence' detector (class names must include fight/assault/violence)."""
    def __init__(self, weights_path: str):
        self.yolo = YOLOWrapper(weights_path)
        self.conf_thresh = float(os.getenv("VIOLENCE_CONF", "0.5"))

    def detect_violence(self, frame):
        labels = self.yolo.detect_labels(frame, conf_thresh=self.conf_thresh)
        for name, p in labels:
            if "fight" in name or "assault" in name or "violence" in name:
                return "violence"
        return None
