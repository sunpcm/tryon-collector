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
    product: string;           // 指向 form 中的 file_<group_key>_product 字段名
    tryon: string;
    retouched: string;
    annotated?: string;        // 可选
  };
}
```

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
│   ├── product.jpg            # 统一扩展名由 MIME 决定（.jpg / .png）
│   ├── tryon.jpg
│   ├── retouched.jpg
│   ├── annotated.jpg          # 若 bundle 提供
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
    "product": {"filename": "product.jpg", "mime": "image/jpeg", "sha256": "...", "bytes": 2457600},
    "tryon":   {"filename": "tryon.jpg",   "mime": "image/jpeg", "sha256": "...", "bytes": 2318901},
    "retouched": {"filename": "retouched.jpg", "mime": "image/jpeg", "sha256": "...", "bytes": 2641203}
  }
}
```

## 6. 版本与变更

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1.0 | 2026-05-05 | Phase 0 冻结首版：`/health` + `/api/bundles/batch` 合同，幂等键、partial-success 响应、e2e 模式开关 |

**变更流程**：修改本文档需附带：
1. 同步更新 `phase_plan.md` §4.1
2. 后端 `app/routers/ingest.py` 实现对齐
3. 前端 `src/api/` 客户端对齐
4. Playwright 用例 1-6 中涉及提交的 spec 回归
