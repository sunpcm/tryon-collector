"""Dispatch retry queue — JSON file-based, max 3 attempts.

Failed dispatches are queued in storage/.dispatch_queue/<task_id>.json.
After 3 failures, the entry moves to storage/dispatch_log/failed/<task_id>.json.
"""

from __future__ import annotations

import json
import os
import shutil
from datetime import UTC, datetime
from pathlib import Path

STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage"))
MAX_RETRIES = 3

QUEUE_DIR = STORAGE_ROOT / ".dispatch_queue"
FAILED_DIR = STORAGE_ROOT / "dispatch_log" / "failed"


def enqueue(task_id: str, error: str) -> Path:
    """Add a failed dispatch to the retry queue."""
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    entry = {
        "task_id": task_id,
        "attempts": 1,
        "last_error": error,
        "last_attempt": datetime.now(UTC).isoformat(),
    }
    path = QUEUE_DIR / f"{task_id}.json"
    path.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def _move_to_failed(task_id: str, entry: dict) -> Path:
    """Move a permanently failed entry to dispatch_log/failed/."""
    FAILED_DIR.mkdir(parents=True, exist_ok=True)
    entry["status"] = "permanently_failed"
    entry["failed_at"] = datetime.now(UTC).isoformat()
    dest = FAILED_DIR / f"{task_id}.json"
    dest.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8")

    queue_file = QUEUE_DIR / f"{task_id}.json"
    if queue_file.exists():
        queue_file.unlink()
    return dest


def process_queue() -> dict:
    """Process all pending retry entries.

    Returns {"retried": N, "succeeded": N, "failed": N}.
    """
    from app.services.dispatcher import DispatchError, dispatch_bundle

    if not QUEUE_DIR.exists():
        return {"retried": 0, "succeeded": 0, "failed": 0}

    retried = succeeded = failed = 0

    for queue_file in sorted(QUEUE_DIR.glob("*.json")):
        entry = json.loads(queue_file.read_text(encoding="utf-8"))
        task_id = entry["task_id"]
        attempts = entry.get("attempts", 0)

        if attempts >= MAX_RETRIES:
            _move_to_failed(task_id, entry)
            failed += 1
            continue

        try:
            dispatch_bundle(task_id)
            queue_file.unlink()
            succeeded += 1
        except (DispatchError, OSError) as exc:
            entry["attempts"] = attempts + 1
            entry["last_error"] = str(exc)
            entry["last_attempt"] = datetime.now(UTC).isoformat()
            queue_file.write_text(
                json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            retried += 1

    return {"retried": retried, "succeeded": succeeded, "failed": failed}
