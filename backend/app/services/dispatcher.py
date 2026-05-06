"""Symlink dispatcher — links raw_ingestion bundles into img-dc training dirs.

Called after save_bundle() succeeds. Creates symlinks in:
  IMG_DC_ROOT/data/product/    — product images
  IMG_DC_ROOT/data/tryon/      — tryon images
  IMG_DC_ROOT/data/annotations/ — annotated images (if present)
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from app.services.mask import MaskError, generate_mask

STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage"))
IMG_DC_ROOT = Path(os.getenv("IMG_DC_ROOT", "img-dc"))

ROLE_TO_SUBDIR = {
    "product": "data/product",
    "tryon": "data/tryon",
    "retouched": "data/retouched",
    "annotated": "data/annotations",
}

MIME_TO_EXT = {"image/jpeg": ".jpg", "image/png": ".png"}


class DispatchError(Exception):
    pass


def dispatch_bundle(task_id: str) -> list[Path]:
    """Create symlinks for a saved bundle into the img-dc training directory.

    Returns list of created symlink paths.
    Raises DispatchError on failure.
    """
    bundle_dir = STORAGE_ROOT / "raw_ingestion" / task_id
    meta_path = bundle_dir / "metadata.json"

    if not meta_path.exists():
        raise DispatchError(f"metadata.json not found for task {task_id}")

    metadata = json.loads(meta_path.read_text(encoding="utf-8"))
    group_key = metadata.get("group_key", task_id)
    files_meta: dict = metadata.get("files", {})

    created: list[Path] = []

    try:
        for role, file_info in files_meta.items():
            subdir = ROLE_TO_SUBDIR.get(role)
            if subdir is None:
                continue

            target_dir = IMG_DC_ROOT / subdir
            target_dir.mkdir(parents=True, exist_ok=True)

            source = bundle_dir / file_info["filename"]
            if not source.exists():
                raise DispatchError(f"source file missing: {source}")

            ext = MIME_TO_EXT.get(file_info.get("mime", ""), ".jpg")
            short_id = task_id[:8]
            link_name = f"{group_key}_{short_id}{ext}"
            link_path = target_dir / link_name

            # remove stale symlink if exists (idempotent)
            if link_path.is_symlink():
                link_path.unlink()

            link_path.symlink_to(source.resolve())
            created.append(link_path)

    except DispatchError:
        raise
    except OSError as exc:
        raise DispatchError(f"symlink creation failed: {exc}") from exc

    # generate mask from retouched - tryon and dispatch to annotations
    try:
        ret_path = bundle_dir / files_meta["retouched"]["filename"]
        try_path = bundle_dir / files_meta["tryon"]["filename"]
        mask_path = bundle_dir / "mask.png"

        if ret_path.exists() and try_path.exists():
            generate_mask(ret_path, try_path, mask_path)

            ann_dir = IMG_DC_ROOT / "data" / "annotations"
            ann_dir.mkdir(parents=True, exist_ok=True)
            short_id = task_id[:8]
            mask_link = ann_dir / f"{group_key}_{short_id}_mask.png"
            if mask_link.is_symlink():
                mask_link.unlink()
            mask_link.symlink_to(mask_path.resolve())
            created.append(mask_link)
    except (MaskError, OSError, KeyError):
        pass  # mask generation is best-effort; bundle is still accepted

    return created
