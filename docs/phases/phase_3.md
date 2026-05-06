# Phase 3 · 分发与训练目录对接 · 阶段总结

> 状态：**进行中** 🚧（2026-05-06 开始）
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
| 1 | `app/testing.py` E2E mock | ✅ 完成 | — | 11 个单测，镜像 ingest 校验逻辑，不写文件系统 |
| 2 | `dispatcher.py` symlink | ⬜ 待开始 | — | — |
| 3 | mask 生成 | ⬜ 待开始 | — | — |
| 4 | 重试队列 | ⬜ 待开始 | — | — |
| 5 | Playwright E2E 补齐 | ⬜ 待开始 | — | — |
| 6 | 前端优化 | ⬜ 待开始 | — | — |

## 3. 偏差记录

暂无偏差。

## 4. 测试要点

- `uv run pytest tests/test_testing.py` — 11 个用例覆盖：happy path（单/多 bundle）、部分失败、无幂等缓存、校验拒绝、task_id 格式、无文件系统写入

## 5. 风险与遗留

（阶段完成后填写）

## 6. 下一阶段入口

（阶段完成后填写）
