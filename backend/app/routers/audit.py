"""Read-only audit endpoint for browsing recent bundles."""

from __future__ import annotations

import json

from fastapi import APIRouter, Query

from app.services.bundle import STORAGE_ROOT

router = APIRouter()


def _load_bundles() -> list[dict]:
    """Read all metadata.json from raw_ingestion/, sorted by upload_time desc."""
    root = STORAGE_ROOT / "raw_ingestion"
    if not root.exists():
        return []

    bundles: list[dict] = []
    for task_dir in root.iterdir():
        meta_path = task_dir / "metadata.json"
        if meta_path.is_file():
            try:
                bundles.append(json.loads(meta_path.read_text(encoding="utf-8")))
            except (json.JSONDecodeError, OSError):
                continue
    bundles.sort(key=lambda b: b.get("upload_time", ""), reverse=True)
    return bundles


@router.get("/audit/bundles")
def list_bundles(
    designer_id: str | None = Query(None, description="按花名筛选"),
    category: str | None = Query(None, description="按品类筛选"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    """List recent bundles with optional filtering and pagination."""
    bundles = _load_bundles()

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
