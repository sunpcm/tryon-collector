# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the repo root via `make`:

```bash
make install          # Install frontend (pnpm) + backend (uv) deps
make dev              # Start frontend (Vite :5180 HTTPS) + backend (FastAPI :8003) concurrently
make test             # Run all tests (Vitest + pytest)
make test-frontend    # Vitest unit/component tests only
make test-backend     # pytest only
make lint             # ESLint + ruff
make e2e              # Playwright E2E (Chromium + WebKit)
make build            # Production frontend build
make clean            # Remove dist, caches, Playwright reports
```

Single test file:
```bash
cd frontend && pnpm vitest run src/path/to/file.test.ts
cd backend && uv run pytest tests/test_specific.py -v
```

## Architecture

```
frontend/   React 19 + Vite + TypeScript
backend/    FastAPI + uvicorn (Python 3.11+)
storage/    Local filesystem only — no DB, no cloud
docs/       Phase plan, API contract, design docs
```

**Frontend** (`frontend/src/`): React 19, Vite, Tailwind v4 (layout only), animal-island-ui v0.7.7 (pinned, no `^`). Path alias `@/` → `src/`. SVGs imported as React components via SVGR. Drag-drop must use `react-dropzone` — no hand-rolled HTML5 events.

**Backend** (`backend/app/`): FastAPI app in `main.py`. Routers in `routers/`. The ingest router (`routers/ingest.py`) handles `POST /api/bundles/batch`. Storage writes go to `storage/raw_ingestion/<uuid>/`.

**API contract** is frozen at v0.1.0 — see `docs/api_contract.md` before touching any endpoint shape. The single endpoint is `POST /api/bundles/batch` (multipart/form-data). Atomicity: all bundles in one request succeed or fail together.

**Storage layout**: `storage/raw_ingestion/<uuid>/` for ingested bundles, `storage/.staging/` for temp writes, `storage/dispatch_log/` for async logs. Symlink support required (Linux/macOS only).

## Tech Stack Constraints

These are hard constraints — do not substitute:

- Package managers: **pnpm** (frontend), **uv** (backend)
- UI library: **animal-island-ui 0.7.7** (pinned exact version)
- Drag-drop: **react-dropzone** only
- E2E: **Playwright** targeting Chromium + WebKit (both mandatory)
- Backend linter: **ruff** line-length 100, rules `E F I W UP B SIM`
- Python: 3.11–3.12

## Known Gotchas

**Clash/Mihomo proxy**: Playwright's `NO_PROXY` bypass is already configured in `playwright.config.ts`. If requests to localhost fail in E2E, check that the proxy bypass is active.

**Vite IPv6**: Vite may bind to `::1` instead of `127.0.0.1`. If the backend can't reach the dev server, use `localhost` not `127.0.0.1` in URLs.

**pnpm approve-builds**: Some packages require explicit build approval. Run `pnpm approve-builds` if install fails with a build script warning.

**`make dev` process group**: `make dev` spawns a process group. Use `Ctrl+C` once to kill both frontend and backend; killing only one may leave the other running.

**Self-signed HTTPS in dev**: Vite serves on `https://localhost:5180` via `@vitejs/plugin-basic-ssl`. Browsers warn on first visit — accept the cert once per browser. Required so LAN clients land in a secure context (`crypto.randomUUID`, Clipboard, Service Worker all need this). Production (`./scripts/run.sh` or systemd) is plain HTTP on `:8082` and is unaffected.

## Key Docs

| Doc | Purpose |
|-----|---------|
| `docs/api_contract.md` | Frozen API spec — read before changing any endpoint |
| `docs/phase_plan.md` | Full phase breakdown, UI component strategy, E2E requirements |
| `docs/phases/phase_0.md` | Phase 0 completion summary + Phase 1 ticket list |
| `docs/HOW_TO_RESUME.md` | Cross-session continuity guide for Claude Code |
