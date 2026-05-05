# Phase 0 · 脚手架与契约冻结 · 阶段总结

> 状态：**进行中**（前端脚手架已落地，后端 / API 契约 / Makefile / CI 扩展待完成）
> 对应 `phase_plan.md` §3 · Phase 0
> 工期预估：0.75 人日 · 实际已投入 ~0.4 人日

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
├── .gitignore                     # 新增 · 覆盖 node_modules、backend .venv、storage 运行时数据
├── docs/
│   ├── 1.md / 2.md / 1.png        # 既有设计文档
│   ├── phase_plan.md              # 更新 · 新增阶段末文档交付强约束（§3 头部）
│   └── phases/
│       └── phase_0.md             # 新增 · 本文件
├── frontend/                      # 新增 · clone 自 vite-react-template，已去 .git
│   ├── package.json               # name → tryon-collector-frontend; engines node>=20, pnpm>=10
│   ├── playwright.config.ts       # 改造 · 注入 NO_PROXY 绕过本地 Clash 代理
│   ├── e2e/app.spec.ts            # 改写 · Tryon Collector 冒烟（title + #root）
│   ├── index.html                 # title → Tryon Collector
│   ├── src/main.tsx               # 新增 `import 'animal-island-ui/style'`
│   └── ...                        # template 保留：Vite 7 + React 19 + TS + Vitest + ESLint/Prettier + Husky/lint-staged + Tailwind v4
├── backend/                       # 占位 · TODO Phase 0 剩余任务落地
├── storage/
│   ├── raw_ingestion/.gitkeep
│   ├── .staging/.gitkeep
│   └── dispatch_log/.gitkeep
└── scripts/                       # 占位
```

**依赖清单（frontend）**
- 新增 dep：`animal-island-ui@0.7.7`（精确锁定，不加 `^`）、`classnames@^2.5.1`
- 新增 devDep：`less@^4.x`（`animal-island-ui` 样式编译依赖）
- 保留 template 原有：`react@^19.1.1`、`react-dom@^19.1.1`、`vite@^7.1`、`vitest@^4.0`、`@playwright/test@^1.57`、`tailwindcss@^4.1.13`、`@tailwindcss/vite`、`tailwind-merge`、`clsx`

**依赖清单（backend，TODO）**
- Python 3.11（通过 `uv` 自动拉取到 `backend/.venv/`）
- `fastapi` + `uvicorn[standard]` + `python-multipart`（multipart 上传）
- `pytest` + `httpx`（TestClient）、`ruff`（lint）

## 3. 与 phase_plan 的偏差与原因

本阶段有 3 处实际落地与原始 phase_plan 描述不符，均已**同步回写**到 `phase_plan.md`：

| # | 偏差点 | 原始描述 | 实际落地 | 原因 | 已回写位置 |
|---|---|---|---|---|---|
| 1 | 前端单测框架 | Jest + Testing Library | **Vitest + Testing Library** | template 开箱是 Vitest，强换 Jest 零收益且成本 0.5 人日 | §0.1.1 / §5.1 |
| 2 | Tailwind 策略 | 全面禁用 | **保留但仅限 layout utilities**；视觉 token 一律取自 animal-island-ui | template 预装 tailwind v4 + tailwind-merge + clsx，两者职责不冲突，删除反而损失 | §0.1.1（新增「与 Tailwind 的分工」子项） |
| 3 | Playwright 本地运行 | webServer 自动启 dev | **同上 + 显式注入 `NO_PROXY=localhost,127.0.0.1,::1`** | 本机有 Clash 代理（`http_proxy=127.0.0.1:7897`），会劫持 localhost，导致 webServer 启动后 chromium/webkit 连 5173 全部 502 | `playwright.config.ts` 注释说明，未来同机型开发者复用 |

新增约束（§3 头部）：**阶段末必须交付 `docs/phases/phase_<N>.md`**，作为合并门禁。

## 4. 测试要点

### 已跑通
| 层级 | 命令 | 结果 | 备注 |
|---|---|---|---|
| 前端单测（template 自带样例） | `pnpm --dir frontend test:run` | ✅ 13/13 passed · 1.0 s | `src/__tests__/components/Button.test.tsx` + `src/__tests__/App.test.tsx` |
| 前端 type-check | `pnpm --dir frontend type-check` | ✅ 无报错 | 引入 animal-island-ui 后验证 |
| Playwright 冒烟（chromium + webkit） | `pnpm --dir frontend exec playwright test --project=chromium --project=webkit` | ✅ 2/2 passed · 3.0 s | `e2e/app.spec.ts` 验证页面标题与根节点 |

### 待交付（Phase 0 剩余）
- [ ] **后端单测骨架**：`pytest backend/` 跑通 `/health` 的 200 校验（≥ 1 case）。
- [ ] **后端 lint**：`ruff check backend/` 零警告。
- [ ] **`make test` 聚合命令**：前端 vitest + 后端 pytest 一次执行。
- [ ] **`make e2e` 聚合命令**：Playwright 双浏览器矩阵。
- [ ] **CI e2e job**：chromium/webkit 并行 shard，artifact 上传 `playwright-report/` 与 trace，保留 7 天。
- [ ] **合并门禁**：前端 lint + vitest + 后端 pytest + Playwright 必须全绿。

### 发现的「陷阱」记录（供后续阶段复用）

1. **Clash/Mihomo 代理劫持 localhost**：任何使用 Node fetch 或 chromium 子进程的工具链（Playwright、Vitest browser mode、Vite preview、httpx）都会继承 `http_proxy/https_proxy/all_proxy`，导致本地回环请求返回 502。已在 `playwright.config.ts` 里通过 `NO_PROXY` 环境变量注入解决。后续若在 M1 本地验收脚本、backend 集成测试里遇到类似症状，第一时间检查代理。
2. **pnpm approve-builds**：`@tailwindcss/oxide` 与 `esbuild` 会在首次 `pnpm install` 后提示未批准 build scripts。当前不影响开发，但 CI 或首次部署机需执行 `pnpm approve-builds`（交互式）或在 `.npmrc` 里显式 allow。

## 5. 已知风险与遗留项

| 风险 / 遗留 | 影响 | 处置 |
|---|---|---|
| `backend/` 尚未初始化 | 阻塞 Phase 1 前的 `make test` / CI 双 job / 契约冻结 | Phase 0 剩余 0.35 人日内完成 |
| `docs/api_contract.md` 未写 | 阻塞 Phase 1 / Phase 2 并行 | 与 backend 初始化同批产出 |
| `pnpm approve-builds` 未处理 | CI 首跑可能因 postinstall 跳过产生 Tailwind oxide 告警 | 在 CI workflow 中加一步 `pnpm approve-builds` 或 `.npmrc` 追加 `allowBuild[...]=true` |
| animal-island-ui 0.x 版本 | 后续小版本可能有 breaking | 已锁定精确版本 `0.7.7`，升级需走 RFC |
| 本地 Clash 代理 | 新开发者复现 Playwright 测试时踩同坑 | `playwright.config.ts` 已落地修复；`README.md`（Phase 5 交付）需写「代理环境变量排错」段落 |

## 6. 下一阶段入口

**Phase 0 剩余（按此顺序）：**

1. **Task #6 · 初始化 FastAPI backend**
   - `backend/pyproject.toml`（`uv` 管理，Python 3.11）
   - `backend/app/main.py`：`/health` + `/api/bundles/batch` 占位（501 Not Implemented）
   - `backend/app/testing.py`：`VITE_API_MODE=e2e` 下的 mock 路由
   - `backend/tests/test_health.py`：≥ 1 case
   - `backend/ruff.toml`

2. **Task #7 · 冻结 `docs/api_contract.md`**
   - 按 `phase_plan.md` §4.1 落实 multipart schema、幂等键、响应体。

3. **Task #8 · 根 Makefile + CI 扩展**
   - `Makefile`：`dev / test / e2e / lint / install` 五个入口。
   - `.github/workflows/ci.yml` 重构：`frontend`（lint + vitest + type-check） / `backend`（ruff + pytest） / `e2e`（chromium + webkit 并行 shard，artifact 上传）三 job。

4. **Task #9 · M1 验收**
   - `make dev` 后 `http://localhost:5173` 与 `http://localhost:8000/health` 均 200。
   - `make test` 双端单测全绿。
   - `make e2e` Playwright 全绿。
   - 本文档 §4 的「待交付」复选框全部勾上，进入 Phase 1。

**Phase 1 第一个 ticket**（预热）：backend `services/bundle.py` 实现 `.staging/ → raw_ingestion/` 原子落盘（`os.rename`），并为 `client_submit_id` 幂等键写 ≥ 1 个 pytest case。
