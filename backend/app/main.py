"""FastAPI application factory and top-level wiring."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.routers import audit, ingest, tags
from app.services.idempotency import cleanup_stale_staging

_DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
_DEFAULT_DISK_LIMIT_GB = 10


def _dir_size_bytes(path: Path) -> int:
    """Return total size of all files under *path* (non-recursive symlinks)."""
    total = 0
    for f in path.rglob("*"):
        if f.is_file() and not f.is_symlink():
            total += f.stat().st_size
    return total


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

    @app.middleware("http")
    async def disk_watermark(request: Request, call_next):
        if request.method == "POST" and request.url.path == "/api/bundles/batch":
            limit_gb = float(os.getenv("TRYON_DISK_LIMIT_GB", _DEFAULT_DISK_LIMIT_GB))
            limit_bytes = limit_gb * 1024 * 1024 * 1024
            if _STORAGE_DIR.is_dir() and _dir_size_bytes(_STORAGE_DIR) >= limit_bytes:
                return JSONResponse(
                    status_code=503,
                    content={
                        "detail": "disk_watermark_exceeded",
                        "message": f"存储空间已达 {limit_gb}GB 上限，请联系管理员清理后重试",
                    },
                )
        return await call_next(request)

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok", "mode": os.getenv("VITE_API_MODE", "live")}

    app.include_router(ingest.router, prefix="/api", tags=["ingest"])
    app.include_router(audit.router, prefix="/api", tags=["audit"])
    app.include_router(tags.router, prefix="/api", tags=["tags"])

    # Production mode: serve frontend static build from the same port.
    if _DIST_DIR.is_dir():
        app.mount("/assets", StaticFiles(directory=_DIST_DIR / "assets"), name="static-assets")

        @app.get("/{full_path:path}")
        async def serve_spa(request: Request, full_path: str):  # noqa: ARG001
            file = _DIST_DIR / full_path
            if file.is_file():
                return FileResponse(file)
            return FileResponse(_DIST_DIR / "index.html")

    return app


app = create_app()
