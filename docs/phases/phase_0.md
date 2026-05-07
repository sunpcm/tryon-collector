# Phase 0 · 脚手架与契约冻结 · 阶段总结

> 状态：**已完成** ✅（2026-05-05）
> 对应 `phase_plan.md` §3 · Phase 0
> 工期预估：0.75 人日 · 实际投入 ~0.6 人日

## 1. 阶段目标与范围

1. 建立仓库骨架（`frontend/ backend/ storage/ scripts/ docs/`）与根 `.gitignore`。
2. 基于 [`sunpcm/vite-react-template`](https://github.com/sunpcm/vite-react-template) 落地 `frontend/`，接入 `animal-island-ui@0.7.7` 视觉基线与 `less`。
3. 冻结 `POST /api/bundles/batch` 的 multipart schema（`docs/api_contract.md`），作为前后端并行开发的契约基线。
4. 初始化 FastAPI backend（`uv` + pytest + ruff），提供 `/health` 与 `/api/bundles/batch` 占位路由 + `VITE_API_MODE=e2e` 下的 mock 雏形。
5. 根级 `Makefile` 统一入口：`make dev` / `make test` / `make e2e`。
6. 扩展 CI：前端 job 保留 + 后端 pytest job + Playwright E2E job（chromium + webkit 并行，artifact 保留 7 天）。

## 2. 架构与目录变更

```
tryon-collector/
├── .gitignore                     # 覆盖 node_modules、backend .venv、storage 运行时数据
├── Makefile                       # install / dev / test / lint / e2e / build / clean
├── .github/
│   ├── actions/setup-frontend/    # 组合 action：pnpm 10 + Node 22 + 前端依赖
│   └── workflows/ci.yml           # 三 job：frontend / backend / e2e(matrix chromium+webkit)
├── docs/
│   ├── archive/                   # 早期设计文档（system-design.md / ui-wireframe.md）
│   ├── phase_plan.md              # 新增阶段末文档交付强约束（§3 头部）
│   ├── api_contract.md            # 冻结 v0.1.0 合同：POST /api/bundles/batch
│   └── phases/
│       └── phase_0.md             # 本文件
├── frontend/                      # clone 自 vite-react-template（已去 .git）
│   ├── package.json               # name → tryon-collector-frontend; engines node>=20, pnpm>=10
│   ├── playwright.config.ts       # 改造 · 注入 NO_PROXY 绕过本地 Clash 代理
│   ├── e2e/app.spec.ts            # 改写 · Tryon Collector 冒烟（title + #root）
│   ├── index.html                 # title → Tryon Collector
│   ├── src/main.tsx               # 新增 `import 'animal-island-ui/style'`
│   └── ...                        # Vite 7 + React 19 + TS + Vitest + ESLint/Prettier + Husky/lint-staged + Tailwind v4
├── backend/                       # 新增 · FastAPI + uv
│   ├── pyproject.toml             # Python 3.11-3.12；fastapi/uvicorn/python-multipart + dev: pytest/httpx/ruff
│   ├── uv.lock                    # lock 文件入库
│   ├── app/
│   │   ├── main.py                # create_app() + /health + /api mount
│   │   └── routers/ingest.py      # POST /api/bundles/batch 占位 501（指向 Phase 1）
│   └── tests/test_health.py       # 2 cases：/health 200, batch 501
├── storage/
│   ├── raw_ingestion/.gitkeep
│   ├── .staging/.gitkeep
│   └── dispatch_log/.gitkeep
└── scripts/                       # 占位（Phase 5 放 run.sh）
```

**依赖清单（frontend）**
- 新增 dep：`animal-island-ui@0.7.7`（精确锁定，不加 `^`）、`classnames@^2.5.1`
- 新增 devDep：`less@^4.x`（`animal-island-ui` 样式编译依赖）
- 保留 template 原有：`react@^19.1.1`、`react-dom@^19.1.1`、`vite@^7.1`、`vitest@^4.0`、`@playwright/test@^1.57`、`tailwindcss@^4.1.13`、`@tailwindcss/vite`、`tailwind-merge`、`clsx`

**依赖清单（backend · 已落地）**
- Python 3.11-3.12（`uv` 自动拉取到 `backend/.venv/`）
- `fastapi>=0.115` + `uvicorn[standard]>=0.32` + `python-multipart>=0.0.17`
- dev：`pytest>=8.3` + `httpx>=0.28` + `ruff>=0.8`

## 3. 与 phase_plan 的偏差与原因

本阶段有 4 处实际落地与原始 phase_plan 描述不符，均已**同步回写**到 `phase_plan.md`：

| # | 偏差点 | 原始描述 | 实际落地 | 原因 | 已回写位置 |
|---|---|---|---|---|---|
| 1 | 前端单测框架 | Jest + Testing Library | **Vitest + Testing Library** | template 开箱是 Vitest，强换 Jest 零收益且成本 0.5 人日 | §0.1.1 / §5.1 |
| 2 | Tailwind 策略 | 全面禁用 | **保留但仅限 layout utilities**；视觉 token 一律取自 animal-island-ui | template 预装 tailwind v4 + tailwind-merge + clsx，两者职责不冲突，删除反而损失 | §0.1.1（新增「与 Tailwind 的分工」子项） |
| 3 | Playwright 本地运行 | webServer 自动启 dev | **同上 + 显式注入 `NO_PROXY=localhost,127.0.0.1,::1`** | 本机有 Clash 代理（`http_proxy=127.0.0.1:7897`），会劫持 localhost，导致 webServer 启动后 chromium/webkit 连 5173 全部 502 | `playwright.config.ts` 注释说明，未来同机型开发者复用 |
| 4 | CI workflow 位置 | phase_plan 假设 CI 在根目录 | **从 `frontend/.github/` 迁移到仓库根 `.github/`**，新增 backend job（ruff + pytest），裁剪 template 自带的 AI-review / develop 同步等非必需 job | monorepo 布局下 GitHub 只识别根目录 `.github/`；AI-review 需 OpenAI 密钥本项目未配 | `.github/workflows/ci.yml` 三 job 结构即最终态 |

新增约束（§3 头部）：**阶段末必须交付 `docs/phases/phase_<N>.md`**，作为合并门禁。

## 4. 测试要点

### 已跑通 · M1 验收

| 层级 | 命令 | 结果 | 备注 |
|---|---|---|---|
| 前端 lint + type-check | `make lint-frontend`（= `pnpm lint && pnpm type-check`） | ✅ | ESLint 0 告警，tsc 0 错 |
| 后端 lint | `make lint-backend`（= `uv run ruff check .`） | ✅ | "All checks passed!" |
| 前端单测（Vitest） | `make test-frontend` | ✅ 13/13 passed · 1.0 s | `Button.test.tsx` + `App.test.tsx` |
| 后端单测（pytest） | `make test-backend` | ✅ 2/2 passed · 0.2 s | `/health` 返回 ok + `/api/bundles/batch` 返回 501 占位 |
| **聚合 `make test`** | `make test` | ✅ 双端累计 15 测 | |
| Playwright 冒烟（chromium + webkit） | `make e2e` | ✅ 2/2 passed · 7.0 s | 已验证 webServer 自动启 Vite + `NO_PROXY` 生效 |
| `make dev` 双服务 | `make dev` | ✅ | backend `0.0.0.0:8000/health` → `{"status":"ok","mode":"live"}`；frontend `localhost:5173` HMR 正常 |
| 后端占位接口 | `curl -XPOST http://127.0.0.1:8000/api/bundles/batch` | ✅ 501 | body 指向 `docs/api_contract.md` 与 Phase 1 实现 |

**M1 验收结论**：全部 9 项复选框通过，Phase 1 可开工。

### 发现的「陷阱」记录（供后续阶段复用）

1. **Clash/Mihomo 代理劫持 localhost**：任何使用 Node fetch 或 chromium 子进程的工具链（Playwright、Vitest browser mode、Vite preview、httpx）都会继承 `http_proxy/https_proxy/all_proxy`，导致本地回环请求返回 502。已在 `playwright.config.ts` 里通过 `NO_PROXY` 环境变量注入解决。后续若在本地集成测试 / 开发脚本里遇到类似症状，第一时间检查代理。
2. **pnpm approve-builds**：`@tailwindcss/oxide` 与 `esbuild` 会在首次 `pnpm install` 后提示未批准 build scripts。当前不影响开发，但 CI 或首次部署机需执行 `pnpm approve-builds`（交互式）或在 `.npmrc` 里显式 allow。CI 已用 `--frozen-lockfile` 规避首跑问题，但如后续 tailwind oxide 行为异常需排查。
3. **Vite 默认监听 `[::1]` (IPv6)**：`curl http://localhost:5173` 在部分 shell 中走 IPv4 会拿到空 body，改用 `http://127.0.0.1:5173` 或给 Vite 传 `--host 0.0.0.0` 可解。浏览器与 Playwright 不受影响。
4. **`make dev` 进程组管理**：使用 `trap 'kill 0' INT TERM EXIT` 让 Ctrl+C 同时杀掉前后端；若需从脚本内部 kill，须用 `kill -- -PGID` 且注意 set -e 下 kill 返回非零会让外层脚本退出，验证时单独处理。

## 5. 已知风险与遗留项

| 风险 / 遗留 | 影响 | 处置 |
|---|---|---|
| `backend/app/testing.py`（E2E mock）尚未实现 | Phase 2 Playwright 真实走提交路径时会污染 `storage/raw_ingestion/` | Phase 1 与 `services/bundle.py` 同批落地，契约已在 `api_contract.md §4` 冻结 |
| CI 尚未跑过真实 PR 验证 | workflow 语法错误要等首次 PR 才暴露 | Phase 1 首个 PR 合并时即可验证；如有问题立即修 |
| `pnpm approve-builds` 未处理 | CI 首跑可能因 postinstall 跳过产生 Tailwind oxide 告警 | 观察首次 CI 日志，如有告警在 `.npmrc` 追加 `allowBuild` |
| animal-island-ui 0.x 版本 | 后续小版本可能有 breaking | 已锁定精确版本 `0.7.7`，升级需走 RFC |
| 本地 Clash 代理 | 新开发者复现 Playwright 测试时踩同坑 | `playwright.config.ts` 已落地修复；`README.md`（Phase 5 交付）需写「代理环境变量排错」段落 |
| `docs/api_contract.md` 与实现对齐 | Phase 1 实现与契约漂移会坑前端 | 在 PR checklist 里加一行：改 schema 必须同改 `api_contract.md §6 变更表` |

## 6. 下一阶段入口

**Phase 1 第一个 ticket · `services/bundle.py` 原子落盘核心**
- 实现 `save_bundle(submit_id, group_key, files, meta) -> task_id`
- 流程：生成 `task_id` (uuid4) → 创建 `storage/.staging/<task_id>/` → 流式写入四个文件 + 计算 sha256 → 生成 `metadata.json`（按 `api_contract.md §5`）→ `os.rename(.staging/<task_id>, raw_ingestion/<task_id>)` 原子提交
- 异常时清理 staging 残留
- 单测（`tests/test_bundle.py`）：≥ 3 cases — 正常落盘、中途异常残留清理、权限不足回滚
- 关联 `phase_plan.md` §3 Phase 1 「原子落盘」验收

**Phase 1 第二个 ticket · 幂等键实现**
- `storage/.idempotency/<submit_id>.json` 存首次响应
- `POST /api/bundles/batch` 接收后先查 idempotency 文件：命中则直接返回存档；未命中则处理完成后写入，TTL 24h
- 启动时清理 `storage/.staging/` 中 > 1h 的残留目录
- 单测：重复 `client_submit_id` 返回 200 且同 task_id（≥ 1 case）

**Phase 1 第三个 ticket · 路由实现**
- `app/routers/ingest.py::submit_bundles_batch` 从 501 升级为真实实现
- 按 `api_contract.md §2.2` 解析 multipart，逐 Bundle 调用 `save_bundle`，聚合 `accepted/rejected`
- partial-success 场景测试：人为让某 Bundle 缺角色，断言其它仍成功

**Phase 1 验收脚本**（需追加）：
- `make test` 全绿
- 端到端 curl 脚本：`scripts/smoke_submit.sh` 用一个真实 Bundle 调用 `/api/bundles/batch`，断言 `storage/raw_ingestion/<uuid>/` 目录出现且 `metadata.json` 字段完备

Phase 1 完成后，按本文档 §3 偏差表的格式回写到 `phase_plan.md`，并交付 `docs/phases/phase_1.md`。
