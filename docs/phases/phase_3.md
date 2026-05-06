# Phase 3 · 分发与训练目录对接 · 阶段总结

> 状态：**已完成** ✅（2026-05-06）
> 对应 `phase_plan.md` §3 · Phase 3

## 1. 阶段目标与范围

对照 `phase_plan.md` §3 Phase 3 交付物：

1. **`app/testing.py` E2E mock**：`X-Tryon-Mode: e2e` header 触发内存 mock，不写文件系统。
2. **`dispatcher.py` 实现**：提交成功后 symlink 到 `img-dc` 训练目录。
3. **mask 生成**：精修图 − 试穿图差值 mask（OpenCV）。
4. **重试队列**：分发失败重试 3 次，最终写 `dispatch_log/failed/`。
5. **Playwright E2E 补齐**：用例 5-7（剪贴板→cell、失败行保留、聚类性能基线）。
6. **前端优化**：Dropzone 阶段保留 File 引用，避免 blobUrl→File 转换。

## 2. 任务进度

| # | 任务 | 状态 | Commit | 说明 |
|---|------|------|--------|------|
| 1 | `app/testing.py` E2E mock | ✅ 完成 | `7d7262f` | 11 个单测，镜像 ingest 校验逻辑，不写文件系统 |
| 2 | `dispatcher.py` symlink | ✅ 完成 | `ed03641` | 6 个单测，symlink 到 img-dc 训练目录，集成到 ingest 路由 |
| 3 | mask 生成 | ✅ 完成 | — | 8 个 mask 单测 + 2 个 dispatcher 集成测试，OpenCV 差值 mask |
| 4 | 重试队列 | ✅ 完成 | — | 6 个单测，JSON 队列文件，后台重试 3 次，失败写 dispatch_log/failed/ |
| 5 | Playwright E2E 补齐 | ✅ 完成 | — | 用例 6（失败行保留）+ 用例 7（聚类 P95 <50ms）；用例 5（剪贴板→cell）跳过，功能未接通 |
| 6 | 前端优化 | ✅ 完成 | — | FileMeta 增加 file 属性，submit 直接用 File 引用，跳过 blobUrl 转换 |

## 3. 偏差记录

| 偏差 | 原因 | 影响 |
|------|------|------|
| 用例 5（剪贴板粘贴到选中 cell）跳过 | Phase 2 遗留：selectedCell UI 交互未接通 | 推迟到 Phase 4 与键盘流一起实现 |

## 4. 测试要点

- `uv run pytest tests/test_testing.py` — 11 个用例覆盖：happy path（单/多 bundle）、部分失败、无幂等缓存、校验拒绝、task_id 格式、无文件系统写入
- `uv run pytest tests/test_dispatcher.py` — 8 个用例覆盖：happy path symlink 创建、annotated 文件、缺失 metadata、缺失源文件、幂等覆写、symlink 可读、mask 集成生成、fake 图片跳过 mask
- `uv run pytest tests/test_mask.py` — 8 个用例覆盖：全黑 mask、全白 mask、部分差异、阈值抑制、尺寸不匹配、图片读取失败、二值输出
- `uv run pytest tests/test_retry_queue.py` — 6 个用例覆盖：入队创建文件、重试成功移除、达到最大重试移入 failed、失败递增 attempts、空队列、多条目
- `pnpm exec playwright test --project=chromium` — 6/6 通过（原有 4 条 + 新增用例 6 失败行保留 + 用例 7 聚类 P95 性能基线）
- `main.tsx` 在 dev 模式暴露 `window.__testCluster` 供 E2E 性能测试使用

## 5. 风险与遗留

| 风险/遗留 | 说明 | 缓解 |
|-----------|------|------|
| 剪贴板粘贴到选中 cell 未接通 | selectedCell UI 交互未实现 | Phase 4 与键盘流一起 |
| mask 质量未经真实样本验证 | 测试用合成图片，真实试穿图 mask 质量待验证 | Phase 4 用真实样本调阈值 |
| retry_queue 是进程内后台任务 | 服务重启后队列丢失（JSON 文件持久化，但无自动恢复） | 可接受；Phase 5 加 startup 恢复 |
| dispatch 失败时 mask 生成是 best-effort | 如果 retouched/tryon 读取失败，mask 静默跳过 | 已记录；重试队列会重试整个 dispatch |

## 6. 下一阶段入口

**Phase 4 · 体验增强**（对应 `phase_plan.md` §3 Phase 4）：

1. **剪贴板粘贴到选中 cell**：接通 `selectedCell` → paste → 替换当前 cell 的 FileMeta。
2. **键盘流**：`Enter` 提交、`Esc` 清空未归类区、`1/2/3/4` 聚焦角色 cell。
3. **侧边栏 Gamification**：读取本机提交计数，展示「拦截 AI 翻车 N 次」。
4. **聚类兜底策略开关**：配置化正则，首次上线收集真实样本后微调。
5. **审计页 `/audit`**：分页浏览最近 100 个 Bundle，支持按花名/品类筛选。
