"""Tests for services/idempotency.py."""

from __future__ import annotations

import time
from unittest.mock import patch

from app.services.idempotency import (
    IDEMPOTENCY_TTL_SECONDS,
    cleanup_stale_staging,
    get_idempotency,
    set_idempotency,
)

_RESPONSE = {
    "submit_id": "8f14e45f-ceea-467a-a9e5-c5f2e0c4f5a1",
    "accepted": [{"group_key": "SKU12345", "task_id": "abc-123"}],
    "rejected": [],
}


def test_set_and_get_idempotency(tmp_path):
    with patch("app.services.idempotency.STORAGE_ROOT", tmp_path):
        set_idempotency("submit-001", _RESPONSE)
        result = get_idempotency("submit-001")

    assert result == _RESPONSE


def test_get_missing_returns_none(tmp_path):
    with patch("app.services.idempotency.STORAGE_ROOT", tmp_path):
        assert get_idempotency("nonexistent") is None


def test_get_expired_returns_none(tmp_path):
    with patch("app.services.idempotency.STORAGE_ROOT", tmp_path):
        set_idempotency("submit-002", _RESPONSE)
        # backdate the saved_at to beyond TTL
        import json

        path = tmp_path / ".idempotency" / "submit-002.json"
        record = json.loads(path.read_text())
        record["_saved_at"] = time.time() - IDEMPOTENCY_TTL_SECONDS - 1
        path.write_text(json.dumps(record))

        assert get_idempotency("submit-002") is None
        assert not path.exists()


def test_cleanup_stale_staging(tmp_path):
    staging = tmp_path / ".staging"
    staging.mkdir()
    stale_dir = staging / "stale-task"
    stale_dir.mkdir()
    fresh_dir = staging / "fresh-task"
    fresh_dir.mkdir()

    # backdate stale_dir mtime to > 1h ago
    old_time = time.time() - 3700
    os.utime(stale_dir, (old_time, old_time))

    with patch("app.services.idempotency.STORAGE_ROOT", tmp_path):
        cleanup_stale_staging()

    assert not stale_dir.exists()
    assert fresh_dir.exists()


import os  # noqa: E402 — needed for os.utime above
