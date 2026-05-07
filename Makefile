.PHONY: help install dev dev-frontend dev-backend test test-frontend test-backend \
        lint lint-frontend lint-backend e2e build clean deploy

help:
	@echo "Tryon Collector · make targets"
	@echo ""
	@echo "  make install        Install frontend (pnpm) and backend (uv) deps"
	@echo "  make dev            Run frontend + backend concurrently"
	@echo "  make deploy         Build frontend + serve from single uvicorn process"
	@echo "  make test           Run frontend (Vitest) + backend (pytest)"
	@echo "  make lint           Run ESLint + ruff"
	@echo "  make e2e            Run Playwright (chromium + webkit)"
	@echo "  make build          Build frontend for production"
	@echo "  make clean          Remove dist / caches / playwright reports"

install:
	cd frontend && pnpm install --frozen-lockfile
	cd backend && uv sync --group dev

dev-frontend:
	cd frontend && pnpm dev

dev-backend:
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev:
	@echo "→ starting backend on :8000 and frontend on :5173"
	@trap 'kill 0' INT TERM EXIT; \
	 (cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) & \
	 (cd frontend && pnpm dev) & \
	 wait

test-frontend:
	cd frontend && pnpm test:run

test-backend:
	cd backend && uv run pytest

test: test-frontend test-backend

lint-frontend:
	cd frontend && pnpm lint && pnpm type-check

lint-backend:
	cd backend && uv run ruff check .

lint: lint-frontend lint-backend

e2e:
	cd frontend && pnpm exec playwright test --project=chromium --project=webkit

build:
	cd frontend && pnpm build

clean:
	cd frontend && rm -rf dist coverage playwright-report test-results .vite
	cd backend && rm -rf .pytest_cache .ruff_cache

deploy:
	./scripts/run.sh
