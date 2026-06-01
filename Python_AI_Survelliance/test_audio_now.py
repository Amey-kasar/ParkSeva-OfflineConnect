"""Quick mic + keyword detection test. Run: python test_audio_now.py"""
import speech_recognition as sr
import re

KEYPHRASES = ["help me", "call ambulance", "rape", "accident", "madad", "bachao", "ambulance"]

r = sr.Recognizer()
r.dynamic_energy_threshold = False
r.energy_threshold = 200
r.pause_threshold = 1.0

print("[TEST] Microphone list:")
for i, name in enumerate(sr.Microphone.list_microphone_names()):
    print(f"  [{i}] {name}")

print("\n[TEST] Listening for 8 seconds... say 'help me' now")
with sr.Microphone() as mic:
    r.adjust_for_ambient_noise(mic, duration=1.0)
    print(f"[TEST] Energy threshold after calibration: {r.energy_threshold}")
    try:
        audio = r.listen(mic, phrase_time_limit=8, timeout=10)
        print("[TEST] Got audio, recognizing...")
        for lang in ["en-IN", "en-US"]:
            try:
                text = r.recognize_google(audio, language=lang)
                print(f"[TEST] Recognized ({lang}): '{text}'")
                t = text.lower()
                t = re.sub(r"[^a-z0-9\s]", " ", t)
                t = re.sub(r"\s+", " ", t).strip()
                for k in KEYPHRASES:
                    if k in t:
                        print(f"[TEST] ✓ KEYWORD MATCHED: '{k}'")
                break
            except sr.UnknownValueError:
                print(f"[TEST] Could not understand audio ({lang})")
            except sr.RequestError as e:
                print(f"[TEST] API error ({lang}): {e}")
    except sr.WaitTimeoutError:
        print("[TEST] No speech detected within timeout")
