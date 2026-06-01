# audio_stream.py
import os
from audio_module import AudioMonitor

# Key phrases (English + Hindi)
PHRASES = ["help me", "call ambulance", "rape", "accident", "madad", "bachao", "ambulance"]

# Use AUDIO_URL from .env; fallback to local test stream
AUDIO_URL = os.getenv("AUDIO_URL")

_monitor = AudioMonitor(PHRASES, AUDIO_URL)

def listen_from_camera():
    """
    Returns:
      ("audio", severity, text) on detection
      or None if nothing detected.
    """
    return _monitor.check_audio_emergency()

if __name__ == "__main__":
    evt = listen_from_camera()
    print(evt or "No audio event detected.")
