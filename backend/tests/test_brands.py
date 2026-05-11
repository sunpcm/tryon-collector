"""Tests for brand catalogue service + GET/PUT /api/brands."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_brands_empty_by_default(tmp_path) -> None:
    with patch("app.services.brands.STORAGE_ROOT", tmp_path), patch(
        "app.services.brands._BRANDS_FILE", tmp_path / "brands.json"
    ):
        response = client.get("/api/brands")
    assert response.status_code == 200
    assert response.json() == {"brands": []}


def test_put_brands_persists_and_dedups(tmp_path) -> None:
    brands_file = tmp_path / "brands.json"
    with patch("app.services.brands.STORAGE_ROOT", tmp_path), patch(
        "app.services.brands._BRANDS_FILE", brands_file
    ):
        put_resp = client.put("/api/brands", json={"brands": ["Nike", "Adidas", "Nike", "  "]})
        assert put_resp.status_code == 200
        assert put_resp.json()["brands"] == ["Nike", "Adidas"]

        get_resp = client.get("/api/brands")
        assert get_resp.json()["brands"] == ["Nike", "Adidas"]


def test_add_brand_appends_and_preserves_order(tmp_path) -> None:
    from app.services.brands import add_brand, get_brands

    brands_file = tmp_path / "brands.json"
    with patch("app.services.brands.STORAGE_ROOT", tmp_path), patch(
        "app.services.brands._BRANDS_FILE", brands_file
    ):
        add_brand("A")
        add_brand("B")
        add_brand("A")
        add_brand("C")
        assert get_brands() == ["A", "B", "C"]
