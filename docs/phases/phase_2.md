# Phase 2 · 前端熔炉 + 矩阵 MVP · 阶段总结

> 状态：**已完成** ✅（2026-05-05）
> 对应 `phase_plan.md` §3 · Phase 2
> 工期预估：2.5 人日 · 实际投入 ~1 人日

## 1. 阶段目标与范围

对照 `phase_plan.md` §3 Phase 2 交付物：

1. **身份模块**：首开弹窗输入花名（`animal-island-ui` Modal + Input），LocalStorage 持久化，右上角头像+切换。
2. **标签模块**：业务线/品类两排标签，基于自研 Tag 组件实现多状态切换。
3. **自研补充组件**：`Tag` / `Toast` / `ProgressBar` / `Tooltip` 四个小组件，Vitest 单测。
4. **熔炉 Dropzone**：`react-dropzone` 全窗口拖入 + `Ctrl/Cmd+V` 粘贴 + ObjectURL 管理。
5. **聚类引擎**：纯函数 `cluster(files, config?)`，23 组 Vitest 单测。
6. **矩阵视图**：行按 groupKey 渲染，角色 cell 支持缩略图、缺失占位、候选计数。
7. **批量提交**：按钮仅在全部行就绪激活，提交走 `POST /api/bundles/batch`，失败行标红 + Toast。
8. **Playwright E2E（MVP 四条）**：首开花名、黄金路径、部分缺失、未归类。

## 2. 新增文件

| 文件 | 说明 |
|---|---|
| **Store** | |
| `src/store/identity.ts` | Zustand slice：花名读写 + LocalStorage 持久化 |
| `src/store/matrix.ts` | Zustand slice：文件列表、矩阵数据、行提交状态、选中 cell |
| `src/store/index.ts` | Barrel export |
| **API** | |
| `src/api/client.ts` | `submitBundlesBatch()` — FormData 构造 + POST /api/bundles/batch |
| `src/api/index.ts` | Barrel export |
| **Features · Identity** | |
| `src/features/identity/NicknameModal.tsx` | 首开花名弹窗，animal-island-ui Modal + Input |
| `src/features/identity/IdentityBadge.tsx` | 右上角花名展示 + 切换弹窗 |
| **Features · Tagging** | |
| `src/features/tagging/TagSelector.tsx` | 业务线 + 品类标签选择器 |
| **Features · Clustering** | |
| `src/features/clustering/cluster.ts` | 纯函数聚类引擎：groupKey 正则 + 角色关键词匹配 |
| `src/features/clustering/__tests__/cluster.test.ts` | 23 组测试（含中文关键词、大小写、性能基线） |
| **Features · Melting Pot** | |
| `src/features/melting-pot/MeltingPot.tsx` | 全窗口 Dropzone + 剪贴板粘贴 + ObjectURL 管理 |
| **Features · Matrix** | |
| `src/features/matrix/MatrixView.tsx` | 矩阵表格：header + rows + stats + 未归类区 |
| `src/features/matrix/MatrixRow.tsx` | 单行：groupKey + 4 角色 cell + 状态 badge |
| `src/features/matrix/MatrixCell.tsx` | 单 cell：缩略图 / 缺失占位 / 候选计数 |
| `src/features/matrix/BatchSubmitBar.tsx` | 提交按钮 + 进度条 + 失败行保留 |
| **自研组件** | |
| `src/components/Tag/Tag.tsx` | 标签组件：selected/unselected 两态 |
| `src/components/Tag/__tests__/Tag.test.tsx` | 4 tests |
| `src/components/Toast/Toast.tsx` | Portal Toast：success/warning/error，3s 自动消失 |
| `src/components/Toast/__tests__/Toast.test.tsx` | 2 tests |
| `src/components/ProgressBar/ProgressBar.tsx` | 圆角进度条，0-100 + showLabel |
| `src/components/ProgressBar/__tests__/ProgressBar.test.tsx` | 3 tests |
| `src/components/Tooltip/Tooltip.tsx` | 悬浮文字提示 |
| `src/components/Tooltip/__tests__/Tooltip.test.tsx` | 2 tests |
| **E2E** | |
| `e2e/fixtures/*.jpg` | 22 张测试图片（SKU001-007 × product/tryon/retouched + random） |
| `e2e/pages/dropzone.page.ts` | Page Object：Dropzone 操作 |
| `e2e/pages/matrix.page.ts` | Page Object：矩阵断言 |
| `e2e/specs/mvp.spec.ts` | 4 条 MVP 用例 |

## 3. 与 phase_plan 的偏差与原因

| # | 偏差点 | 原始描述 | 实际落地 | 原因 |
|---|---|---|---|---|
| 1 | 聚类关键词匹配策略 | 文件名 includes 匹配 | 先 strip groupKey，再按分隔符边界匹配拉丁关键词 | 原始 includes 会导致 "product" 包含 "pr" 误匹配为 retouched；纯 word-boundary 又过于严格。折中方案：对拉丁关键词用 `(?:^|[\s_\-\.])kw(?:[\s_\-\.]|$)` 正则，中文关键词用 includes |
| 2 | 关键词列表 | phase_plan 未列 role name 本身 | 在 DEFAULT_ROLE_KEYWORDS 中为每个 role 添加了 role name（`product`, `tryon`, `retouched`, `annotated`）作为关键词 | 原始列表缺少 `product` 关键词导致 `SKU12345-product.jpg` 无法识别 |
| 3 | `app/testing.py` E2E mock | Phase 1 遗留，Phase 2 同批实现 | 未实现，推迟到 Phase 3 | E2E 测试仅验证前端 UI 行为（聚类、矩阵显示），不走真实提交路径，mock 暂不需要 |
| 4 | 四卡槽展开视图 | 矩阵每行可展开为四格沉浸式卡槽 | 未实现 | MVP 范围内缩略图 + 候选计数已足够交互验证；卡槽展开作为 Phase 4 体验增强 |
| 5 | 剪贴板粘贴到矩阵选中行 | 粘贴图像到当前选中 cell | 仅实现了全局粘贴到未归类区 | 矩阵 cell 选中状态（selectedCell）已在 store 中定义，但 UI 交互未接通，推迟到 Phase 3 |
| 6 | `onPressEnter` | animal-island-ui Input 支持 | 改用 `onKeyDown` + Enter 检测 | animal-island-ui Input 的 TypeScript 类型未导出 `onPressEnter`，运行时可用但 TS 报错 |

## 4. 测试要点

| 层级 | 命令 | 结果 |
|---|---|---|
| 前端单测 | `pnpm vitest run` | ✅ 46/46 passed (7 files) |
| 前端 lint | `pnpm lint` | ✅ 0 errors, 2 warnings |
| TypeScript | `pnpm type-check` | ✅ No errors |
| 生产构建 | `pnpm build` | ✅ 299KB JS, 95KB CSS |
| E2E chromium | `pnpm exec playwright test --project=chromium` | ✅ 4/4 passed |
| E2E webkit | `pnpm exec playwright test --project=webkit` | ⚠️ 未运行（需手动验证） |

**单测明细：**
- `cluster.test.ts` — 23 cases：标准命名、多 groupKey、缺失/多余、中文关键词、大小写、自定义正则、200 文件性能 <50ms、排序稳定性
- `Tag.test.tsx` — 4 cases：渲染、点击、disabled、selected 样式
- `Toast.test.tsx` — 2 cases：显示消息、自动消失
- `ProgressBar.test.tsx` — 3 cases：宽度、clamp、label
- `Tooltip.test.tsx` — 2 cases：hover 显示、leave 隐藏
- `App.test.tsx` — 4 cases：渲染、花名弹窗、dropzone hint、标签选择器
- `Button.test.tsx` — 8 cases（模板遗留）

## 5. 手动测试清单

以下内容需要在真机浏览器中手动验证，自动化测试无法完全覆盖：

### 5.1 基础功能

- [ ] **首开花名**：清除 LocalStorage 后刷新页面 → 弹出花名输入弹窗 → 输入花名后进入主界面 → 刷新页面后花名保留
- [ ] **花名切换**：右上角显示花名 → 点击「切换」→ 修改花名 → 确认后更新
- [ ] **标签选择**：点击业务线标签 → 高亮选中 → 点击品类标签 → 高亮选中 → 切换标签

### 5.2 熔炉 Dropzone

- [ ] **拖入图片**：从 Finder/文件管理器拖入多张图片 → 全屏蓝色虚线高亮 → 松开后图片进入聚类
- [ ] **粘贴图片**：截图后 Cmd/Ctrl+V → 图片出现在矩阵或未归类区
- [ ] **文件类型过滤**：拖入非图片文件（如 .txt）→ 不被接受
- [ ] **拖入提示**：未拖入时显示「将图片拖入窗口，或使用 Ctrl/Cmd+V 粘贴」

### 5.3 聚类与矩阵

- [ ] **标准命名聚类**：拖入 `SKU001-product.jpg` + `SKU001-tryon.jpg` + `SKU001-retouched.jpg` → 矩阵显示 1 行，状态「就绪」
- [ ] **中文命名聚类**：拖入 `SKU001-原图.jpg` + `SKU001-试穿.jpg` + `SKU001-精修.jpg` → 同样识别
- [ ] **多款号聚类**：拖入 3+ 个款号的图片 → 矩阵显示多行，按款号排序
- [ ] **缺失状态**：只拖入 product + tryon → 行状态显示「不完整」（橙色）
- [ ] **未归类文件**：拖入一张无款号的图（如 `random.jpg`）→ 进入未归类区，不影响已就绪行
- [ ] **缩略图预览**：矩阵 cell 显示图片缩略图，缺失 cell 显示「缺失」占位
- [ ] **候选计数**：同角色多张图片时 cell 右上角显示数字角标

### 5.4 批量提交

- [ ] **按钮禁用**：存在不完整行或未归类文件时，「一键批量提交」按钮为灰色禁用状态
- [ ] **按钮激活**：所有行就绪且无未归类文件时，按钮变蓝可点击
- [ ] **提交成功**：点击提交 → Toast 提示「全部 N 个任务包提交成功」→ 矩阵清空
- [ ] **提交失败**：后端返回错误 → Toast 红色提示 → 失败行保留在矩阵中

### 5.5 跨浏览器

- [ ] **Chrome**：以上功能全部正常
- [ ] **Safari**：以上功能全部正常（特别关注拖拽和粘贴行为）

## 6. 已知风险与遗留项

| 风险 / 遗留 | 影响 | 处置 |
|---|---|---|
| `app/testing.py` E2E mock 未实现 | Phase 3 Playwright 提交用例会写真实 storage | Phase 3 同批实现 |
| 四卡槽展开视图未实现 | 无法在卡槽内逐张替换/粘贴主图 | Phase 4 体验增强 |
| 剪贴板粘贴到选中 cell 未接通 | 粘贴只能到未归类区 | Phase 3 补齐 |
| 聚类关键词词典可能需要微调 | 真实文件命名可能超出当前正则覆盖 | 上线后收集样本，Phase 5 配置化 |
| `animal-island-ui` Input 的 `onPressEnter` TS 类型缺失 | 改用 `onKeyDown` 替代 | 功能不受影响，后续 animal-island-ui 更新后可切回 |
| E2E webkit 未验证 | Safari 兼容性未知 | 手动测试阶段验证 |
| 批量提交的 `fetch(blobUrl) → File` 转换 | 大批量时可能有性能开销 | Phase 3 优化：在 Dropzone 阶段直接保留 File 引用 |

## 7. 下一阶段入口

**Phase 3 · 分发与训练目录对接**（对应 `phase_plan.md` §3 Phase 3）：

1. **`app/testing.py` E2E mock**：`X-Tryon-Mode: e2e` header 触发内存 mock，不写文件系统。Phase 2 的 E2E 用例不需要，但 Phase 3 的提交用例需要。
2. **`dispatcher.py` 实现**：提交成功后 symlink 到 `img-dc` 训练目录。
3. **mask 生成**：精修图 − 试穿图差值 mask（OpenCV）。
4. **重试队列**：分发失败重试 3 次，最终写入 `dispatch_log/failed/`。
5. **Playwright E2E 补齐**：用例 5-7（剪贴板粘贴到 cell、失败行保留、聚类 P95 <50ms 性能基线）。
6. **前端优化**：Dropzone 阶段保留 File 引用，避免 submit 时 blobUrl → File 转换。
