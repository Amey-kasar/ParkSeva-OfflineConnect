# audio_module.py
import ffmpeg
import speech_recognition as sr
import threading
import time
import re
import os

class AudioMonitor:
    def __init__(self, phrases, source):
        self.keyphrases = [p.lower().strip() for p in phrases if p and p.strip()]
        self.recognizer = sr.Recognizer()
        self.recognizer.dynamic_energy_threshold = False
        self.recognizer.pause_threshold = float(os.getenv("AUDIO_PAUSE_THRESHOLD", "1.0"))
        self.recognizer.non_speaking_duration = float(os.getenv("AUDIO_NON_SPEAKING_DURATION", "0.8"))
        self.recognizer.energy_threshold = int(os.getenv("AUDIO_ENERGY_THRESHOLD", "200"))
        self.languages = [
            l.strip() for l in os.getenv("AUDIO_LANGUAGES", "en-IN,en-US,hi-IN").split(",")
            if l.strip()
        ]
        self.mode = "rtsp"
        self.url = None
        self.mic_index = None
        self.mic_name = None
        self._mic_calibrated = False
        self._last_recognition_error_ts = 0.0
        self.last_detection = None
        self._lock = threading.Lock()
        self._running = False
        self._thread = None

        if isinstance(source, str) and source.startswith("mic:"):
            self.mode = "mic"
            spec = source.split(":", 1)[1] if ":" in source else "default"
            if spec.isdigit():
                self.mic_index = int(spec)
            elif spec and spec != "default":
                try:
                    names = sr.Microphone.list_microphone_names() or []
                    for i, n in enumerate(names):
                        if spec.lower() in n.lower():
                            self.mic_index = i
                            self.mic_name = n
                            break
                except Exception as e:
                    print(f"[Audio] Warning: Could not list microphones: {e}")
            if self.mic_name is None:
                try:
                    names = sr.Microphone.list_microphone_names() or []
                    if self.mic_index is not None and 0 <= self.mic_index < len(names):
                        self.mic_name = names[self.mic_index]
                    elif self.mic_index is None:
                        self.mic_name = "system default"
                except Exception:
                    self.mic_name = "unknown"
        else:
            self.url = source

        self._start_listening_thread()

    def _start_listening_thread(self):
        self._running = True
        self._thread = threading.Thread(target=self._listen_loop, daemon=True)
        self._thread.start()
        if self.mode == "mic":
            print(f"[Audio] Started monitoring in mic mode (index={self.mic_index}, name={self.mic_name})")
        else:
            print(f"[Audio] Started monitoring in rtsp mode")

    def _listen_loop(self):
        while self._running:
            try:
                if self.mode == "mic":
                    result = self._mic_listen_once(seconds=6)
                else:
                    result = self._rtsp_listen_once(seconds=6)

                if result:
                    with self._lock:
                        self.last_detection = result
                        print(f"[Audio] *** KEYWORD MATCHED: '{result[3]}' in text: '{result[2]}' ***")
            except Exception as e:
                print(f"[Audio] Listen error: {e}")
                time.sleep(1)

    @staticmethod
    def _normalize_text(text):
        t = (text or "").lower()
        t = re.sub(r"[^a-z0-9\s]", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    def _check_text(self, text):
        t = self._normalize_text(text)
        if not t:
            return None
        for k in self.keyphrases:
            nk = self._normalize_text(k)
            if not nk:
                continue
            matched = nk in t
            if not matched and " " not in nk:
                matched = bool(re.search(rf"\b{re.escape(nk)}\b", t))
            if matched:
                sev = "high" if ("rape" in t or "bachao" in t) else "medium"
                return ("audio", sev, t, k)
        print(f"[Audio] No keyword matched in: '{t}'")
        return None

    def _recognize_with_fallback(self, audio_data):
        last_exc = None
        for lang in self.languages:
            try:
                text = self.recognizer.recognize_google(audio_data, language=lang)
                if text:
                    print(f"[Audio] Heard ({lang}): '{text}'")
                    return text
            except sr.UnknownValueError:
                continue
            except sr.RequestError as e:
                last_exc = e
                break
            except Exception as e:
                last_exc = e
                continue
        if last_exc:
            now = time.time()
            if now - self._last_recognition_error_ts > 10:
                print(f"[Audio] Recognition backend error: {last_exc}")
                self._last_recognition_error_ts = now
        return None

    def _rtsp_listen_once(self, seconds=6):
        try:
            proc = (
                ffmpeg
                .input(self.url)
                .output("pipe:", format="wav", acodec="pcm_s16le", ac=1, ar="16000")
                .run_async(pipe_stdout=True, pipe_stderr=True)
            )
            audio_bytes = proc.stdout.read(seconds * 16000 * 2)
            proc.kill()
            if not audio_bytes:
                return None
            data = sr.AudioData(audio_bytes, 16000, 2)
            text = self._recognize_with_fallback(data)
            return self._check_text(text)
        except Exception:
            return None

    def _mic_listen_once(self, seconds=6):
        try:
            with sr.Microphone(device_index=self.mic_index) as mic:
                if not self._mic_calibrated:
                    self.recognizer.adjust_for_ambient_noise(mic, duration=1.0)
                    self._mic_calibrated = True
                    print(f"[Audio] Calibrated. Energy threshold: {self.recognizer.energy_threshold}")
                print("[Audio] Listening...")
                audio = self.recognizer.listen(mic, phrase_time_limit=seconds, timeout=8)
            text = self._recognize_with_fallback(audio)
            return self._check_text(text)
        except sr.WaitTimeoutError:
            return None
        except Exception as e:
            now = time.time()
            if now - self._last_recognition_error_ts > 10:
                print(f"[Audio] Microphone listen error: {e}")
                self._last_recognition_error_ts = now
            return None

    def check_audio_emergency(self):
        with self._lock:
            result = self.last_detection
            self.last_detection = None
            return result

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)
