"""Tags configuration router — GET/PUT /api/tags."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.services.tags import get_tags, save_tags

router = APIRouter()


@router.get("/tags")
def list_tags() -> dict[str, list[str]]:
    return get_tags()


@router.put("/tags")
def update_tags(body: dict[str, list[str]]) -> JSONResponse:
    bl = body.get("business_lines")
    cats = body.get("categories")
    if not isinstance(bl, list) or not isinstance(cats, list):
        return JSONResponse(
            status_code=422,
            content={"detail": "business_lines and categories must be arrays"},
        )
    if not all(isinstance(x, str) and x.strip() for x in bl + cats):
        return JSONResponse(
            status_code=422,
            content={"detail": "all tags must be non-empty strings"},
        )
    save_tags({"business_lines": bl, "categories": cats})
    return JSONResponse(status_code=200, content={"ok": True})
