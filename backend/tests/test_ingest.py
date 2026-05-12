"""Tests for POST /api/bundles/batch — Phase 1 route implementation."""

from __future__ import annotations

import io
import json
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_SUBMIT_ID = str(uuid.uuid4())
_SUBMIT_ID_2 = str(uuid.uuid4())


def _jpeg(name: str = "img.jpg") -> tuple[str, io.BytesIO, str]:
    return (name, io.BytesIO(b"\xff\xd8\xff" + b"x" * 100), "image/jpeg")


def _multipart(
    group_keys: list[str],
    submit_id: str = _SUBMIT_ID,
    missing_role: str | None = None,
    bad_mime_key: str | None = None,
) -> dict:
    bundles = []
    files: dict[str, tuple] = {}
    for gk in group_keys:
        roles = ["product", "tryon", "retouched"]
        file_refs = {}
        for role in roles:
            field = f"file_{gk}_{role}"
            file_refs[role] = field
            if missing_role and gk == group_keys[-1] and role == missing_role:
                continue  # omit this file field to simulate missing
            mime = "text/plain" if bad_mime_key == f"{gk}_{role}" else "image/jpeg"
            files[field] = _jpeg(f"{gk}_{role}.jpg")[:2] + (mime,)
        bundles.append({"group_key": gk, "files": file_refs})

    data = {
        "designer_id": "张三",
        "business_line": "迪桑特",
        "category": "T恤",
        "optional_notes": "",
        "client_submit_id": submit_id,
        "bundles": json.dumps(bundles),
    }
    return data, files


def _post(data: dict, files: dict, tmp_path) -> dict:
    with patch("app.services.bundle.STORAGE_ROOT", tmp_path), patch(
        "app.services.idempotency.STORAGE_ROOT", tmp_path
    ):
        response = client.post(
            "/api/bundles/batch",
            data=data,
            files={k: v for k, v in files.items()},
        )
    return response


def test_happy_path_single_bundle(tmp_path):
    data, files = _multipart(["SKU001"])
    resp = _post(data, files, tmp_path)
    assert resp.status_code == 200
    body = resp.json()
    assert body["submit_id"] == _SUBMIT_ID
    assert len(body["accepted"]) == 1
    assert body["accepted"][0]["group_key"] == "SKU001"
    assert "task_id" in body["accepted"][0]
    assert body["rejected"] == []


def test_happy_path_multiple_bundles(tmp_path):
    sid = str(uuid.uuid4())
    data, files = _multipart(["SKU001", "SKU002", "SKU003"], submit_id=sid)
    resp = _post(data, files, tmp_path)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["accepted"]) == 3
    assert body["rejected"] == []


def test_partial_success_missing_role(tmp_path):
    """Last bundle missing 'retouched' → rejected; first bundle still accepted."""
    sid = str(uuid.uuid4())
    data, files = _multipart(["GOOD01", "BAD001"], submit_id=sid, missing_role="retouched")
    resp = _post(data, files, tmp_path)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["accepted"]) == 1
    assert body["accepted"][0]["group_key"] == "GOOD01"
    assert len(body["rejected"]) == 1
    assert body["rejected"][0]["group_key"] == "BAD001"
    assert body["rejected"][0]["reason"] == "missing_role"


def test_idempotency_returns_same_response(tmp_path):
    sid = str(uuid.uuid4())
    data, files = _multipart(["SKU_IDEM"], submit_id=sid)
    resp1 = _post(data, files, tmp_path)
    assert resp1.status_code == 200
    body1 = resp1.json()

    # second call with same submit_id — files don't matter, idempotency kicks in
    with patch("app.services.bundle.STORAGE_ROOT", tmp_path), patch(
        "app.services.idempotency.STORAGE_ROOT", tmp_path
    ):
        resp2 = client.post(
            "/api/bundles/batch",
            data=data,
            files={k: v for k, v in files.items()},
        )
    assert resp2.status_code == 200
    assert resp2.json() == body1


def test_invalid_content_type():
    resp = client.post("/api/bundles/batch", json={})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "multipart/form-data required"


def test_invalid_designer_id(tmp_path):
    sid = str(uuid.uuid4())
    data, files = _multipart(["SKU001"], submit_id=sid)
    data["designer_id"] = ""
    resp = _post(data, files, tmp_path)
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_designer_id"


def test_invalid_submit_id(tmp_path):
    data, files = _multipart(["SKU001"])
    data["client_submit_id"] = "not-a-uuid"
    resp = _post(data, files, tmp_path)
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_submit_id"


def test_invalid_business_line(tmp_path):
    sid = str(uuid.uuid4())
    data, files = _multipart(["SKU001"], submit_id=sid)
    data["business_line"] = "不存在的业务线"
    resp = _post(data, files, tmp_path)
    assert resp.status_code == 422
    assert resp.json()["detail"] == "invalid_tag"


def test_duplicate_group_key_allowed(tmp_path):
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
    resp = _post(data, files, tmp_path)
    assert resp.status_code == 200
    assert len(resp.json()["accepted"]) == 2


def test_replaces_task_id_soft_deletes_original(tmp_path):
    sid1 = str(uuid.uuid4())
    data1, files1 = _multipart(["SKU007"], submit_id=sid1)
    resp1 = _post(data1, files1, tmp_path)
    assert resp1.status_code == 200
    original_task_id = resp1.json()["accepted"][0]["task_id"]

    sid2 = str(uuid.uuid4())
    data2, files2 = _multipart(["SKU007"], submit_id=sid2)
    data2["replaces_task_id"] = original_task_id
    resp2 = _post(data2, files2, tmp_path)
    assert resp2.status_code == 200
    assert len(resp2.json()["accepted"]) == 1

    original_meta = json.loads(
        (tmp_path / "raw_ingestion" / original_task_id / "metadata.json").read_text(
            encoding="utf-8"
        )
    )
    assert "deleted_at" in original_meta
    assert original_meta["deleted_by"] == "张三"


def test_replaces_task_id_ignored_when_all_rejected(tmp_path):
    sid1 = str(uuid.uuid4())
    data1, files1 = _multipart(["SKU008"], submit_id=sid1)
    resp1 = _post(data1, files1, tmp_path)
    original_task_id = resp1.json()["accepted"][0]["task_id"]

    sid2 = str(uuid.uuid4())
    data2, files2 = _multipart(["SKU008"], submit_id=sid2, missing_role="product")
    data2["replaces_task_id"] = original_task_id
    resp2 = _post(data2, files2, tmp_path)
    assert resp2.json()["accepted"] == []

    original_meta = json.loads(
        (tmp_path / "raw_ingestion" / original_task_id / "metadata.json").read_text(
            encoding="utf-8"
        )
    )
    assert "deleted_at" not in original_meta


def test_health_still_works():
    resp = client.get("/health")
    assert resp.status_code == 200
