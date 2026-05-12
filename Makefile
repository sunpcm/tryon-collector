.PHONY: help install dev dev-frontend dev-backend test test-frontend test-backend \
        lint lint-frontend lint-backend e2e build clean deploy

SHELL := /usr/bin/env bash

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
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload

# find_free_port BASE NAME → echoes first free port starting at BASE, up to BASE+9
define find_free_port
	port=$(1); \
	for _ in {0..9}; do \
	  if ! (exec 3<>/dev/tcp/127.0.0.1/$$port) 2>/dev/null; then \
	    echo $$port; break; \
	  fi; \
	  exec 3>&- 2>/dev/null || true; \
	  port=$$((port+1)); \
	done
endef

dev:
	@set -e; \
	 BACKEND_PORT=$$($(call find_free_port,8003)); \
	 FRONTEND_PORT=$$($(call find_free_port,5180)); \
	 if [[ -z $$BACKEND_PORT || -z $$FRONTEND_PORT ]]; then \
	   echo "✗ no free port within 10 attempts (backend base 8003, frontend base 5180)"; \
	   exit 1; \
	 fi; \
	 echo "→ backend :$$BACKEND_PORT  frontend :$$FRONTEND_PORT"; \
	 export BACKEND_URL="http://127.0.0.1:$$BACKEND_PORT"; \
	 export FRONTEND_PORT; \
	 trap 'kill 0' INT TERM EXIT; \
	 (cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port $$BACKEND_PORT --reload) & \
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
