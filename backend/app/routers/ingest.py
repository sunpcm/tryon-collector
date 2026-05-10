"""Bundle ingestion router — Phase 1 implementation.

Parses multipart/form-data per docs/api_contract.md §2.2, validates fields,
calls save_bundle() per bundle, aggregates accepted/rejected, and handles
idempotency via storage/.idempotency/.
"""

from __future__ import annotations

import json
import re
import uuid

from fastapi import APIRouter, BackgroundTasks, Request, UploadFile
from fastapi.responses import JSONResponse

from app.services.bundle import BundleSaveError, save_bundle
from app.services.dispatcher import DispatchError, dispatch_bundle
from app.services.idempotency import get_idempotency, set_idempotency
from app.services.retry_queue import enqueue, process_queue
from app.services.tags import get_tags
from app.testing import handle_mock_submit

router = APIRouter()

_GROUP_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{3,64}$")
_ALLOWED_MIMES = {"image/jpeg", "image/png"}
_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB



def _err(code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=code, content={"detail": detail})


@router.post("/bundles/batch")
async def submit_bundles_batch(request: Request, background_tasks: BackgroundTasks) -> JSONResponse:
    # E2E mock mode: validate + return mock data, no filesystem writes
    if request.headers.get("x-tryon-mode") == "e2e":
        return await handle_mock_submit(request)

    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type:
        return _err(400, "multipart/form-data required")

    form = await request.form()

    # ── field-level validation ──────────────────────────────────────────────
    designer_id = str(form.get("designer_id", "")).strip()
    if not designer_id or len(designer_id) > 32:
        return _err(422, "invalid_designer_id")

    tags = get_tags()
    valid_business_lines = set(tags.get("business_lines", []))
    valid_categories = set(tags.get("categories", []))

    business_line = str(form.get("business_line", ""))
    if business_line not in valid_business_lines:
        return _err(422, "invalid_tag")

    category = str(form.get("category", ""))
    if category not in valid_categories:
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

    # ── idempotency check ───────────────────────────────────────────────────
    cached = get_idempotency(client_submit_id)
    if cached is not None:
        return JSONResponse(status_code=200, content=cached)

    # ── validate group_keys ─────────────────────────────────────────────────
    seen_keys: set[str] = set()
    for bm in bundles_meta:
        gk = bm.get("group_key", "")
        if not _GROUP_KEY_RE.match(gk):
            return _err(422, "invalid_group_key")
        if gk in seen_keys:
            return _err(422, "duplicate_group_key")
        seen_keys.add(gk)

    # ── per-bundle processing ───────────────────────────────────────────────
    meta = {
        "designer_id": designer_id,
        "business_line": business_line,
        "category": category,
        "optional_notes": optional_notes,
    }
    accepted: list[dict] = []
    rejected: list[dict] = []

    for bm in bundles_meta:
        group_key: str = bm["group_key"]
        file_refs: dict = bm.get("files", {})

        # collect UploadFile objects for required + optional roles
        files: dict[str, tuple[str, object, str]] = {}
        bundle_error: dict | None = None

        for role in ("product", "tryon", "retouched", "annotated"):
            required = role != "annotated"
            field_name = file_refs.get(role)
            if field_name is None:
                if required:
                    bundle_error = {
                        "group_key": group_key,
                        "reason": "missing_role",
                        "detail": f"bundles[].files.{role} not declared",
                    }
                    break
                continue

            upload: UploadFile | None = form.get(field_name)
            if upload is None or not hasattr(upload, "read"):
                if required:
                    bundle_error = {
                        "group_key": group_key,
                        "reason": "missing_role",
                        "detail": f"file field {field_name} not present",
                    }
                    break
                continue

            mime = upload.content_type or ""
            if mime not in _ALLOWED_MIMES:
                bundle_error = {
                    "group_key": group_key,
                    "reason": "invalid_mime",
                    "detail": f"{field_name} has unsupported MIME {mime!r}",
                }
                break

            data = await upload.read()
            if len(data) > _MAX_FILE_BYTES:
                bundle_error = {
                    "group_key": group_key,
                    "reason": "file_too_large",
                    "detail": f"{field_name} exceeds 20 MB",
                }
                break

            import io

            files[role] = (upload.filename or field_name, io.BytesIO(data), mime)

        if bundle_error:
            rejected.append(bundle_error)
            continue

        try:
            task_id = save_bundle(client_submit_id, group_key, files, meta)
            # dispatch symlinks to img-dc training dir
            try:
                dispatch_bundle(task_id)
            except DispatchError as exc:
                enqueue(task_id, str(exc))
                background_tasks.add_task(process_queue)
            accepted.append({"group_key": group_key, "task_id": task_id})
        except BundleSaveError as exc:
            reason = "disk_full" if "No space left" in str(exc) else "internal_error"
            rejected.append({"group_key": group_key, "reason": reason, "detail": str(exc)})

    response_body = {
        "submit_id": client_submit_id,
        "accepted": accepted,
        "rejected": rejected,
    }
    set_idempotency(client_submit_id, response_body)
    return JSONResponse(status_code=200, content=response_body)
