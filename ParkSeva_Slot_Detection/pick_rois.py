#!/usr/bin/env python3
# =============================================================================
# ParkSeva — ROI Coordinate Picker
# Click on the image to find exact pixel coordinates for slot ROIs.
# Run this once, note the coordinates, then update slot_detection_roi.py.
# =============================================================================
import cv2
import numpy as np

import sys
img_path = sys.argv[1] if len(sys.argv) > 1 else "parking_current.jpg"
image = cv2.imread(img_path)
if image is None:
    raise FileNotFoundError(f"Image not found: {img_path}")
H, W  = image.shape[:2]

# Scale down for display (fits on screen)
SCALE = 1200 / W
display = cv2.resize(image, (1200, int(H * SCALE)))

clicks = []

def on_click(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        # Convert display coords back to original image coords
        ox, oy = int(x / SCALE), int(y / SCALE)
        clicks.append((ox, oy))
        cv2.circle(display, (x, y), 6, (0, 255, 255), -1)
        cv2.putText(display, f"({ox},{oy})", (x + 8, y - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
        cv2.imshow("ROI Picker — click top-left then bottom-right of each slot floor", display)
        print(f"  Click {len(clicks)}: original coords = ({ox}, {oy})")

cv2.imshow("ROI Picker — click top-left then bottom-right of each slot floor", display)
cv2.setMouseCallback("ROI Picker — click top-left then bottom-right of each slot floor", on_click)

print("Instructions:")
print("  Click TOP-LEFT corner of Slot 1 floor, then BOTTOM-RIGHT corner of Slot 1 floor.")
print("  Repeat for Slot 2 and Slot 3.")
print("  Press Q when done.\n")

cv2.waitKey(0)
cv2.destroyAllWindows()

print("\n--- Collected coordinates ---")
for i, (x, y) in enumerate(clicks):
    print(f"  Click {i+1}: ({x}, {y})")

if len(clicks) >= 6:
    print("\n--- Paste these into slot_detection_roi.py SLOTS list ---")
    for i in range(3):
        x1, y1 = clicks[i * 2]
        x2, y2 = clicks[i * 2 + 1]
        w, h   = x2 - x1, y2 - y1
        print(f"  Slot {i+1}: ({x1}, {y1}, {w}, {h})")
