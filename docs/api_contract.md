# Tryon Collector · API Contract

> 冻结基线版本：**v0.1.0**（Phase 0 · 2026-05-05）
> 对应 `docs/phase_plan.md` §4.1。**任何字段改动须通过 RFC 并升 minor 版本**（0.2.0, 0.3.0 …）；破坏性变更升 major（1.0.0）。
> 本文档为前后端并行开发的合同。Phase 1 的后端实现、Phase 2 的前端提交路径都以此为准。

---

## 1. Base URL

- 开发/局域网：`http://<host>:8000`
- Phase 5 交付后：前端静态资源与 API 同端口 serve（`uvicorn --host 0.0.0.0`）

## 2. Endpoints

### 2.1 `GET /health`

**用途**：liveness 检查 + 声明当前运行模式。

**Response 200**
```json
{
  "status": "ok",
  "mode": "live"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `status` | `"ok"` | liveness 标识，非 ok 视为降级 |
| `mode` | `"live"` \| `"e2e"` | `e2e` 时后端会走 `app/testing.py` 的 mock 分发路径，不真写 `storage/raw_ingestion/`。前端通过 `VITE_API_MODE=e2e` 触发，见 §4 |

---

### 2.2 `POST /api/bundles/batch`

**用途**：一次性提交 N 个已在前端聚类就绪的 Bundle。**一次请求原子处理所有 Bundle**：每个 Bundle 各自原子落盘（见 §5），互不影响。

**Content-Type**: `multipart/form-data`

#### Form fields

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `designer_id` | string | ✅ | 花名。前端从 LocalStorage 读取，trim 后长度 1-32 |
| `business_line` | string | ✅ | 业务线 tag（如 `春季女装`），从后端配置表选择，前端保证合法性 |
| `category` | string | ✅ | 物理品类 tag（如 `连衣裙`） |
| `optional_notes` | string | ❌ | ≤ 500 字符，UTF-8 |
| `client_submit_id` | uuid v4 | ✅ | **幂等键**。同值重复提交后端必须返回**首次结果**，不重复落盘 |
| `bundles` | JSON string | ✅ | 见下方 `BundleMeta[]` 结构 |
| `file_<group_key>_<role>` | binary | 见下文 | 文件字段，每个 Bundle 对应 3-4 个文件字段 |

#### `bundles` JSON 结构

```ts
type Role = "product" | "tryon" | "retouched" | "annotated";

interface BundleMeta {
  group_key: string;           // 款号，前端聚类产生，[A-Za-z0-9_-]{3,64}
  files: {
    product: string[];         // 指向 form 中的 file 字段名（数组，支持多图）
    tryon: string[];
    retouched: string[];
    annotated?: string[];      // 可选
  };
}
```

> 向后兼容：`files` 中每个角色的值也接受单个 string（自动包装为 `[string]`）。

**示例**（两个 Bundle）：
```
POST /api/bundles/batch
Content-Type: multipart/form-data; boundary=XYZ

--XYZ
Content-Disposition: form-data; name="designer_id"
张三
--XYZ
Content-Disposition: form-data; name="business_line"
春季女装
--XYZ
Content-Disposition: form-data; name="category"
连衣裙
--XYZ
Content-Disposition: form-data; name="optional_notes"
领口 AI 画反了
--XYZ
Content-Disposition: form-data; name="client_submit_id"
8f14e45f-ceea-467a-a9e5-c5f2e0c4f5a1
--XYZ
Content-Disposition: form-data; name="bundles"
[
  {"group_key":"SKU12345","files":{"product":"file_SKU12345_product","tryon":"file_SKU12345_tryon","retouched":"file_SKU12345_retouched"}},
  {"group_key":"A1-0423","files":{"product":"file_A1-0423_product","tryon":"file_A1-0423_tryon","retouched":"file_A1-0423_retouched","annotated":"file_A1-0423_annotated"}}
]
--XYZ
Content-Disposition: form-data; name="file_SKU12345_product"; filename="SKU12345-ref.jpg"
Content-Type: image/jpeg
<binary>
--XYZ
... (其余 6 个文件字段略) ...
--XYZ--
```

#### 字段校验规则

| 字段 | 规则 | 失败时响应 |
|---|---|---|
| `designer_id` | 长度 1-32，trim 后非空 | 422 `invalid_designer_id` |
| `business_line` / `category` | 命中后端配置白名单（Phase 1 交付配置文件） | 422 `invalid_tag` |
| `client_submit_id` | UUID v4 格式 | 422 `invalid_submit_id` |
| `bundles` | 非空 JSON 数组，≤ 50 条 | 422 `invalid_bundles` / `bundle_limit_exceeded` |
| `group_key` | 匹配 `/^[A-Za-z0-9_-]{3,64}$/`，同批次内唯一 | 422 `invalid_group_key` / `duplicate_group_key` |
| `files.product / tryon / retouched` | 必须存在对应的 form 文件字段，MIME `image/jpeg` 或 `image/png`，单文件 ≤ 20 MB | 422 `missing_role` / `invalid_mime` / `file_too_large` |
| `files.annotated` | 可选，规则同上 | 同上 |

#### Response 200

```json
{
  "submit_id": "8f14e45f-ceea-467a-a9e5-c5f2e0c4f5a1",
  "accepted": [
    {"group_key": "SKU12345", "task_id": "550e8400-e29b-41d4-a716-446655440000"},
    {"group_key": "A1-0423", "task_id": "550e8400-e29b-41d4-a716-446655440001"}
  ],
  "rejected": []
}
```

**部分成功**：若某个 Bundle 落盘失败（如磁盘满、某张图 MIME 非法），该 Bundle 进 `rejected`，其它仍可 accepted。HTTP 状态仍为 200。前端据此在矩阵中把失败行保留标红，成功行移出。

```json
{
  "submit_id": "...",
  "accepted": [{"group_key": "SKU12345", "task_id": "..."}],
  "rejected": [
    {"group_key": "A1-0423", "reason": "missing_retouched", "detail": "file field file_A1-0423_retouched not present"}
  ]
}
```

**`rejected.reason` 枚举**（稳定契约）：`missing_role` / `invalid_mime` / `file_too_large` / `invalid_group_key` / `duplicate_group_key` / `disk_full` / `hash_collision` / `internal_error`。

#### Response 4xx/5xx

| HTTP | 场景 | body |
|---|---|---|
| 400 | Content-Type 非 multipart | `{"detail": "multipart/form-data required"}` |
| 422 | Form 字段级校验失败（整体拒绝，不落盘） | FastAPI 标准 validation error |
| 413 | 总体积超上限（默认 512 MB / 请求） | `{"detail": "payload_too_large", "limit_mb": 512}` |
| 503 | 磁盘水位超阈值（Phase 5） | `{"detail": "storage_watermark_exceeded"}` |
| 500 | 未预期异常 | `{"detail": "internal_error", "trace_id": "..."}` |

### 2.3 `GET /api/audit/bundles`

列出已提交的 bundle，支持过滤、分页和软删可见性。

| Query 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `designer_id` | string | — | 按花名精确匹配 |
| `category` | string | — | 按品类精确匹配 |
| `include_deleted` | bool | `false` | 是否包含 `deleted_at` 非空的记录 |
| `limit` | int | 100 | 1-500 |
| `offset` | int | 0 | ≥ 0 |

响应：`{"total": int, "offset": int, "limit": int, "bundles": AuditBundle[]}`，按 `upload_time` 倒序。

### 2.4 `PATCH /api/audit/bundles/{task_id}`

修改 bundle 元数据（不动文件）。**信任前端身份**，不做鉴权 — 前端只对自己的记录显示「编辑」入口；恶意客户端能改任意记录，符合当前局域网无账号的信任模型。

| Query 参数 | 说明 |
|---|---|
| `actor` | 操作者花名，仅写入 `updated_by` 字段做审计记录 |

Body（`application/json`，下列字段任意子集）：
```json
{ "title": "...", "business_line": "...", "category": "...", "optional_notes": "..." }
```

| HTTP | 场景 | body |
|---|---|---|
| 200 | 成功，返回更新后的完整 metadata | `{...}` |
| 404 | task_id 不存在 | `{"detail": "not_found"}` |
| 409 | 记录已软删 | `{"detail": "already_deleted"}` |
| 422 | 无可改字段 / `business_line` / `category` 不在白名单 | `{"detail": "no_patchable_fields" | "invalid_tag" | "invalid_optional_notes"}` |

### 2.5 `DELETE /api/audit/bundles/{task_id}`

软删除：在 `metadata.json` 加 `deleted_at` / `deleted_by`，**不动文件**。幂等：重复删返回 200，`deleted_at` 不更新。

| Query 参数 | 说明 |
|---|---|
| `actor` | 操作者花名，写入 `deleted_by` |

| HTTP | 场景 | body |
|---|---|---|
| 200 | 成功（含已删除记录） | 完整 metadata |
| 404 | task_id 不存在 | `{"detail": "not_found"}` |

### 2.6 `POST /api/bundles/batch` 编辑流扩展（v0.3.0）

增加可选 form 字段 `replaces_task_id`：若提供且本次提交至少一个 bundle 落盘成功，**会自动软删** `replaces_task_id` 指向的旧 bundle（`deleted_by` = 本次 `designer_id`）。

- 软删失败不影响主响应（best-effort）
- 若本次全部 rejected，`replaces_task_id` 被忽略
- 用于「编辑跳首页 → 重新提交 → 旧记录自动软删」的语义

### 2.7 `POST /api/showcases/batch`

展示图采集，与 bundle 流程并行、契约独立。

#### Form fields

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `uploader` | string | ✅ | 花名，1-32 |
| `brand` | string | ✅ | 品牌名，1-64 |
| `purpose` | string | ❌ | 用途说明，≤ 200 |
| `client_submit_id` | uuid v4 | ✅ | （目前 showcase 不做幂等回放，仅做格式校验） |
| `files` | binary | ✅ | 1+ 个文件字段，图片或视频 |
| `replaces_id` | string | ❌ | v0.3.0 新增：若提供且提交成功，自动软删指向的旧 showcase |

#### 文件类型 / 大小

| 类型 | MIME | 单文件上限 |
|---|---|---|
| 图片 | image/jpeg, image/png, image/webp, image/tiff, image/bmp, image/heic, image/heif, image/gif | 50 MB |
| 视频 | video/mp4, video/webm, video/quicktime, video/x-msvideo, video/x-matroska, video/x-flv, video/mpeg, video/3gpp | 200 MB |

| HTTP | 场景 | body |
|---|---|---|
| 201 | 成功落盘 | `{"showcase_id": "...", "submit_id": "..."}` |
| 415 | MIME 不在允许列表 | `{"detail": "unsupported_mime:<mime>"}` |
| 413 | 单文件超上限 | `{"detail": "file_too_large:<filename>"}` |
| 422 | uploader / brand / submit_id 校验失败 | `{"detail": "invalid_uploader" | "invalid_brand" | "invalid_client_submit_id" | "no_files"}` |

### 2.8 `GET /api/showcases`

列出 showcase。Query 参数：`uploader` / `brand` / `include_deleted`（默认 false） / `limit` / `offset`。响应同 §2.3 形状，字段名 `showcases`。

### 2.9 `PATCH /api/showcases/{showcase_id}`

修改 showcase 元数据。Body 可包含 `brand` 或 `purpose`（其他字段被静默丢弃）。404 / 409 / 422 与 §2.4 同。

### 2.10 `DELETE /api/showcases/{showcase_id}`

软删除，与 §2.5 等价。

### 2.11 软删除字段

bundle 与 showcase 共用同一约定。出现于 `metadata.json` 与所有 list/patch 响应中：

| 字段 | 类型 | 说明 |
|---|---|---|
| `deleted_at` | ISO8601 UTC | 软删时间戳；存在表示已删除 |
| `deleted_by` | string | 删除者花名（若调用时带了 `actor`） |
| `updated_at` | ISO8601 UTC | 最近一次 PATCH 时间戳 |
| `updated_by` | string | 最近一次 PATCH 操作者花名 |

物理清理：**未实现**。`storage/raw_ingestion/` 与 `storage/showcases/` 体积会持续增长，需要管理员手动清理或后续阶段加定时任务。磁盘水位 middleware（§2.2）只覆盖 `POST /api/bundles/batch`，软删记录占用的空间也会计入。

### 2.12 信任模型

写操作（PATCH / DELETE / `replaces_*`）**完全信任前端**：

- 服务端不校验 `actor` 是否等于记录拥有者
- 前端通过"只看自己 + 仅自己的行显示删除"做软约束，但 cURL 任意 `task_id` 都能改/删
- 这是局域网工具的有意决策；如需收紧，后续阶段可加 `X-Uploader` header 校验或引入 token

### 2.13 UI 暴露状态（v0.3.0）

后端契约 v0.3.0 全量提供 PATCH / DELETE / `replaces_*` / `include_deleted`。当前前端 UI **只暴露 DELETE 与 include_deleted**：

| 能力 | UI 暴露 |
|---|---|
| `DELETE` 行内"删除"按钮（带 Modal 二次确认） | ✅ |
| `GET ?include_deleted=true` "显示已删除" checkbox | ✅ |
| 默认按 nickname 过滤 + "看所有人的" checkbox | ✅ |
| `PATCH` 元数据编辑 | ❌ |
| `POST + replaces_*` 编辑覆盖 | ❌ |

PATCH 与 `replaces_*` 是为了未来加回"编辑"功能时不再动后端契约而保留的 SDK，目前没有前端入口，但 cURL / 外部脚本可以直接调用。详见 `docs/phases/phase_7.md` §8。



## 3. 幂等性

- 以 `client_submit_id` 作为幂等键，保留窗口 **24 小时**（Phase 1 以本地文件 `storage/.idempotency/<uuid>.json` 实现）。
- 同一 `client_submit_id` 重复请求：若前一次处理已完成，返回 200 + 首次响应体（连同 `accepted/rejected` 原样回放）；若前一次仍在处理中，返回 409 `{"detail": "in_progress"}`（前端 500ms 后重试）。
- `client_submit_id` 必须由**前端生成**（`crypto.randomUUID()`），一次「点击提交」生成一次；重试时保持相同值。

## 4. E2E 模式开关

- 前端构建/dev 通过 `VITE_API_MODE=e2e` 触发，所有请求带 header `X-Tryon-Mode: e2e`。
- 后端识别该 header 后走 `app/testing.py` 的内存 mock：只做校验与响应生成，**不写文件系统**。
- `/health` 的 `mode` 字段由服务器端 `VITE_API_MODE` 环境变量决定（非 header），用于快速辨识当前实例。
- 生产部署（Phase 5）必须显式 `VITE_API_MODE=live`，header 也会被忽略，避免误开。

## 5. 落盘结构（服务器内部约定，非 API 一部分，但与契约强相关）

```
storage/
├── raw_ingestion/<task_id>/
│   ├── product_0.jpg          # 统一扩展名由 MIME 决定（.jpg / .png）
│   ├── product_1.jpg          # 同角色多图时带索引
│   ├── tryon_0.jpg
│   ├── retouched_0.jpg
│   ├── annotated_0.jpg        # 若 bundle 提供
│   └── metadata.json
├── .staging/<task_id>/        # 原子提交中间态；完成后 os.rename 到 raw_ingestion/
├── .idempotency/<submit_id>.json   # 幂等键存档，24h TTL
└── dispatch_log/              # Phase 3 分发审计
```

**`metadata.json` 示例**：
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "submit_id": "8f14e45f-ceea-467a-a9e5-c5f2e0c4f5a1",
  "designer_id": "张三",
  "business_line": "春季女装",
  "category": "连衣裙",
  "optional_notes": "领口 AI 画反了",
  "group_key": "SKU12345",
  "upload_time": "2026-05-05T04:00:00Z",
  "has_annotation": false,
  "files": {
    "product": [
      {"filename": "product_0.jpg", "mime": "image/jpeg", "sha256": "...", "bytes": 2457600},
      {"filename": "product_1.jpg", "mime": "image/jpeg", "sha256": "...", "bytes": 1984000}
    ],
    "tryon": [
      {"filename": "tryon_0.jpg", "mime": "image/jpeg", "sha256": "...", "bytes": 2318901}
    ],
    "retouched": [
      {"filename": "retouched_0.jpg", "mime": "image/jpeg", "sha256": "...", "bytes": 2641203}
    ]
  }
}
```

## 6. 版本与变更

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1.0 | 2026-05-05 | Phase 0 冻结首版：`/health` + `/api/bundles/batch` 合同，幂等键、partial-success 响应、e2e 模式开关 |
| 0.2.0 | 2026-05-10 | `files` 字段改为数组格式支持多图；移除 `duplicate_group_key` 校验；存储文件名改为 `{role}_{idx}.{ext}` |
| 0.3.0 | 2026-05-12 | 审计 / 展示图加 `PATCH` + `DELETE` 软删；list 接口加 `include_deleted`；`POST /api/bundles/batch` 加 `replaces_task_id`，`POST /api/showcases/batch` 加 `replaces_id`；新增 §2.3-2.12 |

**变更流程**：修改本文档需附带：
1. 同步更新 `phase_plan.md` §4.1
2. 后端 `app/routers/ingest.py` 实现对齐
3. 前端 `src/api/` 客户端对齐
4. Playwright 用例 1-6 中涉及提交的 spec 回归
