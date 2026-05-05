"""Smoke tests: health endpoint and Phase 0 placeholder."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "mode" in body


def test_bundles_batch_requires_multipart() -> None:
    response = client.post("/api/bundles/batch")
    assert response.status_code == 400
    assert response.json()["detail"] == "multipart/form-data required"
