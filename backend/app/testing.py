"""E2E mock handler — activated by X-Tryon-Mode: e2e header.

Performs the same field-level validation as the real ingest router but generates
in-memory mock responses without writing to the filesystem. This allows Playwright
E2E tests to exercise the full submit flow without side effects.
"""

from __future__ import annotations

import json
import re
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse

_GROUP_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{3,64}$")

VALID_BUSINESS_LINES = {"春季女装", "秋季女装", "春季男装", "秋季男装", "童装", "配饰"}
VALID_CATEGORIES = {"连衣裙", "上衣", "裤子", "外套", "裙子", "鞋履", "包袋", "其他"}


def _err(code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=code, content={"detail": detail})


async def handle_mock_submit(request: Request) -> JSONResponse:
    """Mirror ingest.py validation, return mock accepted/rejected without disk I/O."""
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type:
        return _err(400, "multipart/form-data required")

    form = await request.form()

    designer_id = str(form.get("designer_id", "")).strip()
    if not designer_id or len(designer_id) > 32:
        return _err(422, "invalid_designer_id")

    business_line = str(form.get("business_line", ""))
    if business_line not in VALID_BUSINESS_LINES:
        return _err(422, "invalid_tag")

    category = str(form.get("category", ""))
    if category not in VALID_CATEGORIES:
        return _err(422, "invalid_tag")

    optional_notes = str(form.get("optional_notes", ""))
    if len(optional_notes) > 500:
        return _err(422, "invalid_optional_notes")

    client_submit_id = str(form.get("client_submit_id", ""))
    try:
        uuid.UUID(client_submit_id, version=4)
    except (ValueError, AttributeError):
        return _err(422, "invalid_submit_id")

    bundles_raw = str(form.get("bundles", ""))
    try:
        bundles_meta: list[dict] = json.loads(bundles_raw)
        if not isinstance(bundles_meta, list) or len(bundles_meta) == 0:
            raise ValueError
    except (ValueError, json.JSONDecodeError):
        return _err(422, "invalid_bundles")
    if len(bundles_meta) > 50:
        return _err(422, "bundle_limit_exceeded")

    # validate group_keys
    seen_keys: set[str] = set()
    for bm in bundles_meta:
        gk = bm.get("group_key", "")
        if not _GROUP_KEY_RE.match(gk):
            return _err(422, "invalid_group_key")
        if gk in seen_keys:
            return _err(422, "duplicate_group_key")
        seen_keys.add(gk)

    # generate mock responses
    accepted: list[dict] = []
    rejected: list[dict] = []

    for bm in bundles_meta:
        group_key: str = bm["group_key"]
        file_refs: dict = bm.get("files", {})

        # check required roles exist in form
        bundle_error: dict | None = None
        for role in ("product", "tryon", "retouched"):
            field_name = file_refs.get(role)
            if field_name is None:
                bundle_error = {
                    "group_key": group_key,
                    "reason": "missing_role",
                    "detail": f"bundles[].files.{role} not declared",
                }
                break
            upload = form.get(field_name)
            if upload is None or not hasattr(upload, "read"):
                bundle_error = {
                    "group_key": group_key,
                    "reason": "missing_role",
                    "detail": f"file field {field_name} not present",
                }
                break

        if bundle_error:
            rejected.append(bundle_error)
            continue

        accepted.append({"group_key": group_key, "task_id": str(uuid.uuid4())})

    return JSONResponse(
        status_code=200,
        content={
            "submit_id": client_submit_id,
            "accepted": accepted,
            "rejected": rejected,
        },
    )
