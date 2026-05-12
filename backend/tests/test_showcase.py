"""Tests for POST /api/showcases/batch + GET /api/showcases + service layer."""

from __future__ import annotations

import io
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _jpeg(name: str = "img.jpg") -> tuple[str, io.BytesIO, str]:
    return (name, io.BytesIO(b"\xff\xd8\xff" + b"x" * 100), "image/jpeg")


def _mp4(name: str = "clip.mp4", size: int = 200) -> tuple[str, io.BytesIO, str]:
    return (name, io.BytesIO(b"\x00\x00\x00\x20ftypmp42" + b"x" * size), "video/mp4")


def _submit(files, tmp_path, **overrides):
    brands_file = tmp_path / "brands.json"
    data = {
        "uploader": "张三",
        "brand": "Nike",
        "purpose": "show",
        "client_submit_id": str(uuid.uuid4()),
    }
    data.update(overrides)
    with patch("app.services.showcase.STORAGE_ROOT", tmp_path), patch(
        "app.services.brands.STORAGE_ROOT", tmp_path
    ), patch("app.services.brands._BRANDS_FILE", brands_file):
        return client.post("/api/showcases/batch", data=data, files=files)


def test_submit_requires_multipart() -> None:
    response = client.post("/api/showcases/batch")
    assert response.status_code == 400


def test_submit_rejects_missing_uploader(tmp_path) -> None:
    resp = _submit([("files", _jpeg())], tmp_path, uploader="")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_uploader"


def test_submit_rejects_missing_brand(tmp_path) -> None:
    resp = _submit([("files", _jpeg())], tmp_path, brand="")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_brand"


def test_submit_rejects_no_files(tmp_path) -> None:
    resp = _submit([], tmp_path)
    assert resp.status_code in (400, 422)


def test_submit_rejects_bad_mime(tmp_path) -> None:
    bad = ("bad.txt", io.BytesIO(b"hello"), "text/plain")
    resp = _submit([("files", bad)], tmp_path)
    assert resp.status_code == 415


def test_submit_rejects_invalid_client_submit_id(tmp_path) -> None:
    resp = _submit([("files", _jpeg())], tmp_path, client_submit_id="not-a-uuid")
    assert resp.status_code == 422


def test_submit_accepts_image_and_video(tmp_path) -> None:
    resp = _submit(
        [("files", _jpeg("a.jpg")), ("files", _mp4("clip.mp4"))],
        tmp_path,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "showcase_id" in body

    showcase_dir = tmp_path / "showcases" / body["showcase_id"]
    assert showcase_dir.is_dir()
    assert (showcase_dir / "metadata.json").is_file()
    assert (showcase_dir / "0.jpg").is_file()
    assert (showcase_dir / "1.mp4").is_file()


def test_submit_auto_adds_brand_to_catalogue(tmp_path) -> None:
    brands_file = tmp_path / "brands.json"
    resp = _submit([("files", _jpeg())], tmp_path, brand="BrandNew")
    assert resp.status_code == 201

    import json
    assert json.loads(brands_file.read_text())[0] == "BrandNew"


def test_list_showcases_returns_sorted_and_filtered(tmp_path) -> None:
    _submit([("files", _jpeg())], tmp_path, uploader="u1", brand="B1")
    _submit([("files", _jpeg())], tmp_path, uploader="u2", brand="B2")
    _submit([("files", _jpeg())], tmp_path, uploader="u1", brand="B2")

    with patch("app.services.showcase.STORAGE_ROOT", tmp_path):
        all_resp = client.get("/api/showcases")
        assert all_resp.status_code == 200
        assert all_resp.json()["total"] == 3

        by_uploader = client.get("/api/showcases?uploader=u1")
        assert by_uploader.json()["total"] == 2

        by_brand = client.get("/api/showcases?brand=B2")
        assert by_brand.json()["total"] == 2

        combined = client.get("/api/showcases?uploader=u1&brand=B2")
        assert combined.json()["total"] == 1


def test_patch_showcase_updates_brand_and_purpose(tmp_path) -> None:
    create = _submit([("files", _jpeg())], tmp_path, brand="OldBrand", purpose="old")
    sid = create.json()["showcase_id"]

    with patch("app.services.showcase.STORAGE_ROOT", tmp_path):
        resp = client.patch(
            f"/api/showcases/{sid}",
            json={"brand": "NewBrand", "purpose": "new"},
            params={"actor": "张三"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["brand"] == "NewBrand"
        assert body["purpose"] == "new"
        assert body["updated_by"] == "张三"


def test_patch_showcase_rejects_unknown_field(tmp_path) -> None:
    create = _submit([("files", _jpeg())], tmp_path)
    sid = create.json()["showcase_id"]
    with patch("app.services.showcase.STORAGE_ROOT", tmp_path):
        resp = client.patch(f"/api/showcases/{sid}", json={"uploader": "evil"})
        assert resp.status_code == 422


def test_patch_showcase_rejects_invalid_brand(tmp_path) -> None:
    create = _submit([("files", _jpeg())], tmp_path)
    sid = create.json()["showcase_id"]
    with patch("app.services.showcase.STORAGE_ROOT", tmp_path):
        resp = client.patch(f"/api/showcases/{sid}", json={"brand": ""})
        assert resp.status_code == 422


def test_delete_showcase_marks_soft_deleted(tmp_path) -> None:
    create = _submit([("files", _jpeg())], tmp_path)
    sid = create.json()["showcase_id"]
    with patch("app.services.showcase.STORAGE_ROOT", tmp_path):
        resp = client.delete(f"/api/showcases/{sid}", params={"actor": "u1"})
        assert resp.status_code == 200
        body = resp.json()
        assert "deleted_at" in body
        assert body["deleted_by"] == "u1"

        listing = client.get("/api/showcases").json()
        assert listing["total"] == 0

        full = client.get("/api/showcases?include_deleted=true").json()
        assert full["total"] == 1


def test_replaces_id_soft_deletes_original(tmp_path) -> None:
    first = _submit([("files", _jpeg())], tmp_path, brand="B1")
    sid = first.json()["showcase_id"]

    second = _submit(
        [("files", _jpeg())],
        tmp_path,
        brand="B1",
        replaces_id=sid,
    )
    assert second.status_code == 201

    with patch("app.services.showcase.STORAGE_ROOT", tmp_path):
        listing = client.get("/api/showcases").json()
        assert listing["total"] == 1
        assert listing["showcases"][0]["showcase_id"] == second.json()["showcase_id"]

