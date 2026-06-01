# camera_stream.py
import cv2
import platform

def open_mac_camera(index=0, width=1280, height=720, fps=30):
    # Use AVFoundation on macOS for stable webcam capture
    backend = cv2.CAP_AVFOUNDATION if platform.system() == "Darwin" else cv2.CAP_ANY
    cap = cv2.VideoCapture(index, backend)

    # Optional: set common capture properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    cap.set(cv2.CAP_PROP_FPS,          fps)

    if not cap.isOpened():
        raise RuntimeError(f"Error: Could not open Mac camera at index {index}.")

    return cap

def main():
    try:
        cap = open_mac_camera(index=0)  # change to 1 if you have an external webcam
    except RuntimeError as e:
        print(e)
        return

    cv2.namedWindow('Mac Camera', cv2.WINDOW_NORMAL)
    while True:
        ok, frame = cap.read()
        if not ok:
            print("Warning: Failed to read a frame from the camera.")
            break

        cv2.imshow('Mac Camera', frame)

        # Press 'q' to quit or close the window to exit
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or cv2.getWindowProperty('Mac Camera', cv2.WND_PROP_VISIBLE) < 1:
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
