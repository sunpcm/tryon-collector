"""Showcase ingestion router — POST /api/showcases/batch, GET /api/showcases.

Independent of the bundle-ingestion contract (v0.1.0). See
docs/api_contract.md for bundle semantics; showcases have their own shape:
brand + optional purpose + any number of image/video files per submit.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from app.services.brands import add_brand
from app.services.showcase import (
    ALLOWED_MIMES,
    ShowcaseSaveError,
    list_showcases,
    max_bytes_for,
    save_showcase,
)

router = APIRouter()


def _err(code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=code, content={"detail": detail})


@router.post("/showcases/batch")
async def submit_showcase(request: Request) -> JSONResponse:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type:
        return _err(400, "multipart/form-data required")

    form = await request.form()

    uploader = str(form.get("uploader", "")).strip()
    if not uploader or len(uploader) > 32:
        return _err(422, "invalid_uploader")

    brand = str(form.get("brand", "")).strip()
    if not brand or len(brand) > 64:
        return _err(422, "invalid_brand")

    purpose = str(form.get("purpose", "")).strip()[:200]

    client_submit_id = str(form.get("client_submit_id", ""))
    try:
        uuid.UUID(client_submit_id, version=4)
    except ValueError:
        return _err(422, "invalid_client_submit_id")

    upload_files = [v for k, v in form.multi_items() if k == "files" and hasattr(v, "filename")]
    if not upload_files:
        return _err(422, "no_files")

    prepared: list[tuple[str, object, str]] = []
    for uf in upload_files:
        mime = uf.content_type or ""
        if mime not in ALLOWED_MIMES:
            return _err(415, f"unsupported_mime:{mime}")
        data = await uf.read()
        limit = max_bytes_for(mime)
        if len(data) > limit:
            return _err(413, f"file_too_large:{uf.filename}")
        from io import BytesIO
        prepared.append((uf.filename or "unnamed", BytesIO(data), mime))

    try:
        showcase_id = save_showcase(
            submit_id=client_submit_id,
            files=prepared,
            meta={"uploader": uploader, "brand": brand, "purpose": purpose},
        )
    except ShowcaseSaveError as exc:
        return _err(500, f"save_failed:{exc}")

    add_brand(brand)

    return JSONResponse(
        status_code=201,
        content={"showcase_id": showcase_id, "submit_id": client_submit_id},
    )


@router.get("/showcases")
def list_showcases_endpoint(
    uploader: str | None = Query(None),
    brand: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return list_showcases(uploader=uploader, brand=brand, limit=limit, offset=offset)
