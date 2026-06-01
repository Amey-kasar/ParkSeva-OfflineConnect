"""
Utilities to persist evidence snapshots into MongoDB and keep the collection in
sync with the local evidence directory.
"""
from __future__ import annotations

import hashlib
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Optional

from bson import Binary, ObjectId
from pymongo import MongoClient, errors


class EvidenceRepository:
    """Thin wrapper around a MongoDB collection storing evidence images."""

    def __init__(self, uri: str, db_name: str, collection_name: str):
        self.client = MongoClient(uri)
        self.collection = self.client[db_name][collection_name]
        # Prevent duplicates while still allowing concurrent ingests.
        self.collection.create_index("hash", unique=True)

    @classmethod
    def from_env(cls) -> Optional["EvidenceRepository"]:
        uri = os.getenv("MONGO_URI")
        if not uri:
            return None
        db_name = os.getenv("MONGO_DB", "parkseva")
        collection_name = os.getenv("MONGO_EVIDENCE_COLLECTION", "evidence_snapshots")
        try:
            return cls(uri, db_name, collection_name)
        except Exception as exc:  # pragma: no cover - defensive logging
            print(f"[EvidenceRepository] Failed to connect to MongoDB: {exc}")
            return None

    def insert_image(
        self,
        file_path: Path,
        data: Optional[bytes] = None,
        sha256_hex: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Save an image into MongoDB if it is not already present."""
        if data is None:
            try:
                data = file_path.read_bytes()
            except FileNotFoundError:
                return None

        sha256 = sha256_hex or hashlib.sha256(data).hexdigest()
        document = {
            "filename": file_path.name,
            "path": str(file_path),
            "size": len(data),
            "hash": sha256,
            "content_type": _guess_mime_type(file_path),
            "stored_at": datetime.utcnow(),
            "data": Binary(data),
        }

        try:
            result = self.collection.insert_one(document)
            print(f"[EvidenceRepository] stored '{file_path.name}' ({len(data)} bytes)")
            meta = {
                "id": str(result.inserted_id),
                "filename": document["filename"],
                "path": document["path"],
                "size": document["size"],
                "hash": document["hash"],
                "content_type": document["content_type"],
                "stored_at": document["stored_at"].isoformat(),
            }
            return meta
        except errors.DuplicateKeyError:
            # Already stored - nothing to do.
            return None

    def list_evidence(self) -> Iterable[Dict[str, Any]]:
        projection = {"data": 0}
        for doc in self.collection.find({}, projection=projection).sort("stored_at", -1):
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            if "stored_at" in doc:
                stored_at = doc["stored_at"]
                if isinstance(stored_at, datetime):
                    doc["stored_at"] = stored_at.isoformat()
            yield doc

    def get_image(self, image_id: str) -> Optional[Dict[str, Any]]:
        try:
            oid = ObjectId(image_id)
        except Exception:
            return None
        doc = self.collection.find_one({"_id": oid})
        if not doc:
            return None
        doc["id"] = image_id
        return doc

    def known_hashes(self) -> Iterable[str]:
        return (doc["hash"] for doc in self.collection.find({}, {"hash": 1, "_id": 0}))

    def close(self) -> None:
        self.client.close()


class EvidenceDirectoryWatcher:
    """
    Polls a directory for new images and saves them into MongoDB.
    Basic polling is used instead of watchdog to avoid extra dependencies.
    """

    def __init__(
        self,
        directory: Path,
        repository: EvidenceRepository,
        poll_interval: float = 5.0,
        settle_seconds: float = 1.0,
        on_new_evidence: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        self.directory = directory
        self.repository = repository
        self.poll_interval = poll_interval
        self.settle_seconds = settle_seconds
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._known_hashes = set(repository.known_hashes())
        self._callback = on_new_evidence

    def start(self) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        self.ingest_existing()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        print(f"[EvidenceWatcher] Watching '{self.directory}' for new images.")

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def register_hash(self, sha256_hex: str) -> None:
        if sha256_hex:
            self._known_hashes.add(sha256_hex)

    def ingest_existing(self) -> None:
        for file_path in self._iter_candidate_files():
            self._ingest_file(file_path)

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                for file_path in self._iter_candidate_files():
                    self._ingest_file(file_path)
            except Exception as exc:  # pragma: no cover - log but keep running
                print(f"[EvidenceWatcher] Error while scanning directory: {exc}")
            self._stop_event.wait(self.poll_interval)

    def _iter_candidate_files(self):
        if not self.directory.exists():
            return []
        for file_path in sorted(self.directory.iterdir(), key=lambda p: p.stat().st_mtime):
            if not file_path.is_file():
                continue
            suffix = file_path.suffix.lower()
            if suffix not in {".jpg", ".jpeg", ".png", ".bmp"}:
                continue
            # skip files that are too fresh to avoid partial writes
            age = time.time() - file_path.stat().st_mtime
            if age < self.settle_seconds:
                continue
            yield file_path

    def _ingest_file(self, file_path: Path) -> None:
        try:
            data = file_path.read_bytes()
        except FileNotFoundError:
            return
        sha256_hex = hashlib.sha256(data).hexdigest()
        if sha256_hex in self._known_hashes:
            return
        meta = self.repository.insert_image(
            file_path,
            data=data,
            sha256_hex=sha256_hex,
        )
        if meta is not None:
            self._known_hashes.add(sha256_hex)
            if self._callback:
                try:
                    self._callback(meta)
                except Exception as exc:  # pragma: no cover - defensive
                    print(f"[EvidenceWatcher] callback error: {exc}")


def _guess_mime_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".png":
        return "image/png"
    if suffix == ".bmp":
        return "image/bmp"
    return "application/octet-stream"
