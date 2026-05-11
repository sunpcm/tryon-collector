"""Atomic showcase persistence: .staging/<showcase_id>/ → showcases/<showcase_id>/.

Parallel to bundle.py but for the showcase-ingestion flow: brand + optional
purpose + one-or-more image/video files, no role partitioning.
"""

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
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "video/x-matroska": ".mkv",
    "video/x-flv": ".flv",
    "video/mpeg": ".mpeg",
    "video/3gpp": ".3gp",
}

ALLOWED_IMAGE_MIMES = {
    "image/jpeg", "image/png", "image/webp", "image/tiff",
    "image/bmp", "image/heic", "image/heif", "image/gif",
}
ALLOWED_VIDEO_MIMES = {
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
    "video/x-matroska", "video/x-flv", "video/mpeg", "video/3gpp",
}
ALLOWED_MIMES = ALLOWED_IMAGE_MIMES | ALLOWED_VIDEO_MIMES

MAX_IMAGE_BYTES = 50 * 1024 * 1024
MAX_VIDEO_BYTES = 200 * 1024 * 1024

STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage"))


class ShowcaseSaveError(Exception):
    pass


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def max_bytes_for(mime: str) -> int:
    return MAX_VIDEO_BYTES if mime in ALLOWED_VIDEO_MIMES else MAX_IMAGE_BYTES


def save_showcase(
    submit_id: str,
    files: list[tuple[str, BinaryIO, str]],
    meta: dict,
) -> str:
    """Write one showcase atomically; return showcase_id on success.

    *files* is a list of (original_filename, fileobj, mime) tuples. All files
    are stored flat under the showcase directory as ``{idx}{ext}`` — no role
    partitioning, since every file in a showcase is equivalent.
    """
    showcase_id = str(uuid.uuid4())
    staging_root = STORAGE_ROOT / ".staging"
    final_root = STORAGE_ROOT / "showcases"
    staging_dir = staging_root / showcase_id

    staging_root.mkdir(parents=True, exist_ok=True)
    final_root.mkdir(parents=True, exist_ok=True)
    staging_dir.mkdir(parents=True, exist_ok=True)

    try:
        file_meta: list[dict] = []
        for idx, (original_filename, fileobj, mime) in enumerate(files):
            ext = MIME_TO_EXT.get(mime, ".bin")
            dest_name = f"{idx}{ext}"
            dest_path = staging_dir / dest_name

            data = fileobj.read()
            dest_path.write_bytes(data)

            file_meta.append({
                "filename": dest_name,
                "original_filename": original_filename,
                "mime": mime,
                "kind": "video" if mime in ALLOWED_VIDEO_MIMES else "image",
                "sha256": _sha256(data),
                "bytes": len(data),
            })

        metadata = {
            "showcase_id": showcase_id,
            "submit_id": submit_id,
            "uploader": meta.get("uploader", ""),
            "brand": meta.get("brand", ""),
            "purpose": meta.get("purpose", ""),
            "upload_time": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "files": file_meta,
        }
        (staging_dir / "metadata.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        os.rename(staging_dir, final_root / showcase_id)
        return showcase_id

    except Exception as exc:
        if staging_dir.exists():
            shutil.rmtree(staging_dir, ignore_errors=True)
        raise ShowcaseSaveError(str(exc)) from exc


def list_showcases(
    uploader: str | None = None,
    brand: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    root = STORAGE_ROOT / "showcases"
    if not root.exists():
        return {"total": 0, "offset": offset, "limit": limit, "showcases": []}

    entries: list[dict] = []
    for showcase_dir in root.iterdir():
        meta_path = showcase_dir / "metadata.json"
        if meta_path.is_file():
            try:
                entries.append(json.loads(meta_path.read_text(encoding="utf-8")))
            except (json.JSONDecodeError, OSError):
                continue

    if uploader:
        entries = [e for e in entries if e.get("uploader") == uploader]
    if brand:
        entries = [e for e in entries if e.get("brand") == brand]

    entries.sort(key=lambda e: e.get("upload_time", ""), reverse=True)
    total = len(entries)
    page = entries[offset : offset + limit]

    return {"total": total, "offset": offset, "limit": limit, "showcases": page}
