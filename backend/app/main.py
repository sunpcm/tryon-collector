"""FastAPI application factory and top-level wiring."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ingest


def create_app() -> FastAPI:
    app = FastAPI(
        title="Tryon Collector",
        version="0.1.0",
        description="Ingestion layer for designer-uploaded try-on bundles.",
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
