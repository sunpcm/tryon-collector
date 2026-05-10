"""Atomic bundle persistence: .staging/<task_id>/ → raw_ingestion/<task_id>/."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO

MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/tiff": ".tiff",
    "image/bmp": ".bmp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/gif": ".gif",
}
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage"))


class BundleSaveError(Exception):
    pass


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save_bundle(
    submit_id: str,
    group_key: str,
    files: list[tuple[str, str, BinaryIO, str]],  # (role, filename, fileobj, mime)
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
        file_meta: dict[str, list[dict]] = {}
        role_counters: dict[str, int] = {}
        for role, _original_filename, fileobj, mime in files:
            ext = MIME_TO_EXT.get(mime, ".bin")
            idx = role_counters.get(role, 0)
            dest_name = f"{role}_{idx}{ext}"
            role_counters[role] = idx + 1
            dest_path = staging_dir / dest_name

            data = fileobj.read()
            dest_path.write_bytes(data)

            file_meta.setdefault(role, []).append({
                "filename": dest_name,
                "mime": mime,
                "sha256": _sha256(data),
                "bytes": len(data),
            })

        metadata = {
            "task_id": task_id,
            "submit_id": submit_id,
            "designer_id": meta.get("designer_id", ""),
            "business_line": meta.get("business_line", ""),
            "category": meta.get("category", ""),
            "optional_notes": meta.get("optional_notes", ""),
            "title": meta.get("title", ""),
            "group_key": group_key,
            "upload_time": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "has_annotation": any(r == "annotated" for r, *_ in files),
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
