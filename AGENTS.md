# AGENTS.md — Tryon Collector

> 高密度补丁文件，只写 `CLAUDE.md` / `README.md` 没说、但 agent 必踩的坑。
> 入门请先读 `CLAUDE.md`（命令 + 架构 + 技术栈硬约束），本文件**不重复**那些内容。

---

## 0. 优先阅读顺序

1. `CLAUDE.md` — 命令、架构、技术栈硬约束（**主要事实来源**）
2. `docs/api_contract.md` — v0.1.0 冻结契约，改任何 endpoint 形状前必读
3. `docs/DEPLOYMENT.md` — 生产部署 SOP（systemd 托管，端口 :8082）
4. 本文件 — 上面没写的隐性陷阱
5. `docs/phases/phase_6.md` — 最新阶段，README 进度表里**没列**它（README 仅到 Phase 5）

`frontend/TEMPLATE_GUIDE.md`、`frontend/TESTING_GUIDE.md`、`docs/archive/HOW_TO_RESUME.md` 都是脚手架/历史残留，**与本仓库当前状态无关**，不要按它们办事。

---

## 1. 共用机环境（本服务器特有）

仓库 clone 在 `/opt/workspace/yongli/tryon-collector/`，机器是**共用 root**：

- 全局 git 身份是 `justin.zhang`，**不是** sunpcm。本仓库已通过 repo-local `user.name/email` + `core.sshCommand` 隔离，commit 会走正确身份。**别 `git config --global ...`**。
- SSH 私钥 `.ssh_key` 在仓库根目录，已加入 `.gitignore`。删仓库前先确认 key 来源是否还要保留。
- 全机环境/包管理硬规则（uv / conda 隔离、写操作需许可）见 `/opt/workspace/yongli/AGENTS.md`。
- GitHub clone SOP 见 `/opt/workspace/yongli/GITHUB_SETUP.md`。

---

## 2. 容易写错的执行细节

### 2.1 后端 SPA fallback 是 catch-all（重要）

`backend/app/main.py` 在生产模式（`frontend/dist/` 存在时）注册了：

```python
@app.get("/{full_path:path}")
async def serve_spa(...): ...
```

**这是兜底路由，必须放最后**。新增任何 `app.include_router` 或 `@app.get(...)` 必须在 `_DIST_DIR.is_dir()` 块**之前**注册，否则会被 SPA fallback 吃掉返回 `index.html`。

### 2.2 磁盘水位 middleware 只拦一个 endpoint

`disk_watermark` middleware 仅在 `POST /api/bundles/batch` 上触发 503。新增其它写入磁盘的 endpoint 时**不会**自动受保护，要么手动加判断，要么扩展 middleware 的 path 列表。阈值环境变量是 `TRYON_DISK_LIMIT_GB`（默认 10）。

### 2.3 E2E mock 路径靠请求头切换，不只是环境变量

CLAUDE.md/README 说 `VITE_API_MODE=e2e` 走 mock。**完整链路**：
- 前端读 `VITE_API_MODE=e2e` → 在请求里发 `X-Tryon-Mode: e2e` header
- 后端 `app/testing.py` 的 `handle_mock_submit` 看到这个 header 才进 mock 分支，**不写磁盘**
- `/health` 单纯回显 `VITE_API_MODE` 环境变量，不代表后端真在 mock 模式

改 ingest 校验逻辑时，`backend/app/testing.py` 必须**同步改**，否则 e2e 通过、生产挂掉（或反过来）。

### 2.4 后端 router 不止 `ingest`

CLAUDE.md 只提了 ingest。实际挂载（`main.py`）：
- `routers/ingest.py` — `POST /api/bundles/batch`
- `routers/audit.py` — 审计/查询
- `routers/tags.py` — `GET/PUT /api/tags`（Phase 6 新增，业务线/品类动态配置存 `storage/tags.json`）
- `routers/brands.py` — `GET/PUT /api/brands`（展示图流程用的品牌目录，存 `storage/brands.json`）
- `routers/showcase.py` — `POST /api/showcases/batch` + `GET /api/showcases`（展示图采集，独立于 v0.1.0 bundles 契约）

业务线 / 品类校验列表是**运行时从 `tags.json` 读**，不是硬编码常量。改默认值见 `backend/app/services/tags.py`。

**Showcase 流程**跟 bundle 流程完全独立：存储在 `storage/showcases/<id>/` 下，无 role 分区，支持视频（`video/mp4` 等，见 `services/showcase.py` 的 `ALLOWED_MIMES`），图片上限 50MB、视频 200MB。**不要**把 showcase 字段塞进 `docs/api_contract.md`（那是 bundle v0.1.0 的冻结契约）。

### 2.5 后端环境变量清单

只列实际有人读的：

| 变量 | 默认 | 在哪用 |
|---|---|---|
| `STORAGE_ROOT` | `storage` | bundle/idempotency/dispatcher/retry_queue/tags 都读它，**改路径要全改** |
| `IMG_DC_ROOT` | `img-dc` | dispatcher symlink 目标根目录 |
| `MASK_THRESHOLD` | `30` | mask 服务二值化阈值 |
| `TRYON_DISK_LIMIT_GB` | `10` | 水位告警 |
| `VITE_API_MODE` | `live` | 仅影响 `/health` 回显 |

### 2.6 Python 版本是 `>=3.11,<3.13`（**不是** 3.11+）

`pyproject.toml:5` 明确卡上界。装依赖前确认 `python --version`。

---

## 3. 前端类型/lint 严格度（容易被红线）

- `tsconfig.app.json` 开了 `strict` + `noUnusedLocals` + `noUnusedParameters` + `noFallthroughCasesInSwitch` + `verbatimModuleSyntax`。**未使用变量直接报错**，写完代码必须清干净。
- `verbatimModuleSyntax: true` 意味着只用于类型的 import 必须写 `import type { Foo } from '...'`，否则 build 失败。
- ESLint 启用了 `prettier/prettier: 'error'`，格式问题会让 `pnpm lint` 失败，**不只是警告**。
- 路径别名只有 `@/* → src/*`（`vite.config.ts` 和 `tsconfig.app.json` 同步）。新加别名两处都要改。
- SVG 通过 `vite-plugin-svgr` 当 React 组件 import：`import { ReactComponent as Icon } from './foo.svg'`。

---

## 4. 测试与 commit 流程的隐性成本

### 4.1 husky + lint-staged 会跑相关 vitest

`frontend/package.json` 的 `lint-staged` 配置：

```json
"*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write", "vitest related --run"]
```

每次 `git commit` 都会跑被改文件相关的 vitest。**commit 时间可能比预期长**，别因为"卡住了"中断。

### 4.2 commit message 走 conventional commits

`commitlint.config.mjs` 继承 `@commitlint/config-conventional`，commit-msg hook 由 husky 启用。允许的 type：`feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert`。Subject 用中文 OK（仓库历史里中英文混用都有）。

要交互式提交可以 `cd frontend && pnpm commit`（走 cz-git）。

### 4.3 单测文件位置约定

- 前端：紧邻被测代码的 `__tests__/` 子目录，文件名 `*.test.ts(x)`。例：`frontend/src/features/clustering/__tests__/cluster.test.ts`
- 后端：集中在 `backend/tests/test_*.py`
- E2E：`frontend/e2e/specs/*.spec.ts`，page object 在 `frontend/e2e/pages/`，fixture 图片在 `frontend/e2e/fixtures/`（已有 SKU001-007 七组真实图）

跑单文件：

```bash
cd frontend && pnpm vitest run src/features/clustering/__tests__/cluster.test.ts
cd backend  && uv run pytest tests/test_bundle.py -v
cd frontend && pnpm exec playwright test e2e/specs/mvp.spec.ts --project=chromium
```

### 4.4 CI 的运行顺序

`.github/workflows/ci.yml`：`frontend (lint → type-check → vitest → build)` + `backend (ruff → pytest)` 并行；`e2e` 依赖前两者通过后跑 chromium + webkit 矩阵（webkit 在 Linux runner 上偶发慢/不稳）。本地复现：`make lint && make test && make e2e`。

---

## 5. 存储与符号链接

- `storage/` 是**唯一持久化**，没有 DB、没有云。删了就没了。
- `storage/raw_ingestion/<uuid>/` 是落盘目录；`storage/.staging/` 是写入中间态，启动时 `cleanup_stale_staging` 会清残留（`main.py` lifespan）。
- dispatcher 用 **symlink** 把 raw bundle 链到 `IMG_DC_ROOT`（默认 `img-dc/`）。Windows 不支持，macOS / Linux 才能跑。
- `storage/dispatch_log/`、`storage/raw_ingestion/`、`storage/.staging/` 在 `.gitignore` 里只保留 `.gitkeep`，**真实数据永不入 git**。

最近 phase_6 的一个变更：`backend/app/services/dispatcher.py` 和 mask 生成被**临时禁用**了（见提交 `964a63e feat(backend): disable dispatch and mask generation`），动这俩服务前先确认当前业务诉求。

---

## 6. 改 API 契约前的最低成本核查

`docs/api_contract.md` 标注 v0.1.0 冻结。改任何字段：

1. 先读契约文档对应章节
2. 同步改：`backend/app/routers/<router>.py` + `backend/app/testing.py` + 前端 `frontend/src/api/` + `docs/api_contract.md` 版本号（minor / major）
3. 跑 `make test && make e2e`
4. 改完了在 `docs/phases/phase_*.md` 留痕（团队约定阶段末更新文档）

漏掉 `testing.py` 是最常见的失败模式（见 §2.3）。

---

## 7. 一些"不要做"

- 不要把 Tailwind 当组件库用 — Tailwind v4 在本仓库**只负责布局/间距**，视觉走 `animal-island-ui@0.7.7`（pinned，不写 `^`）
- 不要手写 HTML5 drag-drop — 必须用 `react-dropzone`
- 不要降级 Playwright 矩阵 — chromium **和** webkit 都要跑（CI 强制）
- 不要把 `.env` 提交进去（已在 gitignore，但人工新建 `.env.local` 时注意）
- 不要在共用机上 `pip install` / `uv sync` 不带目标参数 — 见 `/opt/workspace/yongli/AGENTS.md` R3
