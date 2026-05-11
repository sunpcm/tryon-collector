"""Brand catalogue router — GET /api/brands, PUT /api/brands."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.brands import get_brands, save_brands

router = APIRouter()


class BrandsPayload(BaseModel):
    brands: list[str]


@router.get("/brands")
def list_brands() -> dict[str, list[str]]:
    return {"brands": get_brands()}


@router.put("/brands")
def replace_brands(payload: BrandsPayload) -> JSONResponse:
    cleaned = [b.strip() for b in payload.brands if b.strip()]
    seen: set[str] = set()
    deduped: list[str] = []
    for b in cleaned:
        if b not in seen:
            seen.add(b)
            deduped.append(b)
    save_brands(deduped)
    return JSONResponse(status_code=200, content={"brands": deduped})
