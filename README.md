# Tryon Collector

设计师试穿图批量采集工具。局域网内部部署，单机运行，无账号体系。

## 环境要求

| 依赖 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 20 | 前端运行时 |
| pnpm | >= 10 | 前端包管理 |
| Python | 3.11 – 3.12 | 后端运行时 |
| uv | latest | 后端包管理 |

macOS 和 Linux 均可运行。Windows 不支持（依赖 symlink）。

## 快速开始

```bash
# 1. 克隆仓库
git clone <repo-url> && cd tryon-collector

# 2. 安装依赖（前端 pnpm + 后端 uv，一条命令）
make install

# 3. 启动开发服务器（前端 :5173 + 后端 :8000）
make dev
```

浏览器打开 `http://localhost:5173`，首次访问会弹出花名输入框。

> **Ctrl+C** 一次即可同时停止前后端。

## 常用命令

```bash
make install        # 安装前端 (pnpm) + 后端 (uv) 依赖
make dev            # 同时启动前端 :5173 + 后端 :8000
make test           # 运行全部测试（Vitest + pytest）
make test-frontend  # 仅前端单测
make test-backend   # 仅后端单测
make lint           # ESLint + ruff 代码检查
make e2e            # Playwright E2E（Chromium + WebKit）
make build          # 生产构建前端
make clean          # 清理 dist / 缓存 / 测试报告
```

单独运行某个测试文件：

```bash
# 前端
cd frontend && pnpm vitest run src/features/clustering/__tests__/cluster.test.ts

# 后端
cd backend && uv run pytest tests/test_bundle.py -v
```

## 项目结构

```
tryon-collector/
├── frontend/               React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── features/       业务模块（identity / tagging / clustering / melting-pot / matrix）
│   │   ├── components/     通用组件（Tag / Toast / ProgressBar / Tooltip）
│   │   ├── store/          Zustand 状态管理
│   │   ├── api/            后端 API 客户端
│   │   └── types/          领域类型定义
│   └── e2e/                Playwright 测试（fixtures / pages / specs）
├── backend/                FastAPI + uvicorn
│   ├── app/
│   │   ├── routers/        路由（ingest.py — POST /api/bundles/batch）
│   │   ├── services/       业务逻辑（bundle.py / idempotency.py）
│   │   └── models/         数据模型
│   └── tests/              pytest 测试
├── storage/                本地文件存储（运行时生成，不入 git）
│   ├── raw_ingestion/      原始任务包（UUID 目录）
│   ├── .staging/           上传中间态
│   └── dispatch_log/       分发审计日志
├── docs/                   设计文档 + 阶段总结
└── Makefile                统一命令入口
```

## 配置

### 前端环境变量

复制 `frontend/.env.example` 为 `frontend/.env`（可选，开发模式有默认值）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_APP_TITLE` | `Tryon Collector` | 浏览器标签页标题 |
| `VITE_API_BASE_URL` | 空（走 Vite 代理） | API 地址，开发时留空即可 |
| `VITE_API_MODE` | `live` | `e2e` 模式走 mock 后端，不写磁盘 |

### 后端存储路径

后端通过 `STORAGE_ROOT` 环境变量指定存储根目录，默认为项目根目录下的 `storage/`。

```bash
# 自定义存储路径
STORAGE_ROOT=/data/storage make dev-backend
```

## 技术栈

**前端**：React 19 · Vite · TypeScript · Tailwind v4（布局） · animal-island-ui v0.7.7（视觉） · react-dropzone · Zustand · Vitest · Playwright

**后端**：FastAPI · uvicorn · Python 3.11+ · pytest · ruff

**存储**：纯本地文件系统，无数据库、无云服务

## 当前进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 0 · 脚手架 | ✅ 完成 | 项目骨架、契约冻结、CI |
| Phase 1 · 后端摄入 | ✅ 完成 | POST /api/bundles/batch、原子落盘、幂等 |
| Phase 2 · 前端 MVP | ✅ 完成 | Dropzone、聚类、矩阵、批量提交、E2E |
| Phase 3 · 分发对接 | 待开始 | symlink 到训练目录、mask 生成、重试队列 |

阶段总结见 `docs/phases/phase_*.md`。

## 相关文档

| 文档 | 说明 |
|------|------|
| `docs/phase_plan.md` | 完整分阶段实施方案 |
| `docs/api_contract.md` | API 契约（v0.1.0 冻结） |
| `docs/phases/phase_0.md` | Phase 0 总结 |
| `docs/phases/phase_1.md` | Phase 1 总结 |
| `docs/phases/phase_2.md` | Phase 2 总结（含手动测试清单） |
| `docs/HOW_TO_RESUME.md` | 跨会话续接指南 |
