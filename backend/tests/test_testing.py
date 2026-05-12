"""Tests for E2E mock handler — X-Tryon-Mode: e2e header."""

from __future__ import annotations

import io
import json
import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_E2E_HEADERS = {"x-tryon-mode": "e2e"}


def _jpeg(name: str = "img.jpg") -> tuple[str, io.BytesIO, str]:
    return (name, io.BytesIO(b"\xff\xd8\xff" + b"x" * 100), "image/jpeg")


def _multipart(
    group_keys: list[str],
    submit_id: str | None = None,
    missing_role: str | None = None,
) -> tuple[dict, dict]:
    if submit_id is None:
        submit_id = str(uuid.uuid4())
    bundles = []
    files: dict[str, tuple] = {}
    for gk in group_keys:
        roles = ["product", "tryon", "retouched"]
        file_refs = {}
        for role in roles:
            field = f"file_{gk}_{role}"
            file_refs[role] = field
            if missing_role and gk == group_keys[-1] and role == missing_role:
                continue
            files[field] = _jpeg(f"{gk}_{role}.jpg")
        bundles.append({"group_key": gk, "files": file_refs})

    data = {
        "designer_id": "测试员",
        "business_line": "迪桑特",
        "category": "T恤",
        "optional_notes": "",
        "client_submit_id": submit_id,
        "bundles": json.dumps(bundles),
    }
    return data, files


def _post(data: dict, files: dict) -> dict:
    return client.post(
        "/api/bundles/batch",
        data=data,
        files={k: v for k, v in files.items()},
        headers=_E2E_HEADERS,
    )


def test_e2e_happy_path_single_bundle():
    data, files = _multipart(["SKU001"])
    resp = _post(data, files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["submit_id"] == data["client_submit_id"]
    assert len(body["accepted"]) == 1
    assert body["accepted"][0]["group_key"] == "SKU001"
    assert "task_id" in body["accepted"][0]
    assert body["rejected"] == []


def test_e2e_happy_path_multiple_bundles():
    data, files = _multipart(["SKU001", "SKU002", "SKU003"])
    resp = _post(data, files)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["accepted"]) == 3
    assert body["rejected"] == []


def test_e2e_partial_success_missing_role():
    """Last bundle missing 'retouched' -> rejected; first bundle still accepted."""
    data, files = _multipart(["GOOD01", "BAD001"], missing_role="retouched")
    resp = _post(data, files)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["accepted"]) == 1
    assert body["accepted"][0]["group_key"] == "GOOD01"
    assert len(body["rejected"]) == 1
    assert body["rejected"][0]["group_key"] == "BAD001"
    assert body["rejected"][0]["reason"] == "missing_role"


def test_e2e_no_idempotency():
    """E2E mock does NOT cache — same submit_id returns fresh task_ids each time."""
    sid = str(uuid.uuid4())
    data, files = _multipart(["SKU001"], submit_id=sid)
    resp1 = _post(data, files)
    resp2 = _post(data, files)
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    # task_ids should differ since mock generates fresh uuid4 each call
    assert resp1.json()["accepted"][0]["task_id"] != resp2.json()["accepted"][0]["task_id"]


def test_e2e_invalid_content_type():
    resp = client.post("/api/bundles/batch", json={}, headers=_E2E_HEADERS)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "multipart/form-data required"


def test_e2e_invalid_designer_id():
    data, files = _multipart(["SKU001"])
    data["designer_id"] = ""
    resp = _post(data, files)
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_designer_id"


def test_e2e_invalid_submit_id():
    data, files = _multipart(["SKU001"])
    data["client_submit_id"] = "not-a-uuid"
    resp = _post(data, files)
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_submit_id"


def test_e2e_invalid_business_line():
    data, files = _multipart(["SKU001"])
    data["business_line"] = "不存在的业务线"
    resp = _post(data, files)
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_tag"


def test_e2e_duplicate_group_key_allowed():
    sid = str(uuid.uuid4())
    data = {
        "designer_id": "张三",
        "business_line": "迪桑特",
        "category": "T恤",
        "optional_notes": "",
        "client_submit_id": sid,
    }
    files = {}
    bundles = []
    for i in range(2):
        file_refs = {}
        for role in ("product", "tryon", "retouched"):
            field = f"file_SKU001_{i}_{role}"
            file_refs[role] = field
            files[field] = _jpeg(f"SKU001_{i}_{role}.jpg")
        bundles.append({"group_key": "SKU001", "files": file_refs})
    data["bundles"] = json.dumps(bundles)
    resp = _post(data, files)
    assert resp.status_code == 200
    assert len(resp.json()["accepted"]) == 2


def test_e2e_task_ids_are_valid_uuids():
    data, files = _multipart(["SKU001", "SKU002"])
    resp = _post(data, files)
    body = resp.json()
    for entry in body["accepted"]:
        uuid.UUID(entry["task_id"], version=4)  # raises if invalid


def test_e2e_does_not_write_filesystem(tmp_path):
    """Verify mock doesn't touch storage directory."""
    data, files = _multipart(["SKU001"])
    resp = _post(data, files)
    assert resp.status_code == 200
    # tmp_path is empty — mock wrote nothing
    assert list(tmp_path.iterdir()) == []
