"""Tests for GET /api/audit/bundles."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def sample_bundles(tmp_path, monkeypatch):
    """Create sample bundle directories for testing."""
    monkeypatch.setattr("app.services.bundle.STORAGE_ROOT", tmp_path)
    monkeypatch.setattr("app.routers.audit.STORAGE_ROOT", tmp_path)

    root = tmp_path / "raw_ingestion"
    root.mkdir(parents=True)

    for i, (designer, category) in enumerate(
        [("alice", "上衣"), ("bob", "裤装"), ("alice", "T恤")]
    ):
        task_dir = root / f"task-{i}"
        task_dir.mkdir()
        meta = {
            "task_id": f"task-{i}",
            "submit_id": f"submit-{i}",
            "designer_id": designer,
            "business_line": "迪桑特",
            "category": category,
            "group_key": f"SKU{i:05d}",
            "upload_time": "2026-05-06T10:00:00Z",
        }
        (task_dir / "metadata.json").write_text(
            json.dumps(meta, ensure_ascii=False), encoding="utf-8"
        )

    return root


def test_list_all(client, sample_bundles):
    resp = client.get("/api/audit/bundles")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["bundles"]) == 3


def test_filter_by_designer(client, sample_bundles):
    resp = client.get("/api/audit/bundles", params={"designer_id": "alice"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert all(b["designer_id"] == "alice" for b in data["bundles"])


def test_filter_by_category(client, sample_bundles):
    resp = client.get("/api/audit/bundles", params={"category": "裤装"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["bundles"][0]["category"] == "裤装"


def test_pagination(client, sample_bundles):
    resp = client.get("/api/audit/bundles", params={"limit": 2, "offset": 0})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["bundles"]) == 2

    resp2 = client.get("/api/audit/bundles", params={"limit": 2, "offset": 2})
    data2 = resp2.json()
    assert len(data2["bundles"]) == 1


def test_empty_storage(client, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.bundle.STORAGE_ROOT", tmp_path)
    monkeypatch.setattr("app.routers.audit.STORAGE_ROOT", tmp_path)

    resp = client.get("/api/audit/bundles")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


def _read_meta(path):
    return json.loads((path / "metadata.json").read_text(encoding="utf-8"))


def test_patch_bundle_updates_fields(client, sample_bundles):
    resp = client.patch(
        "/api/audit/bundles/task-0",
        json={"title": "新标题"},
        params={"actor": "alice"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "新标题"
    assert body["updated_by"] == "alice"
    assert "updated_at" in body
    assert _read_meta(sample_bundles / "task-0")["title"] == "新标题"


def test_patch_bundle_rejects_unknown_fields(client, sample_bundles):
    resp = client.patch(
        "/api/audit/bundles/task-0",
        json={"designer_id": "evil"},
    )
    assert resp.status_code == 422
    assert resp.json()["detail"] == "no_patchable_fields"


def test_patch_bundle_validates_tag(client, sample_bundles):
    resp = client.patch(
        "/api/audit/bundles/task-0",
        json={"category": "不存在的品类"},
    )
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_tag"


def test_patch_bundle_404(client, sample_bundles):
    resp = client.patch(
        "/api/audit/bundles/missing",
        json={"title": "x"},
    )
    assert resp.status_code == 404


def test_delete_bundle_marks_soft_deleted(client, sample_bundles):
    resp = client.delete("/api/audit/bundles/task-0", params={"actor": "alice"})
    assert resp.status_code == 200
    body = resp.json()
    assert "deleted_at" in body
    assert body["deleted_by"] == "alice"

    listing = client.get("/api/audit/bundles").json()
    assert listing["total"] == 2
    assert all(b["task_id"] != "task-0" for b in listing["bundles"])


def test_delete_bundle_idempotent(client, sample_bundles):
    client.delete("/api/audit/bundles/task-0", params={"actor": "alice"})
    first = _read_meta(sample_bundles / "task-0")["deleted_at"]
    resp = client.delete("/api/audit/bundles/task-0", params={"actor": "bob"})
    assert resp.status_code == 200
    second = _read_meta(sample_bundles / "task-0")["deleted_at"]
    assert first == second


def test_include_deleted_returns_soft_deleted(client, sample_bundles):
    client.delete("/api/audit/bundles/task-0")
    visible = client.get("/api/audit/bundles").json()
    assert visible["total"] == 2
    full = client.get(
        "/api/audit/bundles", params={"include_deleted": "true"}
    ).json()
    assert full["total"] == 3


def test_patch_after_delete_returns_409(client, sample_bundles):
    client.delete("/api/audit/bundles/task-0")
    resp = client.patch("/api/audit/bundles/task-0", json={"title": "x"})
    assert resp.status_code == 409

