import os
from ultralytics import YOLO

DATA_YAML = os.path.join(os.path.dirname(__file__), "falling_datase-1", "data.yaml")
assert os.path.isfile(DATA_YAML), f"data.yaml not found at {DATA_YAML}"

model = YOLO("yolov8n.pt")  # CPU-friendly

model.train(
    data=DATA_YAML,
    epochs=40,        # bump later if needed
    imgsz=640,
    batch=8,          # lower to 4 if RAM is tight
    workers=0,        # macOS CPU: safer
    name="fall_detector",
    pretrained=True
)

print("\nBest weights -> runs/detect/fall_detector/weights/best.pt")
