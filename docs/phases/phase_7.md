# Phase 7 · 审计页过滤 / 编辑 / 软删除

> 状态：**已完成** ✅（2026-05-12）
> 后续修订：**编辑功能从 UI 撤回**（2026-05-12 当天），见 §8。后端 endpoint 保留。

## 1. 背景

`/audit` 与 `/showcase/audit` 之前对所有用户的记录一视同仁、且只读。设计师反馈：

- **看不到自己的**：列表里混着所有人的记录，自己只关心自己提交的
- **改不了**：标题打错字、品类选错只能等管理员手动改 metadata.json
- **删不了**：误提交的记录留着碍事，只能找管理员手工删盘

## 2. 方案

四件事一起做：

1. **过滤"只看自己"**（默认）：审计页默认按 `nickname` 过滤，加 checkbox 切到"看所有人"
2. **编辑跳首页**：仅可改元数据（title / 品类 / 业务线 / brand / purpose），点编辑后跳回首页/对应 showcase 页，状态预填，提交时旧记录自动软删
3. **软删除**：写 `deleted_at` / `deleted_by` 到 metadata.json，**不动文件**；列表默认不展示，加 checkbox "显示已删除"
4. **信任前端身份**：服务端不校验 `actor` 等于记录拥有者，前端只对自己的行显示编辑/删除按钮做软约束 — 与当前局域网无账号信任模型一致

物理清理 / 回收磁盘**不做**，留作后续阶段。

## 3. 任务进度

| # | 任务 | 状态 | 文件 |
|---|---|---|---|
| 1 | 后端 audit router：`include_deleted`、`PATCH`、`DELETE` | ✅ | `backend/app/routers/audit.py` |
| 2 | 后端 showcase service：`patch_showcase` / `soft_delete_showcase` / list 加 `include_deleted` | ✅ | `backend/app/services/showcase.py` |
| 3 | 后端 showcase router：`PATCH` / `DELETE`、`replaces_id` | ✅ | `backend/app/routers/showcase.py` |
| 4 | 后端 ingest router：`replaces_task_id` 软删原 bundle | ✅ | `backend/app/routers/ingest.py` |
| 5 | 后端 pytest：补 11 个新用例覆盖软删 / patch / replaces | ✅ | `backend/tests/test_audit.py`, `test_showcase.py`, `test_ingest.py` |
| 6 | 前端 api/client.ts：4 个新方法 + `include_deleted` / `replaces_*` 字段 + 软删类型 | ✅ | `frontend/src/api/client.ts`, `index.ts` |
| 7 | 前端 zustand `useEditingStore`：跨页编辑状态传递 | ✅ | `frontend/src/store/editing.ts` |
| 8 | 前端 AuditPage：默认过滤、双 checkbox、Modal 二次确认、行编辑/删除 | ✅ | `frontend/src/features/audit/AuditPage.tsx` |
| 9 | 前端 ShowcaseAuditPage：同上结构 | ✅ | `frontend/src/features/showcase/ShowcaseAuditPage.tsx` |
| 10 | 前端 MainPage：编辑模式 banner + 预填业务线/品类/标题，传 `replaces_task_id` | ✅ | `frontend/src/App.tsx`, `ManualSubmitBar.tsx` |
| 11 | 前端 ShowcaseUploadPage：编辑模式 banner，纯改元数据走 `PATCH`，传新文件走 `replaces_id` | ✅ | `frontend/src/features/showcase/ShowcaseUploadPage.tsx` |
| 12 | 契约文档 v0.3.0：新增 §2.3–2.12，版本表追加 | ✅ | `docs/api_contract.md` |

## 4. 关键决策

### 4.1 编辑 = "跳首页 + 重新提交"，不是 in-place 替换文件

- bundle 编辑：不能改文件，只能改元数据；要换图就走"软删旧的 + 新建一份"
- 前端把 `editingBundle` 塞进 zustand，跳 `/`，业务线/品类/标题预填；再次提交时把 `replaces_task_id` 一并送给后端
- 后端落盘成功后才软删旧记录（best-effort，软删失败不影响主响应）

为什么不做 in-place：当前架构是"提交 → 落盘 → metadata 不可变"，加 in-place 替换会破坏 sha256 / submit_id 这些原本不可变字段的语义。软删 + 新建保持简单。

### 4.2 信任前端身份

服务端不校验 `actor`：

- 当前架构本就信任 LocalStorage 花名（提交时也是裸 designer_id）
- 加 X-Uploader 校验只能挡误操作，挡不住恶意（curl 直接改 header 就行）
- 局域网工具，团队规模可控，简单优先；如需收紧后续再加

### 4.3 showcase 编辑：纯改元数据走 PATCH，要换图走 replaces_id

- 不传新文件 → `PATCH /api/showcases/{id}`，修改 brand / purpose
- 传新文件 → `POST /api/showcases/batch` + `replaces_id`，新建一份并软删旧的
- UI 层透明：用户点"编辑"进来后，根据有没有 dropzone 选文件自动判断，按钮文案随之变化

### 4.4 物理清理留坑

`storage/raw_ingestion/` 与 `storage/showcases/` 软删后**不动文件**。磁盘水位 middleware 仍把它们计入 quota。后续阶段需要：

- 一个 cron / 手工脚本，扫 `deleted_at` 超 N 天的目录真删
- 或加一个 admin endpoint `POST /api/admin/purge?older_than=30d`

## 5. 验证

```bash
# 后端
cd backend && uv run ruff check . && uv run pytest -q
# 85 passed

# 前端
cd frontend && pnpm type-check && pnpm exec eslint src && pnpm build
# 0 errors, 5 pre-existing warnings, build 326KB gzip 99KB
```

E2E 套件没扩展（保持原有覆盖）；新功能的端到端验证后续在 phase_7 后置 e2e 时再补。

## 6. 已知限制

- **物理清理未做**：见 §4.4
- **PATCH 没并发保护**：两个客户端同时 PATCH 同一记录会有 last-write-wins，无 ETag / If-Match。当前并发量下可接受
- **软删后能再 patch 吗**：不能，409 `already_deleted`
- **删除后能恢复吗**：API 上没有 `undelete`，但 metadata.json 没动，手动改 `deleted_at` = null 即可恢复（后续如有需要可加 `POST /api/.../restore`）

## 7. 文件改动概览

```
backend/app/routers/audit.py      +110/-30  (PATCH/DELETE/include_deleted)
backend/app/routers/showcase.py    +50/-3   (PATCH/DELETE/replaces_id)
backend/app/routers/ingest.py      +25/-3   (replaces_task_id)
backend/app/services/showcase.py   +75/-3   (patch_showcase/soft_delete/include_deleted)
backend/tests/test_audit.py        +75      (11 new cases)
backend/tests/test_showcase.py     +60      (5 new cases)
backend/tests/test_ingest.py       +40      (2 new cases)
frontend/src/api/client.ts         +95/-5
frontend/src/store/editing.ts     +35      (new)
frontend/src/features/audit/AuditPage.tsx        +210/-90  (rewrite)
frontend/src/features/showcase/ShowcaseAuditPage.tsx +180/-30  (rewrite)
frontend/src/features/showcase/ShowcaseUploadPage.tsx +60/-15
frontend/src/features/manual-sort/ManualSubmitBar.tsx +25/-10
frontend/src/App.tsx                                   +35/-3
docs/api_contract.md              +120     (§2.3–2.12, v0.3.0)
```

## 8. 后续修订：撤回编辑功能（2026-05-12 当天）

实际验证后判断"编辑跳首页 + 重新提交"的体验对用户**不够好**：

- bundle 编辑只能改元数据（title / 品类 / 业务线），但用户的真实诉求往往包含"换图"，做不了
- 让用户重新挑选图（不带过原图）重新提交一遍 = 比删了重发还麻烦
- 把图带过去技术上可做（新增 GET 文件 endpoint + 下载转 File），但 dev-time 成本和"磁盘 2 倍占用"的资源代价不值得

决定：**前端去掉所有编辑 UI**，只保留删除。后端 endpoint 全部留下：

| 后端保留 | 前端状态 |
|---|---|
| `PATCH /api/audit/bundles/{task_id}` | UI 未暴露 |
| `PATCH /api/showcases/{showcase_id}` | UI 未暴露 |
| `POST /api/bundles/batch` 接 `replaces_task_id` | UI 未暴露（前端不传） |
| `POST /api/showcases/batch` 接 `replaces_id` | UI 未暴露（前端不传） |
| `DELETE /api/audit/bundles/{task_id}` | ✅ UI 暴露（行内"删除"按钮） |
| `DELETE /api/showcases/{showcase_id}` | ✅ UI 暴露 |
| `GET ?include_deleted=` | ✅ UI 暴露（"显示已删除"复选框） |

### 撤回涉及的前端改动

- `frontend/src/store/editing.ts` 删除
- `frontend/src/store/index.ts` 去掉 `useEditingStore` 导出
- `App.tsx` MainPage 去掉编辑 banner / `editingBundle` 状态预填
- `ManualSubmitBar.tsx` 去掉 `replacesTaskId` / `initialTitle` / `onSubmitted` props
- `AuditPage.tsx` / `ShowcaseAuditPage.tsx` 去掉行内"编辑"按钮 + `handleEdit`
- `ShowcaseUploadPage.tsx` 去掉 edit-mode banner / `isMetaOnlyEdit` 分支 / `patchShowcase` 调用 / `replaces_id` 字段

`api/client.ts` 里的 `patchBundle` / `deleteBundle` / `patchShowcase` / `deleteShowcase` / `replaces_*` 字段保留，作为公开 SDK，方便日后回头补编辑或外部脚本调用。

### 想日后加回编辑

1. 加 GET 文件 endpoint：`GET /api/audit/bundles/{task_id}/files/{filename}` + showcase 同款
2. 编辑流程：进编辑页 → 后端拉所有原文件转 `File` → 塞 `manualFiles`/`files` → 用户改/不改都能走 POST + `replaces_*`
3. 或更轻量：dropzone 显示原图缩略图作占位预览，"修改图片"按钮才真触发下载 + `File` 化（"智能两态"）

后端契约 v0.3.0 已经为这条路铺好了 `replaces_*` 半成品。

