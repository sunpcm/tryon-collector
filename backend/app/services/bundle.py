"""Atomic bundle persistence: .staging/<task_id>/ → raw_ingestion/<task_id>/."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO

MIME_TO_EXT = {"image/jpeg": ".jpg", "image/png": ".png"}
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage"))


class BundleSaveError(Exception):
    pass


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save_bundle(
    submit_id: str,
    group_key: str,
    files: dict[str, tuple[str, BinaryIO, str]],  # role -> (filename, fileobj, mime)
    meta: dict,
) -> str:
    """Write one bundle atomically; return task_id on success.

    Writes to .staging/<task_id>/ then os.rename to raw_ingestion/<task_id>/.
    Cleans up staging on any failure.
    """
    task_id = str(uuid.uuid4())
    staging_root = STORAGE_ROOT / ".staging"
    final_root = STORAGE_ROOT / "raw_ingestion"
    staging_dir = staging_root / task_id

    staging_root.mkdir(parents=True, exist_ok=True)
    final_root.mkdir(parents=True, exist_ok=True)
    staging_dir.mkdir(parents=True, exist_ok=True)

    try:
        file_meta: dict[str, dict] = {}
        for role, (original_filename, fileobj, mime) in files.items():
            ext = MIME_TO_EXT.get(mime, ".bin")
            dest_name = f"{role}{ext}"
            dest_path = staging_dir / dest_name

            data = fileobj.read()
            dest_path.write_bytes(data)

            file_meta[role] = {
                "filename": dest_name,
                "mime": mime,
                "sha256": _sha256(data),
                "bytes": len(data),
            }

        metadata = {
            "task_id": task_id,
            "submit_id": submit_id,
            "designer_id": meta.get("designer_id", ""),
            "business_line": meta.get("business_line", ""),
            "category": meta.get("category", ""),
            "optional_notes": meta.get("optional_notes", ""),
            "group_key": group_key,
            "upload_time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "has_annotation": "annotated" in files,
            "files": file_meta,
        }
        (staging_dir / "metadata.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        os.rename(staging_dir, final_root / task_id)
        return task_id

    except Exception as exc:
        if staging_dir.exists():
            shutil.rmtree(staging_dir, ignore_errors=True)
        raise BundleSaveError(str(exc)) from exc
