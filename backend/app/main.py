"""FastAPI application factory and top-level wiring."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ingest
from app.services.idempotency import cleanup_stale_staging


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):  # noqa: ARG001
        cleanup_stale_staging()
        yield

    app = FastAPI(
        title="Tryon Collector",
        version="0.1.0",
        description="Ingestion layer for designer-uploaded try-on bundles.",
        lifespan=lifespan,
    )

    # Local-network tool; permissive CORS is intentional and bounded by the LAN perimeter.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok", "mode": os.getenv("VITE_API_MODE", "live")}

    app.include_router(ingest.router, prefix="/api", tags=["ingest"])
    return app


app = create_app()
