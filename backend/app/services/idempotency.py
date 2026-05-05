"""Idempotency key store: storage/.idempotency/<submit_id>.json, 24h TTL.

Also provides startup cleanup for stale .staging/ directories (> 1h old).
"""

from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path

IDEMPOTENCY_TTL_SECONDS = 24 * 3600
STAGING_STALE_SECONDS = 3600
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage"))


def _idempotency_dir() -> Path:
    d = STORAGE_ROOT / ".idempotency"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_idempotency(submit_id: str) -> dict | None:
    """Return stored response if submit_id exists and is within TTL, else None."""
    path = _idempotency_dir() / f"{submit_id}.json"
    if not path.exists():
        return None
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    if time.time() - record.get("_saved_at", 0) > IDEMPOTENCY_TTL_SECONDS:
        path.unlink(missing_ok=True)
        return None
    return record["response"]


def set_idempotency(submit_id: str, response: dict) -> None:
    """Persist response body under submit_id."""
    path = _idempotency_dir() / f"{submit_id}.json"
    record = {"_saved_at": time.time(), "response": response}
    path.write_text(json.dumps(record, ensure_ascii=False), encoding="utf-8")


def cleanup_stale_staging() -> None:
    """Remove .staging/ subdirs older than STAGING_STALE_SECONDS (called at startup)."""
    staging = STORAGE_ROOT / ".staging"
    if not staging.exists():
        return
    cutoff = time.time() - STAGING_STALE_SECONDS
    for entry in staging.iterdir():
        if entry.is_dir() and entry.stat().st_mtime < cutoff:
            shutil.rmtree(entry, ignore_errors=True)
