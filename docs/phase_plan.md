# Tryon Collector · 分阶段实施方案 (Phase Plan)

> 本文档为实施基线，同步自 `docs/1.md`（系统设计）与 `docs/2.md`（UI 草图），并引入「大熔炉 Dropzone + 自动聚类矩阵」作为本期核心增量。所有阶段按顺序依赖，可并行之处在阶段末尾标注。

## 0. 产品定位与设计不变量

- **部署场景**：局域网内部工具，单机部署，无外网暴露；无账号体系，以 LocalStorage「花名」区分操作者。
- **北极星指标**：设计师从「拖入文件」到「看到提交成功」的中位耗时 ≤ 10 秒（按 1 批 5 个任务包、平均 15 张图计）。
- **与 `docs/2.md` 草图的关系**：草图中的四卡槽交互作为「单任务精修模式」保留为矩阵的一行展开视图；主流程升级为批量矩阵。

## 0.1 强约束规范（Non-negotiable）

> 本节为项目的硬性边界，任何偏离都需通过 RFC 明确 review 后方可修改。其余章节均从此派生。

### 0.1.1 技术栈强约束
- **前端**：React + Vite。
  - **脚手架基线**：直接基于 [`sunpcm/vite-react-template`](https://github.com/sunpcm/vite-react-template) 落地（已集成 React 19 + Vite + TS + pnpm + ESLint/Prettier/Husky/lint-staged + GitHub Actions CI + `@/` 路径别名 + SVGR）。clone 后整体挪入 `frontend/`，仓库根同级再建 `backend/` + `storage/` + `docs/`。不引入 monorepo 工具（Turborepo / pnpm workspace），项目形状不需要。
  - **必选**：`react-dropzone` 处理全屏拖拽、剪贴板读取与本地 Blob 内存管理，禁止手写原生 HTML5 拖拽事件。
  - **测试框架**：
    - **单元/组件测试**：沿用 template 自带的 **Vitest + Testing Library + jsdom**（Vite 原生集成，无需额外编译器）。禁止再混入 Jest。
    - **E2E 自动化测试**：锁定 **Playwright**（`@playwright/test`），作为**必选**而非可选。禁止用 Cypress / Selenium / Puppeteer 等其它方案，单一工具链收敛。
  - **默认补强（推荐但非强制）**：TypeScript（已在 template 中）、Zustand（轻量状态管理）。选型可由前端负责人微调，但不得替换 React/Vite/react-dropzone 三件套。
- **UI 风格基线**：[`animal-island-ui`](https://github.com/guokaigdg/animal-island-ui) v0.7.7（动物森友会风格，可爱卡通视觉语言）。
  - **定位**：视觉语言基线，用于提升设计师使用好感度；**不作为唯一组件来源**。
  - **用途**：直接使用其 Button / Card / Input / Modal / Tabs / Switch / Checkbox / Select / Divider / Icon / Collapse 等现成组件，以及字体（Noto Sans SC / Nunito / Zen Maru Gothic）与圆角/配色 token。
  - **版本锁定**：`package.json` 写 `"animal-island-ui": "0.7.7"`（精确版本，**不加 `^`**），避免 0.x 阶段 breaking change。需同时 `pnpm add -D less` 并在入口 `import 'animal-island-ui/style'`。
  - **与 Tailwind 的分工**：template 预装 `tailwindcss` v4 + `tailwind-merge` + `clsx`，**保留使用**，但严格限定用途 —
    - ✅ **允许**：layout utilities（flex / grid / gap / padding / margin / position / overflow / sizing 等结构类）。
    - ❌ **禁止**：视觉 token（色彩、圆角、阴影、字体、动效曲线）。这些必须取自 animal-island-ui 的 Less 变量，保证视觉统一。
    - 自研组件中若需组合 className 用 `clsx` + `tailwind-merge`。
  - **禁用**：不得再引入 Ant Design / MUI / Chakra 等其它 UI 组件库；保持视觉统一。
- **后端**：极简框架，二选一:
  - **首选**：FastAPI（Python 3.11，uvicorn）。
  - **备选**：Node.js（Fastify 或原生 http，禁止引入 Nest、Express+中间件重栈）。
  - 后端**职责边界**：仅负责接收 multipart 上传 → 组装 `metadata.json` → 本地落盘 → 触发异步分发。禁止引入数据库、消息队列、Redis、对象存储；持久化状态一律落本地文件系统。
- **存储**：本地文件系统 `storage/raw_ingestion/<uuid>/`，通过 symlink 对接 `img-dc` 训练目录。
- **运行环境**：部署机锁定 Linux 或 macOS（依赖 symlink 行为）。

### 0.1.2 交互核心强约束
- **无差别大熔炉（Universal Dropzone）**：前端必须提供一个全屏、无预分类的 Dropzone。设计师一次性拖入任意数量的图片（如 4 原图 + 7 试穿 + 7 精修），前端不得要求设计师预先分组、重命名或逐槽拖放。
- **本地毫秒级自动聚类**：聚类算法必须在**浏览器端纯前端**完成，以文件名特征（哈希或正则匹配款号/角色关键词）为主策略，单批 ≤ 200 文件时 P95 延迟 < 50ms，算法实现为纯函数以便单测。
- **任务对齐矩阵视图（Alignment Matrix）**：聚类结果必须呈现为以款号为行、以角色（原图 / 试穿图 / 精修图 / 可选标注图）为列的矩阵表格，行级状态一目了然（就绪 / 不完整 / 多余）。
- **一键批量提交**：矩阵所有行就绪后，单次请求提交所有 Bundle；禁止设计师逐个点击提交。

### 0.1.3 UI 组件来源策略与自研补充清单

因 `animal-island-ui` 当前版本（v0.7.7，17 个组件）缺少若干业务必需小组件，按以下策略处理，**严禁**引入第二个 UI 库：

| 需求 | 来源 | 说明 |
|---|---|---|
| 顶部导航 / 花名切换 / 标签按钮 | `animal-island-ui`（Button / Card / Tabs / Modal / Input） | 直接使用 |
| 字体、配色、圆角、阴影 token | `animal-island-ui` 样式变量 | 内部组件须复用其 Less 变量，保持风格统一 |
| **Tag / Chip**（业务线/品类多选） | **自研** `components/Tag.tsx` | 基于 Button 样式衍生，支持 selected/unselected 两态 |
| **Toast / Message**（提交成功失败反馈） | **自研** `components/Toast.tsx` | Portal 渲染，3 秒自动消失；支持 success / warning / error |
| **Progress**（批量提交行级进度） | **自研** `components/ProgressBar.tsx` | 用于矩阵行内显示上传进度，圆角条形 |
| **Tooltip**（缩略图悬浮提示） | **自研** `components/Tooltip.tsx` | 仅文字提示，不做富内容 |
| **矩阵表格 / Dropzone / 缩略图胶片条** | **自研业务组件** | 本就是核心业务视图，与 UI 库无关 |

自研组件约束：
- 统一放在 `frontend/src/components/`，每个组件单独目录（组件 + `.module.less` + 单测）。
- Less 变量直接 `@import` `animal-island-ui` 的 token；**禁止硬编码色值**。
- 每个自研组件需配 ≥ 2 个 Vitest + Testing Library 单测。
- 预算：4 个自研补充组件共计 0.5 人日，纳入 Phase 2。

### 0.1.4 E2E 自动化测试（Playwright）强约束

E2E 测试作为**交付必选项**，不可延后、不可裁剪。用于防止「聚类→矩阵→批量提交→落盘」这条核心链路退化。

**工具与版本**
- `@playwright/test` ^1.48（或写本文档时最新稳定版），锁定 `package.json` devDependencies。
- 浏览器矩阵：默认 **Chromium + WebKit**（覆盖设计师常用 Chrome/Edge/Safari）；Firefox 可选。
- 安装：`pnpm add -D @playwright/test` + `pnpm exec playwright install chromium webkit`。

**目录与配置**
```
frontend/
├── e2e/                          # Playwright 测试根目录（template 已预留 e2e/）
│   ├── fixtures/                 # 测试用图片集（含不同命名风格样例）
│   │   ├── SKU12345-product.jpg
│   │   ├── SKU12345-tryon.jpg
│   │   ├── SKU12345-retouched.jpg
│   │   └── ... (≥ 18 张覆盖 4+7+7 场景)
│   ├── pages/                    # Page Object：dropzone.page.ts / matrix.page.ts
│   ├── specs/                    # *.spec.ts 测试用例
│   └── utils/                    # 拖拽/粘贴辅助（dispatchDataTransfer 等）
└── playwright.config.ts          # baseURL、webServer（自动起 dev）、输出目录
```

`playwright.config.ts` 必备项：
- `webServer`：自动执行 `pnpm dev` 并等待 `http://localhost:5173`，无需手动起服务。
- `use.baseURL`：`http://localhost:5173`。
- `testDir: './e2e/specs'`，`outputDir: './e2e/.results'`（加入 `.gitignore`）。
- `retries: process.env.CI ? 2 : 0`；`reporter: [['html'], ['list']]`。
- `storageState` 预置花名，避免每个用例都弹首开 Modal。

**核心用例清单（MVP 必跑）**
1. **首开花名流程**：首次访问弹 Modal → 输入花名「测试设计师」→ LocalStorage 写入 → 刷新页面直接进入上传界面。
2. **黄金路径 · 批量提交**：拖入 18 张 fixture（4 产品 + 7 试穿 + 7 精修） → 矩阵出现 7 行且全部就绪 → 选择业务线/品类 Tag → 一键提交 → Toast 成功 → 后端 `storage/raw_ingestion/` 出现 7 个 UUID 目录（通过后端 `/api/bundles` 只读接口或文件系统 mock 校验）。
3. **部分缺失行**：只拖入 6 张精修图 → 对应行状态 `不完整` → 提交按钮 disabled。
4. **未归类文件**：拖入一张命名无款号的图 → 落入「未归类区」 → 已就绪行不受影响。
5. **剪贴板粘贴**：聚焦矩阵某行某 cell → 模拟 `Cmd+V` 粘贴图像 → cell 更新主图。
6. **失败行保留**：mock 后端对第 3 行返回 500 → 其它行成功、第 3 行保留标红 + Toast 错误提示 → 重试仅重发失败行。
7. **聚类性能基线**：拖入 200 张合法命名文件 → `performance.now()` 测算聚类耗时，断言 P95 < 50ms（与 §0.1.2 对齐）。

**约束与规范**
- 用例不直连真实后端分发逻辑：E2E 启动时以 `VITE_API_MODE=e2e` 走 **后端 mock server**（`backend/app/testing.py` 提供），保证测试幂等、可并发。
- **必须用 Page Object 模式**，不得在 spec 里堆选择器；选择器优先用 `getByRole` / `getByTestId`。
- 所有交互操作必须带断言（`await expect(...)`），禁止裸 `page.click` 不验证结果。
- 失败时自动截图 + trace 保留在 `e2e/.results/`，PR review 时可下载。

**CI 集成**
- 扩展 template 自带的 GitHub Actions workflow，新增 job `e2e`：
  - 矩阵并行：`chromium`、`webkit` 两个 shard。
  - 步骤：`pnpm install` → `pnpm exec playwright install --with-deps` → `pnpm test:e2e`。
  - 上传 `playwright-report/` 与 `trace.zip` 为 artifact，保留 7 天。
- **合并门禁**：单测 + E2E 必须全绿，main 分支受保护。

**成本预算**
- Phase 0 末：完成 Playwright 安装与 `webServer` 接通（0.25 人日）。
- Phase 2 末：交付 MVP 黄金路径（用例 1/2/3/4）与 Page Object 骨架（0.5 人日）。
- Phase 3 末：补齐剪贴板、失败行、聚类性能三个用例（0.5 人日）。
- 合计约 1.25 人日，已并入阶段总工期。

## 1. 架构与目录

```
tryon-collector/
├── frontend/                  # Vite + React + TS
│   └── src/
│       ├── features/
│       │   ├── identity/      # 花名与 LocalStorage
│       │   ├── tagging/       # 业务线/品类标签
│       │   ├── melting-pot/   # 大熔炉 Dropzone
│       │   ├── clustering/    # 文件名/视觉聚类引擎（纯函数）
│       │   └── matrix/        # 任务对齐矩阵视图
│       ├── api/               # 后端客户端
│       └── store/             # Zustand slices
├── backend/                   # FastAPI
│   └── app/
│       ├── routers/ingest.py
│       ├── services/bundle.py        # UUID Bundle 原子落盘
│       ├── services/dispatcher.py    # symlink 分发 + mask 计算
│       └── models/metadata.py
├── storage/
│   ├── raw_ingestion/         # 原始任务包（权威数据源）
│   ├── .staging/              # 上传中间态
│   └── dispatch_log/          # 分发审计
└── docs/
```

## 2. 核心概念：熔炉、聚类、矩阵

### 2.1 任务包 (Task Bundle)
一次「设计师 + 一款商品」的最小提交单元。一个 Bundle 必包含 `product` / `tryon` / `retouched` 三类图各 1 张，可选 `annotated` 1 张。后端落盘后生成 `<uuid>/` 目录与 `metadata.json`（结构沿用 `docs/1.md` §三）。

### 2.2 大熔炉 (Melting Pot Dropzone)
全屏无差别 Dropzone，接受一次性拖入任意数量的图片文件。前端不要求文件顺序，不要求预先分类。

### 2.3 聚类引擎 (Clustering Engine)
纯前端、纯函数、同步执行（单批 ≤ 200 文件时 P95 < 50ms）。按以下策略依序匹配，直到完成聚类：

1. **主策略 · 文件名结构解析**：以商品 ID/款号作为分组键，以类型关键词作为角色键。
   - 分组键正则（可配置，默认）：`/(?<groupKey>[A-Z0-9]{4,}[-_]?\d{2,})/i`（匹配 `SKU12345`、`A1_0423-02` 等常见款号格式）。
   - 角色关键词词典（大小写不敏感，支持中英混排）：
     - `product`: `原图|商品图|ref|reference|raw`
     - `tryon`: `试穿|tryon|try-on|ai|gen`
     - `retouched`: `精修|retouched|final|fixed|pr`
     - `annotated`: `涂鸦|标注|annotated|mark|prompt`
   - 同 `groupKey` 且同角色出现多张时，按文件名中的末尾序号排序，取首张为主图，其余降级为「候选图」在该 cell 内做胶片条预览（设计师可切换主图）。
2. **兜底策略 · 内容启发式（可选开关，默认关闭）**：当文件名无法提取 `groupKey` 时，使用 `docs/2.md` §外挂建议中的 canvas 采样（边缘像素方差 → product；高饱和红色像素 → annotated）猜测角色，并把它们放入「未归类区」供人工拖拽修正，不自动并入矩阵。
3. **手动覆盖**：任意 cell 支持从「未归类区」拖入覆盖；任意 cell 内右键可清空或切主图。

> 聚类引擎必须是纯函数 `cluster(files: FileMeta[]): {matrix, unassigned}`，无副作用，便于单测覆盖（阶段 3 交付 ≥ 20 组黄金样例）。

### 2.4 任务对齐矩阵视图 (Alignment Matrix)
以 `groupKey` 为行、以 4 种角色为列的表格：

| groupKey | 👗 product | 🤖 tryon | ✨ retouched | ⭕ annotated | 状态 |
|---|---|---|---|---|---|
| SKU12345 | ✅ 1 张 | ✅ 1 张 | ⚠️ 缺失 | — | 不完整 |
| A1-0423-02 | ✅ 1 张 | ✅ 1 张 | ✅ 1 张 | ✅ 1 张 | 就绪 |

- 行状态：`就绪` / `不完整`（缺必填角色）/ `多余`（同角色 >1 候选，提示选主图）。
- 顶部统计条：`就绪 X · 不完整 Y · 未归类 Z`，仅当 `Y=0 且 Z=0` 时「一键批量提交」按钮激活。
- 每行可展开为 `docs/2.md` 的四格沉浸式卡槽视图，用于逐张替换/粘贴。

## 3. 分阶段实施计划

> 每个阶段给出：交付物 / 验收标准 / 关键接口或组件 / 可并行项。阶段 0-2 为 MVP，阶段 3-5 为增强。
> **阶段末文档交付（强约束）**：每个阶段结束时，必须在 `docs/phases/phase_<N>.md` 产出一份阶段总结，作为该阶段的**合并门禁**之一，缺失则视为未完成。模板固定为以下六节：
> 1. **阶段目标与范围**（对照 `phase_plan.md` §3 本阶段条目）
> 2. **架构与目录变更**（新增/改动的模块、依赖、关键文件，配合简要目录树）
> 3. **与 phase_plan 的偏差与原因**（实际落地中被动修改的约束或决策，同步回写 `phase_plan.md`）
> 4. **测试要点**（本阶段新增的单测 / 组件测 / E2E 用例清单，以及运行命令与当前通过率）
> 5. **已知风险与遗留项**（跨阶段依赖、延后项、需产品/算法确认事项）
> 6. **下一阶段入口**（明确下阶段第一个可执行 ticket，避免交接断档）
>
> 阶段总结以 PR 形式提交，reviewer 至少检查：总结与代码 diff 一致、测试命令本地可复现、§3 偏差条目已回写入 `phase_plan.md`。

### Phase 0 · 脚手架与契约冻结（0.75 天）
**交付物**
- `frontend/` 初始化：clone [`sunpcm/vite-react-template`](https://github.com/sunpcm/vite-react-template) 到 `frontend/`，删除 `.git`，保留 Vite + React 19 + TS + ESLint + Prettier + **Vitest** + Husky + lint-staged + CI workflow + **Playwright 1.57 配置（含 webServer + chromium/firefox/webkit）** + 预留 `e2e/` 冒烟用例。调整 `package.json` name 为 `tryon-collector-frontend`。
- 安装可爱视觉基线：`pnpm add animal-island-ui@0.7.7 classnames` + `pnpm add -D less`，入口 `main.tsx` 顶部 `import 'animal-island-ui/style'`。
- **Playwright 已随 template 到位**：验证 `pnpm exec playwright install chromium webkit` + `pnpm exec playwright test` 可跑通；把 template 自带的 `e2e/app.spec.ts` 改写为 Tryon Collector 的冒烟用例（标题 / 根节点存在）。
- `backend/` 初始化（FastAPI + uv/poetry + pytest + ruff），并提供 `VITE_API_MODE=e2e` 下的 mock 路由雏形。
- `docs/api_contract.md`：冻结 POST `/api/bundles/batch` 的 multipart schema（见 §4.1）。
- 根 `Makefile`：`make dev` 同时起前后端；`make test` 跑双端单测；`make e2e` 跑 Playwright。
- GitHub Actions：新增 `e2e` job（chromium + webkit 并行），上传 `playwright-report/` artifact。

**验收**
- `make dev` 后前端 `localhost:5173`、后端 `localhost:8000/health` 均 200。
- `make e2e` 本地与 CI 均绿；artifact 中可下载 HTML 报告。
- CI 或本地脚本能跑通 lint + type check + 空测试。

### Phase 1 · 后端摄入层（1 天）
**交付物**
- `POST /api/bundles/batch`：接收 N 个 Bundle（multipart/form-data），每个 Bundle 携带 `product/tryon/retouched/annotated?` 与公共元数据。
- 原子落盘：先写入 `storage/.staging/<uuid>/`，全部文件落盘+校验 hash 通过后 `os.rename` 到 `storage/raw_ingestion/<uuid>/`，避免半成品污染数据源。
- `metadata.json` 结构遵循 `docs/1.md` §三，新增字段：`group_key`、`client_submit_id`（幂等键）、`file_hashes`。
- `services/dispatcher.py`：提交成功后异步 symlink 到 `img-dc` 训练目录；失败不影响用户提交，写入 `dispatch_log/`。

**验收**
- 单测：重复 `client_submit_id` 返回 200 且不重复落盘（幂等）。
- 集成测：模拟断网中途失败，`storage/raw_ingestion/` 无残留目录。
- 单机 benchmark：一次批量 10 个 Bundle × 平均 3MB/张，端到端 < 3s。

### Phase 2 · 前端熔炉 + 矩阵 MVP（2.5 天）
**交付物**
- 身份模块：首开弹窗输入花名（`animal-island-ui` Modal + Input），LocalStorage 持久化，右上角头像+切换。
- 标签模块：业务线/品类两排标签，基于**自研 Tag 组件**（§0.1.3）实现多状态切换。
- **可爱视觉基线接入**：入口引入 `animal-island-ui/style`，全局字体与配色 token 生效；设计层面至少在顶部导航、Card 容器、Modal、主提交按钮四处用足 animal-island-ui 的视觉语言。
- **自研补充组件（§0.1.3）**：交付 `Tag` / `Toast` / `ProgressBar` / `Tooltip` 四个小组件，每个 ≥ 2 个 Jest 单测，Less 变量复用 animal-island-ui token。
- **熔炉 Dropzone**（`react-dropzone` + `onDrop` 全局监听）：
  - 全窗口可拖入（非仅框内），拖入时全屏虚线高亮。
  - 支持 `Ctrl/Cmd+V` 粘贴图像（矩阵若有选中行则入该行的当前角色，否则入「未归类区」）。
  - 每个文件生成 `URL.createObjectURL` 本地预览，提交成功后统一 `revokeObjectURL`。
- **聚类引擎**：实现 §2.3 主策略 + 手动覆盖，附 20 组 Jest 单测样例。
- **矩阵视图**：行按 `groupKey` 渲染，角色 cell 支持缩略图、缺失占位、胶片条候选切换、右键清空。
- **批量提交**：按钮仅在「全部行就绪」激活；提交走单次 `POST /api/bundles/batch`，提交中用自研 `ProgressBar` 显示行级进度，失败行保留在矩阵并标红，并用 `Toast` 提示。
- **Playwright E2E（MVP 四条）**：按 §0.1.4 交付用例 1-4（首开花名、黄金路径、部分缺失、未归类）+ `pages/dropzone.page.ts` / `pages/matrix.page.ts` Page Object 骨架 + `e2e/fixtures/` 18 张测试图。

**验收**
- 真机手测（Chrome/Safari 最新稳定版）：一次性拖入 18 张（4+7+7）乱序命名文件，≤ 50ms 聚类完成，矩阵 7 行全部就绪。
- 误拖入 1 张无法识别的文件 → 进入「未归类区」，不阻塞已就绪行。
- 矩阵任一行展开为四卡槽，可在卡槽内 `Ctrl+V` 粘贴替换主图。
- 批量提交 7 个 Bundle 成功率 100%，刷新页面后 `storage/raw_ingestion/` 可见 7 个 UUID 目录。
- **`pnpm test:e2e` 在 chromium + webkit 双浏览器下全绿**，CI 同样通过。

**可并行**：Phase 1 与 Phase 2 的 UI 骨架（先 mock API）可并行，Phase 2 的聚类引擎可由第二人独立开发并单测，Playwright 用例可由 QA 并行编写（依赖 Page Object 先定稿）。

### Phase 3 · 分发与训练目录对接（1 天）
**交付物**
- `dispatcher.py` 实现 symlink 到 `img-dc` 的 `data/product`、`data/tryon`、`data/annotations`。
- 精修图 − 试穿图差值 mask 生成（OpenCV，阈值可配）。
- 分发失败重试队列（本地 SQLite 或 JSON 队列文件即可，勿引入 Redis）。
- **Playwright E2E 补齐**：交付 §0.1.4 用例 5-7（剪贴板粘贴、失败行保留、聚类 P95 < 50ms 性能基线），用例全部纳入 CI 合并门禁。

**验收**
- 一次提交后，目标训练目录即刻出现 symlink；删除源 Bundle → symlink 失效可被巡检脚本发现。
- 人为制造 mask 计算异常，重试 3 次后进入 `dispatch_log/failed/`，不影响新提交。
- Playwright 7 条用例在 chromium + webkit 矩阵下连续 3 次运行全绿（排除 flaky）。

### Phase 4 · 体验增强（1 天，可裁剪）
- 侧边栏 Gamification（`docs/2.md`）：读取本机提交计数，展示「拦截 AI 翻车 N 次」。
- 聚类兜底策略开关（§2.3 第 2 条）。
- 键盘流：`Enter` 提交、`Esc` 清空未归类区、`1/2/3/4` 聚焦当前行的角色 cell。
- 审计页 `/audit`：分页浏览最近 100 个 Bundle，支持按花名/品类筛选（只读，不做删除）。

### Phase 5 · 加固与交付（0.5 天）
- 单机部署脚本：`scripts/run.sh` 使用 `uvicorn --host 0.0.0.0` + 前端静态构建由 FastAPI 同端口 serve。
- 磁盘水位告警：`storage/` 超过阈值时前端提交接口返回 503 并提示。
- README：局域网访问方式、花名使用约定、故障排查。

## 4. 关键契约

### 4.1 批量提交接口
`POST /api/bundles/batch` · `multipart/form-data`

- 公共字段（form field）：
  - `designer_id` (str)
  - `business_line` (str)
  - `category` (str)
  - `optional_notes` (str, 可空)
  - `client_submit_id` (uuid, 幂等键)
  - `bundles` (json str)：数组，每项 `{group_key, files: {product, tryon, retouched, annotated?}}`，值为下方文件字段名。
- 文件字段：`file_<groupKey>_<role>`，二进制图片。

**响应**
```json
{
  "accepted": [{"group_key": "SKU12345", "task_id": "uuid..."}],
  "rejected": [{"group_key": "A1-0423", "reason": "missing_retouched"}]
}
```

### 4.2 前端聚类函数签名
```ts
type Role = 'product' | 'tryon' | 'retouched' | 'annotated';
interface FileMeta { id: string; name: string; size: number; blobUrl: string; }
interface MatrixCell { main?: FileMeta; candidates: FileMeta[]; }
interface MatrixRow { groupKey: string; cells: Record<Role, MatrixCell>; status: 'ready' | 'incomplete' | 'overflow'; }
interface ClusterResult { matrix: MatrixRow[]; unassigned: FileMeta[]; }
function cluster(files: FileMeta[], config?: ClusterConfig): ClusterResult;
```

## 5. 质量与风险

### 5.1 测试矩阵
| 层级 | 工具 | 覆盖重点 |
|---|---|---|
| 聚类引擎单测 | **Vitest + Testing Library** | 20 组黄金样例（含乱序、缺失、多余、无 groupKey） |
| 前端交互/组件测试 | **Vitest + Testing Library** | Dropzone 拖入、粘贴、批量提交失败行保留；自研 Tag/Toast/ProgressBar/Tooltip 各 ≥ 2 例 |
| 后端单测 | pytest | 幂等、原子落盘、dispatcher 重试 |
| 端到端 | **Playwright（必选，chromium + webkit）** | §0.1.4 所列 7 条核心用例；CI 合并门禁，失败拦截 PR |

### 5.2 风险登记
| 风险 | 影响 | 缓解 |
|---|---|---|
| 款号正则无法匹配历史命名 | 矩阵大量进入「未归类区」 | 配置化正则，首次上线收集真实样本后微调；提供导入 CSV 映射表 |
| 大批量（>100 张）一次提交内存压力 | 浏览器卡顿 | 单次批量硬上限 50 Bundle，溢出提示分批 |
| symlink 在 Windows 局域网主机上失败 | 分发中断 | 部署环境锁定 Linux/macOS；Windows 降级为 `copyfile` 并记录审计 |
| 设计师误传同名文件覆盖 | 数据污染 | 以 `sha256(content)` 去重，重复文件标记 `duplicate` 不落盘 |
| 断电/崩溃导致半成品目录 | 数据源污染 | `.staging/` + `os.rename` 原子提交；启动时清理 > 1h 的 staging 残留 |

## 6. 验收里程碑
- **M1（Phase 0-1 完成）**：后端能接收并落盘一个 Bundle，curl 可回放。
- **M2（Phase 2 完成，MVP 可用）**：局域网内设计师能走完一次真实批量提交闭环。
- **M3（Phase 3 完成）**：与 `img-dc` 训练目录完成自动对接，mask 产出正确。
- **M4（Phase 4-5 完成）**：体验增强 + 部署脚本齐备，交付内部使用。

## 7. 开放问题（需产品/算法方确认）
1. 款号正则是否需要支持多套规则（不同业务线可能命名不同）？
2. `img-dc` 训练目录的绝对路径是否稳定？是否需要配置化（环境变量 `IMGDC_ROOT`）？
3. mask 生成所用 OpenCV 算法与阈值是否由算法同学提供脚本，前端/后端仅调用？
4. 是否需要把「花名」与公司内部账号系统做映射（当前方案纯 LocalStorage，换机即丢失历史归属）？
