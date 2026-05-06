"""Tests for retry_queue.py — JSON file-based dispatch retry queue."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.retry_queue import MAX_RETRIES, enqueue, process_queue


@pytest.fixture()
def queue_dirs(tmp_path):
    """Set up temporary storage directories for queue testing."""
    storage = tmp_path / "storage"
    storage.mkdir()
    with patch("app.services.retry_queue.STORAGE_ROOT", storage), patch(
        "app.services.retry_queue.QUEUE_DIR", storage / ".dispatch_queue"
    ), patch("app.services.retry_queue.FAILED_DIR", storage / "dispatch_log" / "failed"):
        yield storage


def test_enqueue_creates_queue_file(queue_dirs):
    storage = queue_dirs
    enqueue("task-001", "some error")

    queue_file = storage / ".dispatch_queue" / "task-001.json"
    assert queue_file.exists()
    entry = json.loads(queue_file.read_text())
    assert entry["task_id"] == "task-001"
    assert entry["attempts"] == 1
    assert entry["last_error"] == "some error"


def test_process_queue_succeeds_on_retry(queue_dirs):
    storage = queue_dirs
    enqueue("task-001", "transient error")

    with patch("app.services.dispatcher.STORAGE_ROOT", storage), patch(
        "app.services.dispatcher.IMG_DC_ROOT", storage / "img-dc"
    ):
        # create real bundle so dispatch succeeds
        bundle_dir = storage / "raw_ingestion" / "task-001"
        bundle_dir.mkdir(parents=True)
        (bundle_dir / "product.jpg").write_bytes(b"\xff\xd8\xff" + b"x" * 100)
        (bundle_dir / "tryon.jpg").write_bytes(b"\xff\xd8\xff" + b"x" * 100)
        (bundle_dir / "retouched.jpg").write_bytes(b"\xff\xd8\xff" + b"x" * 100)
        (bundle_dir / "metadata.json").write_text(json.dumps({
            "task_id": "task-001",
            "group_key": "SKU001",
            "files": {
                "product": {"filename": "product.jpg", "mime": "image/jpeg"},
                "tryon": {"filename": "tryon.jpg", "mime": "image/jpeg"},
                "retouched": {"filename": "retouched.jpg", "mime": "image/jpeg"},
            },
        }))

        result = process_queue()

    assert result["succeeded"] == 1
    assert result["retried"] == 0
    assert result["failed"] == 0
    # queue file should be removed
    assert not (storage / ".dispatch_queue" / "task-001.json").exists()


def test_process_queue_moves_to_failed_after_max_retries(queue_dirs):
    storage = queue_dirs
    # enqueue and manually set attempts to MAX_RETRIES
    enqueue("task-001", "persistent error")
    queue_file = storage / ".dispatch_queue" / "task-001.json"
    entry = json.loads(queue_file.read_text())
    entry["attempts"] = MAX_RETRIES
    queue_file.write_text(json.dumps(entry))

    result = process_queue()

    assert result["failed"] == 1
    assert result["succeeded"] == 0
    # moved to failed dir
    failed_file = storage / "dispatch_log" / "failed" / "task-001.json"
    assert failed_file.exists()
    failed_entry = json.loads(failed_file.read_text())
    assert failed_entry["status"] == "permanently_failed"
    # queue file removed
    assert not queue_file.exists()


def test_process_queue_increments_attempts_on_failure(queue_dirs):
    storage = queue_dirs
    enqueue("task-001", "error")

    # dispatch will fail because no bundle exists
    with patch("app.services.dispatcher.STORAGE_ROOT", storage), patch(
        "app.services.dispatcher.IMG_DC_ROOT", storage / "img-dc"
    ):
        result = process_queue()

    assert result["retried"] == 1
    queue_file = storage / ".dispatch_queue" / "task-001.json"
    entry = json.loads(queue_file.read_text())
    assert entry["attempts"] == 2


def test_process_queue_empty(queue_dirs):
    result = process_queue()
    assert result == {"retried": 0, "succeeded": 0, "failed": 0}


def test_process_queue_multiple_entries(queue_dirs):
    storage = queue_dirs
    enqueue("task-001", "error 1")
    enqueue("task-002", "error 2")

    # both will fail (no bundles)
    with patch("app.services.dispatcher.STORAGE_ROOT", storage), patch(
        "app.services.dispatcher.IMG_DC_ROOT", storage / "img-dc"
    ):
        result = process_queue()

    assert result["retried"] == 2
