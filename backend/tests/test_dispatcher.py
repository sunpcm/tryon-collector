"""Tests for dispatcher.py — symlink creation into img-dc training dirs."""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np
import pytest

from app.services.dispatcher import DispatchError, dispatch_bundle


@pytest.fixture()
def storage_and_imgdc(tmp_path):
    """Set up temporary storage and img-dc directories."""
    storage = tmp_path / "storage"
    imgdc = tmp_path / "img-dc"
    storage.mkdir()
    imgdc.mkdir()
    with patch("app.services.dispatcher.STORAGE_ROOT", storage), patch(
        "app.services.dispatcher.IMG_DC_ROOT", imgdc
    ):
        yield storage, imgdc


def _create_bundle(storage: Path, task_id: str, group_key: str = "SKU001") -> Path:
    """Create a minimal raw_ingestion bundle with metadata + files."""
    bundle_dir = storage / "raw_ingestion" / task_id
    bundle_dir.mkdir(parents=True)

    # write image files
    for role in ("product", "tryon", "retouched"):
        (bundle_dir / f"{role}.jpg").write_bytes(b"\xff\xd8\xff" + b"x" * 100)

    # write metadata
    metadata = {
        "task_id": task_id,
        "group_key": group_key,
        "files": {
            "product": {"filename": "product.jpg", "mime": "image/jpeg"},
            "tryon": {"filename": "tryon.jpg", "mime": "image/jpeg"},
            "retouched": {"filename": "retouched.jpg", "mime": "image/jpeg"},
        },
    }
    (bundle_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False), encoding="utf-8"
    )
    return bundle_dir


def test_happy_path_creates_symlinks(storage_and_imgdc):
    storage, imgdc = storage_and_imgdc
    task_id = "aaaa-bbbb-cccc-dddd"
    _create_bundle(storage, task_id)

    created = dispatch_bundle(task_id)

    assert len(created) == 3
    # check symlinks exist and point to correct files
    product_link = imgdc / "data" / "product" / f"SKU001_{task_id[:8]}.jpg"
    assert product_link.is_symlink()
    assert product_link.resolve() == (storage / "raw_ingestion" / task_id / "product.jpg").resolve()

    tryon_link = imgdc / "data" / "tryon" / f"SKU001_{task_id[:8]}.jpg"
    assert tryon_link.is_symlink()

    retouched_link = imgdc / "data" / "retouched" / f"SKU001_{task_id[:8]}.jpg"
    assert retouched_link.is_symlink()


def test_with_annotated_file(storage_and_imgdc):
    storage, imgdc = storage_and_imgdc
    task_id = "aaaa-bbbb-cccc-dddd"
    bundle_dir = _create_bundle(storage, task_id)
    # add annotated file
    (bundle_dir / "annotated.jpg").write_bytes(b"\xff\xd8\xff" + b"y" * 50)
    meta = json.loads((bundle_dir / "metadata.json").read_text())
    meta["files"]["annotated"] = {"filename": "annotated.jpg", "mime": "image/jpeg"}
    (bundle_dir / "metadata.json").write_text(json.dumps(meta))

    created = dispatch_bundle(task_id)

    assert len(created) == 4
    ann_link = imgdc / "data" / "annotations" / f"SKU001_{task_id[:8]}.jpg"
    assert ann_link.is_symlink()


def test_missing_metadata_raises(storage_and_imgdc):
    storage, _ = storage_and_imgdc
    task_id = "no-such-task"
    (storage / "raw_ingestion" / task_id).mkdir(parents=True)

    with pytest.raises(DispatchError, match="metadata.json not found"):
        dispatch_bundle(task_id)


def test_missing_source_file_raises(storage_and_imgdc):
    storage, _ = storage_and_imgdc
    task_id = "broken-bundle"
    bundle_dir = storage / "raw_ingestion" / task_id
    bundle_dir.mkdir(parents=True)
    metadata = {
        "task_id": task_id,
        "group_key": "BROKEN",
        "files": {"product": {"filename": "product.jpg", "mime": "image/jpeg"}},
    }
    (bundle_dir / "metadata.json").write_text(json.dumps(metadata))
    # no product.jpg file

    with pytest.raises(DispatchError, match="source file missing"):
        dispatch_bundle(task_id)


def test_idempotent_overwrites_old_symlinks(storage_and_imgdc):
    storage, imgdc = storage_and_imgdc
    task_id = "aaaa-bbbb-cccc-dddd"
    _create_bundle(storage, task_id)

    dispatch_bundle(task_id)
    dispatch_bundle(task_id)  # second call should not fail

    product_link = imgdc / "data" / "product" / f"SKU001_{task_id[:8]}.jpg"
    assert product_link.is_symlink()


def test_symlink_targets_resolve_to_source(storage_and_imgdc):
    storage, imgdc = storage_and_imgdc
    task_id = "aaaa-bbbb-cccc-dddd"
    _create_bundle(storage, task_id)

    dispatch_bundle(task_id)

    for role, subdir in [
        ("product", "data/product"),
        ("tryon", "data/tryon"),
        ("retouched", "data/retouched"),
    ]:
        link = imgdc / subdir / f"SKU001_{task_id[:8]}.jpg"
        assert link.exists(), f"{role} symlink should resolve"
        assert link.read_bytes() == b"\xff\xd8\xff" + b"x" * 100


def _create_bundle_with_real_images(storage: Path, task_id: str, group_key: str = "SKU001"):
    """Create a bundle with real images that OpenCV can read."""
    bundle_dir = storage / "raw_ingestion" / task_id
    bundle_dir.mkdir(parents=True)

    # write real images via cv2
    img_ret = np.full((50, 50, 3), (200, 200, 200), dtype=np.uint8)
    img_try = np.full((50, 50, 3), (50, 50, 50), dtype=np.uint8)
    cv2.imwrite(str(bundle_dir / "retouched.jpg"), img_ret)
    cv2.imwrite(str(bundle_dir / "tryon.jpg"), img_try)
    cv2.imwrite(str(bundle_dir / "product.jpg"), img_try)

    metadata = {
        "task_id": task_id,
        "group_key": group_key,
        "files": {
            "product": {"filename": "product.jpg", "mime": "image/jpeg"},
            "tryon": {"filename": "tryon.jpg", "mime": "image/jpeg"},
            "retouched": {"filename": "retouched.jpg", "mime": "image/jpeg"},
        },
    }
    (bundle_dir / "metadata.json").write_text(json.dumps(metadata))
    return bundle_dir


def test_mask_generated_and_dispatched(storage_and_imgdc):
    storage, imgdc = storage_and_imgdc
    task_id = "aaaa-bbbb-cccc-dddd"
    _create_bundle_with_real_images(storage, task_id)

    created = dispatch_bundle(task_id)

    # 3 symlinks for roles + 1 mask symlink
    assert len(created) == 4

    mask_link = imgdc / "data" / "annotations" / f"SKU001_{task_id[:8]}_mask.png"
    assert mask_link.is_symlink()
    assert mask_link.exists()

    # mask should be non-trivial (not all black) since images differ
    mask = cv2.imread(str(mask_link), cv2.IMREAD_GRAYSCALE)
    assert mask is not None
    assert np.any(mask > 0)  # some white pixels


def test_mask_gracefully_skipped_for_fake_images(storage_and_imgdc):
    """When images aren't real (cv2 can't read), mask is silently skipped."""
    storage, imgdc = storage_and_imgdc
    task_id = "aaaa-bbbb-cccc-dddd"
    _create_bundle(storage, task_id)  # uses fake jpeg bytes

    created = dispatch_bundle(task_id)

    # 3 symlinks for roles, no mask
    assert len(created) == 3
    mask_link = imgdc / "data" / "annotations" / f"SKU001_{task_id[:8]}_mask.png"
    assert not mask_link.exists()
