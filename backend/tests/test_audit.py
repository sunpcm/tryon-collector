"""Tests for GET /api/audit/bundles."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.bundle import STORAGE_ROOT


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
        [("alice", "上衣"), ("bob", "裤装"), ("alice", "连衣裙")]
    ):
        task_dir = root / f"task-{i}"
        task_dir.mkdir()
        meta = {
            "task_id": f"task-{i}",
            "submit_id": f"submit-{i}",
            "designer_id": designer,
            "business_line": "春季女装",
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
