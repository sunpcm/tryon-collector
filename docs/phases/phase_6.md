# Phase 6 · 业务线/品类自定义标签

> 状态：**已完成** ✅（2026-05-10）

## 1. 背景

业务线和品类标签硬编码在前后端代码中（`ingest.py:29-30`、`config/index.ts:19-38`），每次调整需要改代码、测试、部署。改为可配置的自定义标签。

## 2. 方案

基于项目"无 DB"约束和当前业务量（3个月 x 10组/天 ≈ 900 bundle），采用 **JSON 配置文件**方案：

- `storage/tags.json` 存储标签配置
- 后端 `GET /api/tags` 读取配置
- 后端 `PUT /api/tags` 更新配置（管理员）
- 前端启动时拉取标签，失败时回退到内置默认值

## 3. 任务进度

| # | 任务 | 状态 | 文件 | 说明 |
|---|------|------|------|------|
| 1 | 创建默认 tags.json | ✅ | `storage/tags.json` | 初始标签数据 |
| 2 | 后端 tags 服务 | ✅ | `backend/app/services/tags.py` | 读写 tags.json，含默认值回退 |
| 3 | 后端 tags 路由 | ✅ | `backend/app/routers/tags.py` | GET/PUT /api/tags |
| 4 | 注册路由 | ✅ | `backend/app/main.py:73` | 挂载 tags router |
| 5 | 后端 ingest 改造 | ✅ | `backend/app/routers/ingest.py` | 从 tags 服务动态读取校验列表 |
| 6 | 后端 testing 改造 | ✅ | `backend/app/testing.py` | E2E mock 也走动态标签 |
| 7 | 前端 tags API | ✅ | `frontend/src/api/client.ts` | fetchTags / updateTags |
| 8 | 前端 tags store | ✅ | `frontend/src/store/tags.ts` | Zustand store 缓存标签 |
| 9 | 前端 TagSelector 改造 | ✅ | `frontend/src/features/tagging/TagSelector.tsx` | 使用动态标签 |
| 10 | 前端 config 清理 | ✅ | `frontend/src/config/index.ts` | 移除硬编码常量 |
| 11 | 前端标签管理页 | ✅ | `frontend/src/features/tagging/TagManager.tsx` | 可视化增删标签 |

## 4. 新增/修改代码

### 后端
- `app/services/tags.py` — 新增：读写 `storage/tags.json`，含默认值回退
- `app/routers/tags.py` — 新增：`GET /api/tags` + `PUT /api/tags`
- `app/main.py:73` — 新增：注册 tags router
- `app/routers/ingest.py:53-56` — 改造：从 `get_tags()` 动态读取校验集合
- `app/testing.py:39-42` — 改造：E2E mock 同样使用动态标签

### 前端
- `src/api/client.ts` — 新增：`fetchTags()` / `updateTags()`
- `src/store/tags.ts` — 新增：Zustand store，启动时加载标签
- `src/features/tagging/TagSelector.tsx` — 改造：从 store 读取标签列表
- `src/features/tagging/TagManager.tsx` — 新增：标签管理页，支持增删业务线和品类
- `src/App.tsx` — 新增：`/tags` 路由 + 导航入口
- `src/config/index.ts` — 移除：`VALID_BUSINESS_LINES` / `VALID_CATEGORIES` 硬编码常量

### 配置
- `storage/tags.json` — 新增：标签配置文件

## 5. 使用方式

**通过界面修改**：导航栏点击「标签管理」→ 增删业务线/品类 → 点击保存。

**通过文件修改**：直接编辑 `storage/tags.json`，刷新前端页面即可生效。

```json
{
  "business_lines": ["春季女装", "秋季女装", "春季男装", "秋季男装", "童装", "配饰"],
  "categories": ["连衣裙", "上衣", "裤子", "外套", "裙子", "鞋履", "包袋", "其他"]
}
```

**通过 API 修改**：`PUT /api/tags`，body 为上述 JSON。

## 6. 测试结果

- 后端：58 个测试全部通过，ruff lint clean
- 前端：71 个测试全部通过

---

## 附：手动分拣模式

> 日期：2026-05-10

### 背景

设计师文件命名不规则，自动聚类识别率低。改为默认显示四个角色框，设计师手动拖入对应框。

### 改动

- `src/store/matrix.ts` — 新增 `manualFiles` state + `addManualFiles` / `removeManualFile` / `clearManual` / `isManualReady`
- `src/features/manual-sort/RoleBox.tsx` — 新增：单个角色框（Dropzone + 缩略图 + 删除）
- `src/features/manual-sort/ManualSort.tsx` — 新增：四框布局容器
- `src/features/manual-sort/ManualSubmitBar.tsx` — 新增：手动模式提交栏
- `src/App.tsx` — 默认手动模式，可切换到自动聚类

### 交互

1. 默认：四框（产品图/试穿图/精修图/标注图），每框独立 Dropzone
2. 拖入/点击添加图片，hover 显示删除按钮
3. 提交时 groupKey 自动生成 UUID
4. 点击「切换自动聚类」可切回旧模式
