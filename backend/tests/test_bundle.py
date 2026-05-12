"""Tests for services/bundle.py atomic persistence."""

from __future__ import annotations

import io
import json
from unittest.mock import patch

import pytest

from app.services.bundle import BundleSaveError, save_bundle


def _fake_files(roles: list[str] = None) -> list[tuple[str, str, io.BytesIO, str]]:
    if roles is None:
        roles = ["product", "tryon", "retouched"]
    return [
        (role, f"{role}.jpg", io.BytesIO(b"fake-image-data-" + role.encode()), "image/jpeg")
        for role in roles
    ]


def _meta() -> dict:
    return {
        "designer_id": "张三",
        "business_line": "迪桑特",
        "category": "T恤",
        "optional_notes": "",
    }


def test_save_bundle_happy_path(tmp_path):
    with patch("app.services.bundle.STORAGE_ROOT", tmp_path):
        task_id = save_bundle("submit-001", "SKU12345", _fake_files(), _meta())

    dest = tmp_path / "raw_ingestion" / task_id
    assert dest.is_dir()

    meta = json.loads((dest / "metadata.json").read_text())
    assert meta["task_id"] == task_id
    assert meta["submit_id"] == "submit-001"
    assert meta["group_key"] == "SKU12345"
    assert meta["designer_id"] == "张三"
    assert meta["has_annotation"] is False
    assert set(meta["files"].keys()) == {"product", "tryon", "retouched"}
    for role_metas in meta["files"].values():
        assert len(role_metas) == 1
        assert len(role_metas[0]["sha256"]) == 64
        assert role_metas[0]["bytes"] > 0

    assert (dest / "product_0.jpg").exists()
    assert (dest / "tryon_0.jpg").exists()
    assert (dest / "retouched_0.jpg").exists()

    staging = tmp_path / ".staging" / task_id
    assert not staging.exists()


def test_save_bundle_with_annotation(tmp_path):
    files = _fake_files(["product", "tryon", "retouched", "annotated"])
    with patch("app.services.bundle.STORAGE_ROOT", tmp_path):
        task_id = save_bundle("submit-002", "SKU99999", files, _meta())

    dest = tmp_path / "raw_ingestion" / task_id
    meta = json.loads((dest / "metadata.json").read_text())
    assert meta["has_annotation"] is True
    assert "annotated" in meta["files"]


def test_save_bundle_cleans_staging_on_error(tmp_path):
    files = _fake_files()

    def bad_read():
        raise OSError("disk full")

    files[0] = ("product", "product.jpg", type("F", (), {"read": bad_read})(), "image/jpeg")

    with patch("app.services.bundle.STORAGE_ROOT", tmp_path), pytest.raises(BundleSaveError):
            save_bundle("submit-003", "SKU_ERR", files, _meta())

    staging_root = tmp_path / ".staging"
    leftover = list(staging_root.iterdir()) if staging_root.exists() else []
    assert leftover == [], f"staging残留未清理: {leftover}"


def test_save_bundle_png_extension(tmp_path):
    files = [
        (role, f"{role}.png", io.BytesIO(b"png-data"), "image/png")
        for role in ["product", "tryon", "retouched"]
    ]
    with patch("app.services.bundle.STORAGE_ROOT", tmp_path):
        task_id = save_bundle("submit-004", "SKU_PNG", files, _meta())

    dest = tmp_path / "raw_ingestion" / task_id
    assert (dest / "product_0.png").exists()
    meta = json.loads((dest / "metadata.json").read_text())
    assert meta["files"]["product"][0]["mime"] == "image/png"
