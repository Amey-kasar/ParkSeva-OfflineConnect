# Performance Optimization Guide

## Camera Performance Improvements

### What Changed:
1. **Reduced default resolution**: 1280x720 → 640x480 (4x fewer pixels)
2. **Frame skipping for detection**: Process every 3rd frame (configurable)
3. **Buffer optimization**: Minimized camera buffer lag
4. **Stream optimization**: Adjustable JPEG quality, auto-resize large frames
5. **Removed throttling**: Better real-time streaming
6. **Increased stream FPS**: 18 → 25 FPS

### Environment Variables for Tuning:

```bash
# Camera Resolution (lower = faster)
CAM_WIDTH=640          # Default: 640 (was 1280)
CAM_HEIGHT=480         # Default: 480 (was 720)

# Detection Frame Skip (higher = faster, less accurate)
DETECTION_FRAME_SKIP=3 # Process every 3rd frame (default: 3)
                       # 1 = every frame (slow, accurate)
                       # 5 = every 5th frame (fast, less accurate)

# Stream Quality (lower = faster, smaller bandwidth)
STREAM_JPEG_QUALITY=75 # Default: 75 (range: 0-100)
                       # 50 = fast, lower quality
                       # 90 = slower, high quality

# Stream FPS
GUI_STREAM_FPS=25      # Default: 25 (was 18)

# Monitor Loop Delay
MONITOR_LOOP_DELAY=0.05 # Default: 0.05 seconds
```

### Performance Profiles:

#### High Performance (Recommended)
```bash
CAM_WIDTH=640
CAM_HEIGHT=480
DETECTION_FRAME_SKIP=3
STREAM_JPEG_QUALITY=75
GUI_STREAM_FPS=25
```

#### Maximum Speed (Lower Quality)
```bash
CAM_WIDTH=480
CAM_HEIGHT=360
DETECTION_FRAME_SKIP=5
STREAM_JPEG_QUALITY=60
GUI_STREAM_FPS=30
```

#### High Quality (Slower)
```bash
CAM_WIDTH=1280
CAM_HEIGHT=720
DETECTION_FRAME_SKIP=2
STREAM_JPEG_QUALITY=85
GUI_STREAM_FPS=20
```

### Expected Improvements:
- **Stream latency**: Reduced by ~60%
- **CPU usage**: Reduced by ~50% (with frame skipping)
- **Bandwidth**: Reduced by ~40% (with lower resolution)
- **Frame rate**: Increased from 18 to 25 FPS

### Restart Required:
After changing .env variables, restart the Flask backend:
```bash
python3 main.py
```
