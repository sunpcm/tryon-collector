# Phase 1 · 后端摄入层 · 阶段总结

> 状态：**已完成** ✅（2026-05-05）
> 对应 `phase_plan.md` §3 · Phase 1
> 工期预估：1 人日 · 实际投入 ~0.5 人日

## 1. 阶段目标与范围

1. 实现 `services/bundle.py::save_bundle()` 原子落盘核心（`.staging/` → `raw_ingestion/` rename）。
2. 实现 `services/idempotency.py` 幂等键存储（24h TTL，启动时清理 stale staging）。
3. 将 `routers/ingest.py::submit_bundles_batch` 从 501 占位升级为完整 multipart 解析 + 校验 + partial-success 路由。
4. 交付 `scripts/smoke_submit.sh` 端到端验收脚本。

## 2. 新增文件

| 文件 | 说明 |
|---|---|
| `backend/app/services/bundle.py` | 原子落盘：uuid4 task_id → `.staging/<task_id>/` → sha256 + metadata.json → `os.rename` |
| `backend/app/services/idempotency.py` | 幂等键 get/set，TTL 24h；`cleanup_stale_staging()` 清理 >1h 残留 |
| `backend/app/routers/ingest.py` | 完整路由实现，替换 501 占位 |
| `backend/tests/test_bundle.py` | 4 cases：正常落盘、annotated 标志、异常清理、PNG 扩展名 |
| `backend/tests/test_idempotency.py` | 4 cases：set/get、miss、TTL 过期、stale staging 清理 |
| `backend/tests/test_ingest.py` | 10 cases：happy path、多 bundle、partial-success、幂等重放、各类 422/400 |
| `scripts/smoke_submit.sh` | curl 端到端验收：提交 → 断言 storage 目录 + metadata.json 字段完备 |

## 3. 与 phase_plan 的偏差与原因

| # | 偏差点 | 原始描述 | 实际落地 | 原因 |
|---|---|---|---|---|
| 1 | 业务线/品类白名单 | 「从后端配置文件读取」 | 硬编码常量集合（`VALID_BUSINESS_LINES` / `VALID_CATEGORIES`）在 `ingest.py` | Phase 1 范围内无配置文件需求，外部化配置推迟到 Phase 5；常量集合已足够前端联调 |
| 2 | `app/testing.py` E2E mock | Phase 0 遗留风险，Phase 1 同批落地 | 未实现，推迟到 Phase 2 | Phase 1 三个 ticket 均为后端核心逻辑，E2E mock 依赖前端 `X-Tryon-Mode: e2e` header，Phase 2 前端提交路径落地后再同步实现更合理 |
| 3 | `import io` 位置 | — | `ingest.py` 内 loop 中 `import io`（ruff 未报错，但非最优） | 功能正确，后续 Phase 可提至文件顶部 |

## 4. 测试要点

| 层级 | 命令 | 结果 |
|---|---|---|
| 后端 lint | `uv run ruff check .` | ✅ All checks passed |
| 后端单测 | `uv run pytest -v` | ✅ 20/20 passed |
| 端到端验收 | `STORAGE_ROOT=/tmp/x bash scripts/smoke_submit.sh` | ✅ smoke_submit PASSED |

## 5. 已知风险与遗留项

| 风险 / 遗留 | 影响 | 处置 |
|---|---|---|
| `app/testing.py` E2E mock 未实现 | Phase 2 Playwright 真实走提交路径时会写 `storage/raw_ingestion/` | Phase 2 前端提交路径落地时同批实现 |
| 业务线/品类白名单硬编码 | 新增业务线需改代码 | Phase 5 外部化为配置文件 |
| `ingest.py` 内 `import io` 在 loop 中 | 每次迭代重复 import（CPython 有缓存，无性能影响） | 下次触碰该文件时提至顶部 |
| `STORAGE_ROOT` 模块级常量 | 测试需 `patch`，生产需环境变量 | 现有 `patch` 方案已覆盖测试；生产通过 `STORAGE_ROOT` env var 注入 |

## 6. 下一阶段入口

**Phase 2 · 前端 Dropzone + 聚类 + 矩阵视图**（对应 `phase_plan.md` §3 Phase 2）：

1. **Dropzone 组件**：基于 `react-dropzone`，接受 JPEG/PNG，拖入后触发聚类。
2. **自动聚类逻辑**：按文件名前缀（款号）分组，产出 `Bundle[]` 数据结构。
3. **矩阵视图**：每行一个 Bundle，列为 product/tryon/retouched/annotated，缩略图预览。
4. **提交路径**：调用 `POST /api/bundles/batch`，处理 accepted/rejected 反馈。
5. **E2E golden path**：18 fixture 文件覆盖 drag → cluster → matrix → submit → storage 验证。
6. **`app/testing.py` E2E mock**：`X-Tryon-Mode: e2e` header 触发内存 mock，不写文件系统。
