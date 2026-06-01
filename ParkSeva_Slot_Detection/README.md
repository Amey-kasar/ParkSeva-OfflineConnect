# ParkSeva — Parking Slot Detection

Smart parking slot occupancy detection using image comparison (ROI-based).

## Project Structure

```
ParkSeva_Slot_Detection/
├── venv/                   # Python virtual environment
├── slot_detection_roi.py   # Main detection script
├── empty_slots.jpg         # Reference image — all slots empty
├── parking_current.jpg     # Current image — slots may have toy cars
└── README.md
```

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install opencv-python numpy
```

## Usage

1. Place `empty_slots.jpg` (all slots empty) and `parking_current.jpg` (current state) in the project folder.
2. Adjust the `SLOTS` coordinates in `slot_detection_roi.py` to match your image.
3. Run:

```bash
python3 slot_detection_roi.py
```

## Adjusting Slot Coordinates

Edit the `SLOTS` list in `slot_detection_roi.py`:

```python
SLOTS = [
    (60,  200, 120, 120),   # Slot 1 — left   (x, y, width, height)
    (220, 200, 120, 120),   # Slot 2 — center
    (380, 200, 120, 120),   # Slot 3 — right
]
```

Use any image viewer that shows pixel coordinates to find the correct values.

## Detection Logic

- Converts both images to grayscale.
- For each slot ROI, computes the absolute pixel difference.
- If changed pixels exceed `CHANGE_THRESHOLD` → **OCCUPIED** (red rectangle).
- Otherwise → **EMPTY** (green rectangle).

## Gate Control

| Condition                       | Output                |
|---------------------------------|-----------------------|
| Slot 1 AND Slot 2 both occupied | `OPEN EXPANSION GATE` |
| Otherwise                       | `GATE CLOSED`         |
