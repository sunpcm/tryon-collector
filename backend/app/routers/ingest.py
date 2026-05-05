"""Bundle ingestion router — Phase 0 placeholder.

Real implementation (atomic .staging/ → raw_ingestion/ rename, idempotency key,
SHA-256 dedup) lands in Phase 1 per docs/phase_plan.md §3 Phase 1.
"""

from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter()


@router.post("/bundles/batch", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def submit_bundles_batch() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "detail": "Not implemented. Scheduled for Phase 1 per docs/phase_plan.md.",
            "contract": "docs/api_contract.md",
        },
    )
