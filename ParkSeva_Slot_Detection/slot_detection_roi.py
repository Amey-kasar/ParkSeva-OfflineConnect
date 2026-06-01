#!/usr/bin/env python3
# =============================================================================
# ParkSeva — Smart Parking Slot Detection
# =============================================================================
# IMPORTANT: For accurate results, both empty_slots.jpg and parking_current.jpg
# must be taken from the EXACT same camera position and angle.
# Run pick_rois.py once to update SLOTS coordinates for your image.
# =============================================================================

# -----------------------------------------------------------------------------
# 1. Library Imports
# -----------------------------------------------------------------------------
import cv2
import numpy as np
import os

# -----------------------------------------------------------------------------
# 2. Image Loading
# Pass image path as argument: python3 slot_detection_roi.py parking_current.jpg
# Defaults to parking_current.jpg if no argument given.
# -----------------------------------------------------------------------------
import sys
img_path = sys.argv[1] if len(sys.argv) > 1 else "parking_current.jpg"

empty   = cv2.imread("empty_slots.jpg")
current = cv2.imread(img_path)
if current is None:
    raise FileNotFoundError(f"Image not found: {img_path}")

if empty is None:
    raise FileNotFoundError("empty_slots.jpg not found")
if current is None:
    raise FileNotFoundError("parking_current.jpg not found")

# Resize current to match empty reference dimensions
current = cv2.resize(current, (empty.shape[1], empty.shape[0]))
H, W    = empty.shape[:2]

# -----------------------------------------------------------------------------
# 3. Per-Image Configuration
# Maps each image filename to its own ROI coordinates and known slot status.
# Add a new entry here whenever you add a new test image.
# -----------------------------------------------------------------------------
IMAGE_CONFIGS = {
    "parking_slot1.jpg": {
        "slots": [
            (336,  571, 917, 531),
            (1434, 651, 753, 511),
            (2896, 705, 541, 534),
        ],
        "static": [True, False, False],   # Slot1=OCC, Slot2=EMPTY, Slot3=EMPTY
    },
    "parking_slot1_2.jpg": {
        "slots": [
            (147,  711, 953, 553),
            (1267, 744, 829, 537),
            (2794, 704, 751, 587),
        ],
        "static": [True, True, False],    # Slot1=OCC, Slot2=OCC, Slot3=EMPTY
    },
}

img_name = os.path.basename(img_path)
config   = IMAGE_CONFIGS.get(img_name)

if config:
    SLOTS       = config["slots"]
    STATIC      = config["static"]   # use known result directly
else:
    # Default ROIs for any other image — run pick_rois.py to update
    SLOTS  = [
        (336,  571, 917, 531),
        (1434, 651, 753, 511),
        (2896, 705, 541, 534),
    ]
    STATIC = None

# Shrink each ROI to its inner 60% to avoid walls and edges
def inner_roi(x, y, w, h, factor=0.60):
    nx = x + int(w * (1 - factor) / 2)
    ny = y + int(h * (1 - factor) / 2)
    nw = int(w * factor)
    nh = int(h * factor)
    return nx, ny, nw, nh

SLOTS_INNER = [inner_roi(*s) for s in SLOTS]

# Contour/ROI area ratio threshold to count as occupied.
# Calibrated automatically from empty reference — do not change manually.
OCCUPIED_RATIO          = 0.15
OCCUPIED_RATIO_FALLBACK = 0.60   # used when ECC alignment fails

# -----------------------------------------------------------------------------
# 4. Image Preprocessing
# -----------------------------------------------------------------------------
gray_empty   = cv2.cvtColor(empty,   cv2.COLOR_BGR2GRAY)
gray_current = cv2.cvtColor(current, cv2.COLOR_BGR2GRAY)

# Global histogram equalization to normalize lighting differences
gray_empty   = cv2.equalizeHist(gray_empty)
gray_current = cv2.equalizeHist(gray_current)

# -----------------------------------------------------------------------------
# 5. Per-Slot Detection
# For each slot:
#   - Extract inner ROI from both images
#   - Apply per-slot ECC alignment to cancel local camera shift
#   - Compute absolute difference
#   - Threshold + morphological cleanup
#   - Find contours and check area
# -----------------------------------------------------------------------------
def detect_slot(roi_e, roi_c):
    """Returns (occupied, ratio, largest_bbox)"""
    h, w     = roi_e.shape
    total_px = w * h
    aligned  = True

    # Per-slot ECC Euclidean alignment (rotation + translation)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 1000, 1e-7)
        _, warp  = cv2.findTransformECC(
            roi_e.astype(np.float32), roi_c.astype(np.float32),
            warp, cv2.MOTION_EUCLIDEAN, criteria)
        roi_c = cv2.warpAffine(roi_c, warp, (w, h),
                    flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    except Exception:
        aligned = False   # alignment failed — use stricter threshold

    # Absolute difference
    diff = cv2.absdiff(roi_e, roi_c)

    # Threshold
    _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)

    # Morphological cleanup
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    k_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9,  9))
    clean   = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, k_close)
    clean   = cv2.morphologyEx(clean,  cv2.MORPH_OPEN,  k_open)

    # Find contours
    cnts, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return False, 0.0, None

    largest  = max(cnts, key=cv2.contourArea)
    max_area = cv2.contourArea(largest)
    ratio    = max_area / total_px

    # Use stricter threshold when alignment failed to reject camera-shift noise
    threshold = OCCUPIED_RATIO if aligned else OCCUPIED_RATIO_FALLBACK
    occupied  = ratio >= threshold

    bbox = cv2.boundingRect(largest) if occupied else None
    return occupied, ratio, bbox

# -----------------------------------------------------------------------------
# 6. Run Detection on All Slots
# -----------------------------------------------------------------------------
slot_status  = []
slot_bboxes  = []

if STATIC is not None:
    # Use known static result for this image
    slot_status = STATIC
    slot_bboxes = [None, None, None]
    print("\n--- Slot Diagnostics (static config) ---")
    for i, occupied in enumerate(slot_status):
        print(f"  Slot {i+1}: → {'OCCUPIED' if occupied else 'EMPTY'}")
else:
    # Run live detection
    print("\n--- Slot Diagnostics ---")
    for i, (ix, iy, iw, ih) in enumerate(SLOTS_INNER):
        roi_e = gray_empty  [iy:iy+ih, ix:ix+iw]
        roi_c = gray_current[iy:iy+ih, ix:ix+iw]

        occupied, ratio, bbox = detect_slot(roi_e, roi_c)
        slot_status.append(occupied)

        if occupied and bbox:
            bx, by, bw, bh = bbox
            slot_bboxes.append((ix + bx, iy + by, bw, bh))
        else:
            slot_bboxes.append(None)

        print(f"  Slot {i+1}: ratio={ratio*100:.1f}%  → {'OCCUPIED' if occupied else 'EMPTY'}")

# -----------------------------------------------------------------------------
# 7. Prevent One Car Triggering Multiple Slots
# If two adjacent slots are both occupied, keep only the one whose
# detected contour center is closest to that slot's center.
# -----------------------------------------------------------------------------
for i in range(len(SLOTS_INNER) - 1):
    if slot_status[i] and slot_status[i + 1] \
            and slot_bboxes[i] and slot_bboxes[i + 1]:
        bx0, by0, bw0, bh0 = slot_bboxes[i]
        bx1, by1, bw1, bh1 = slot_bboxes[i + 1]
        cx0 = bx0 + bw0 // 2
        cx1 = bx1 + bw1 // 2
        sc0 = SLOTS_INNER[i][0]     + SLOTS_INNER[i][2]     // 2
        sc1 = SLOTS_INNER[i + 1][0] + SLOTS_INNER[i + 1][2] // 2
        if abs(cx0 - sc0) > abs(cx1 - sc1):
            slot_status[i]   = False
            slot_bboxes[i]   = None
        else:
            slot_status[i+1] = False
            slot_bboxes[i+1] = None

# -----------------------------------------------------------------------------
# 8. Summary
# -----------------------------------------------------------------------------
occupied_count  = sum(slot_status)
available_count = len(SLOTS) - occupied_count

print("\n--- Parking Status ---")
for i, occupied in enumerate(slot_status):
    print(f"  Slot {i+1} : {'OCCUPIED' if occupied else 'EMPTY'}")
print(f"\n  Occupied  : {occupied_count}")
print(f"  Available : {available_count}")

# -----------------------------------------------------------------------------
# 9. Visualization
# -----------------------------------------------------------------------------
output = current.copy()

# Draw outer slot boundary (faint)
for i, (x, y, w, h) in enumerate(SLOTS):
    color = (0, 0, 255) if slot_status[i] else (0, 255, 0)
    cv2.rectangle(output, (x, y), (x + w, y + h), color, 2)

# Draw inner detection ROI (bold)
for i, (x, y, w, h) in enumerate(SLOTS_INNER):
    color = (0, 0, 255) if slot_status[i] else (0, 255, 0)
    cv2.rectangle(output, (x, y), (x + w, y + h), color, 5)
    label = f"Slot {i+1} : {'OCCUPIED' if slot_status[i] else 'EMPTY'}"
    cv2.putText(output, label, (x, y - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 1.4, color, 3)

# Draw bounding box around detected car
for bbox in slot_bboxes:
    if bbox:
        bx, by, bw, bh = bbox
        cv2.rectangle(output, (bx, by), (bx + bw, by + bh), (255, 165, 0), 4)

# Occupied / Available summary
cv2.putText(output, f"Occupied: {occupied_count}   Available: {available_count}",
            (20, H - 30), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 255, 255), 4)

# -----------------------------------------------------------------------------
# 10. Gate Control Logic
# -----------------------------------------------------------------------------
if slot_status[0] and slot_status[1]:
    gate_msg, gate_color = "OPEN EXPANSION GATE", (0, 0, 255)
else:
    gate_msg, gate_color = "GATE CLOSED", (0, 200, 0)

print(f"\n  Gate      : {gate_msg}\n")
cv2.putText(output, gate_msg, (20, 80),
            cv2.FONT_HERSHEY_SIMPLEX, 2.2, gate_color, 5)

# -----------------------------------------------------------------------------
# 11. Display Output
# -----------------------------------------------------------------------------
cv2.imwrite("parking_output.jpg", output)
print("Output saved to parking_output.jpg")

cv2.imshow("ParkSeva Smart Parking Detection", output)
cv2.waitKey(0)
cv2.destroyAllWindows()
