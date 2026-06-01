"""
Small in-process publish/subscribe helper for streaming events to the GUI.
"""
from __future__ import annotations

import json
import queue
import threading
import time
from typing import Any, Dict, Iterable, Optional


class EventBus:
    def __init__(self, max_queue_size: int = 64):
        self._lock = threading.Lock()
        self._subscribers: set[queue.Queue] = set()
        self._max_queue_size = max_queue_size

    def subscribe(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=self._max_queue_size)
        with self._lock:
            self._subscribers.add(q)
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        with self._lock:
            self._subscribers.discard(q)

    def publish(self, event: Dict[str, Any]) -> None:
        """Fan out the event to all subscribers."""
        payload = {
            "ts": time.time(),
            **event,
        }
        with self._lock:
            subscribers: Iterable[queue.Queue] = list(self._subscribers)
        for q in subscribers:
            try:
                q.put_nowait(payload)
            except queue.Full:
                # drop oldest by draining once, then retry
                try:
                    q.get_nowait()
                    q.put_nowait(payload)
                except queue.Empty:
                    continue
                except queue.Full:
                    continue


def sse_stream(bus: EventBus, keepalive_sec: float = 20.0):
    """
    Generator that yields Server-Sent Events from the given bus.
    """
    subscriber = bus.subscribe()
    try:
        last_sent = time.time()
        while True:
            try:
                event = subscriber.get(timeout=keepalive_sec)
                data = json.dumps(event, default=_json_default)
                yield f"data: {data}\n\n"
                last_sent = time.time()
            except queue.Empty:
                # heartbeat keeps the connection alive
                now = time.time()
                if now - last_sent >= keepalive_sec:
                    yield ": keepalive\n\n"
                    last_sent = now
    finally:
        bus.unsubscribe(subscriber)


def _json_default(obj: Any) -> Any:
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

