# Phase 5 · 加固与交付 · 阶段总结

> 状态：**已完成** ✅（2026-05-07）
> 对应 `phase_plan.md` §3 Phase 5

## 1. 阶段目标与范围

对照 `phase_plan.md` §3 Phase 5 交付物：

1. **单机部署脚本**：`scripts/run.sh` 使用 `uvicorn --host 0.0.0.0` + 前端静态构建由 FastAPI 同端口 serve。
2. **磁盘水位告警**：`storage/` 超过阈值时前端提交接口返回 503 并提示。
3. **README**：局域网访问方式、花名使用约定、故障排查。

## 2. 任务进度

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 1 | 单机部署脚本 | ✅ 完成 | `scripts/run.sh`：install → build → uvicorn，支持 PORT / HOST / TRYON_DISK_LIMIT_GB 环境变量 |
| 2 | FastAPI 静态文件服务 | ✅ 完成 | `main.py` 检测 `frontend/dist/` 存在时自动 mount `/assets` + SPA catch-all |
| 3 | 磁盘水位告警 | ✅ 完成 | HTTP middleware 检查 `storage/` 大小，超阈值返回 503 + 中文提示 |
| 4 | README 更新 | ✅ 完成 | 新增生产部署、磁盘水位、故障排查章节；更新进度表 |

## 3. 新增代码

### 后端
- `app/main.py` — 新增静态文件服务（`StaticFiles` + SPA catch-all）+ 磁盘水位 middleware

### 脚本
- `scripts/run.sh` — 一键部署脚本（install → build → uvicorn）

### 前端
- `api/client.ts` — 优化错误消息提取，优先展示后端返回的友好提示

### 文档
- `README.md` — 新增生产部署、磁盘水位告警、故障排查章节

## 4. 验收指标

| 指标 | 结果 |
|------|------|
| `uv run pytest` | 58/58 passed |
| `pnpm vitest run` | 71/71 passed |
| `pnpm build` | 成功 |
| `pnpm exec playwright test --project=chromium` | 6/6 passed |

## 5. 配置项

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `PORT` | 8000 | 服务端口 |
| `HOST` | 0.0.0.0 | 监听地址 |
| `TRYON_DISK_LIMIT_GB` | 10 | 磁盘水位阈值（GB） |

## 6. 偏差记录

无偏差。

## 7. 项目完成状态

Phase 0–5 全部完成，Tryon Collector 达到可交付状态。
