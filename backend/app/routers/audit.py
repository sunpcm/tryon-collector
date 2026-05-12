"""Read-only audit endpoint for browsing recent bundles."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Body, Query
from fastapi.responses import JSONResponse

from app.services.bundle import STORAGE_ROOT
from app.services.tags import get_tags

router = APIRouter()


def _bundle_dir(task_id: str) -> Path:
    return STORAGE_ROOT / "raw_ingestion" / task_id


def _err(code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=code, content={"detail": detail})


def _read_meta(task_dir: Path) -> dict | None:
    meta_path = task_dir / "metadata.json"
    if not meta_path.is_file():
        return None
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _write_meta(task_dir: Path, meta: dict) -> None:
    (task_dir / "metadata.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _load_bundles(include_deleted: bool) -> list[dict]:
    """Read all metadata.json from raw_ingestion/, sorted by upload_time desc."""
    root = STORAGE_ROOT / "raw_ingestion"
    if not root.exists():
        return []

    bundles: list[dict] = []
    for task_dir in root.iterdir():
        meta = _read_meta(task_dir)
        if meta is None:
            continue
        if not include_deleted and meta.get("deleted_at"):
            continue
        bundles.append(meta)
    bundles.sort(key=lambda b: b.get("upload_time", ""), reverse=True)
    return bundles


@router.get("/audit/bundles")
def list_bundles(
    designer_id: str | None = Query(None, description="按花名筛选"),
    category: str | None = Query(None, description="按品类筛选"),
    include_deleted: bool = Query(False, description="是否包含软删记录"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    """List recent bundles with optional filtering and pagination."""
    bundles = _load_bundles(include_deleted=include_deleted)

    if designer_id:
        bundles = [b for b in bundles if b.get("designer_id") == designer_id]
    if category:
        bundles = [b for b in bundles if b.get("category") == category]

    total = len(bundles)
    page = bundles[offset : offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "bundles": page,
    }


_PATCHABLE_FIELDS = {"title", "business_line", "category", "optional_notes"}


@router.patch("/audit/bundles/{task_id}")
def patch_bundle(
    task_id: str,
    payload: dict = Body(...),
    actor: str | None = Query(None, description="发起编辑的花名（仅审计用）"),
) -> JSONResponse:
    task_dir = _bundle_dir(task_id)
    meta = _read_meta(task_dir)
    if meta is None:
        return _err(404, "not_found")
    if meta.get("deleted_at"):
        return _err(409, "already_deleted")

    updates = {k: v for k, v in payload.items() if k in _PATCHABLE_FIELDS}
    if not updates:
        return _err(422, "no_patchable_fields")

    tags = get_tags()
    valid_business_lines = set(tags.get("business_lines", []))
    valid_categories = set(tags.get("categories", []))
    if "business_line" in updates:
        bl = str(updates["business_line"]).strip()
        if bl and bl not in valid_business_lines:
            return _err(422, "invalid_tag")
        updates["business_line"] = bl
    if "category" in updates:
        cat = str(updates["category"]).strip()
        if cat and cat not in valid_categories:
            return _err(422, "invalid_tag")
        updates["category"] = cat
    if "title" in updates:
        updates["title"] = str(updates["title"]).strip()[:200]
    if "optional_notes" in updates:
        notes = str(updates["optional_notes"])
        if len(notes) > 500:
            return _err(422, "invalid_optional_notes")
        updates["optional_notes"] = notes

    meta.update(updates)
    meta["updated_at"] = _now_iso()
    if actor:
        meta["updated_by"] = actor.strip()[:32]
    _write_meta(task_dir, meta)
    return JSONResponse(status_code=200, content=meta)


@router.delete("/audit/bundles/{task_id}")
def delete_bundle(
    task_id: str,
    actor: str | None = Query(None, description="发起删除的花名（仅审计用）"),
) -> JSONResponse:
    task_dir = _bundle_dir(task_id)
    meta = _read_meta(task_dir)
    if meta is None:
        return _err(404, "not_found")
    if meta.get("deleted_at"):
        return JSONResponse(status_code=200, content=meta)

    meta["deleted_at"] = _now_iso()
    if actor:
        meta["deleted_by"] = actor.strip()[:32]
    _write_meta(task_dir, meta)
    return JSONResponse(status_code=200, content=meta)

