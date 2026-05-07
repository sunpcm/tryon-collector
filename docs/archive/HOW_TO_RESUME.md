# 如何继续当前会话

> 适用场景：你今天 `/exit` 后，下次想让 Claude 接着 Phase 1 干。
> 对应 memory 目录：`/Users/sunpcm/.claude/projects/-Users-sunpcm-code-tryon-collector/memory/`

## 核心机制

Claude Code 的对话历史是按 session 隔离的，新 session **不会**自动看到上一 session 的消息。要让下一次会话「知道我们之前在干嘛」，靠两个机制：

1. **持久化 memory（已配置）**：6 个 markdown 文件存在 `~/.claude/projects/-Users-sunpcm-code-tryon-collector/memory/`，Claude 启动时会通过 `MEMORY.md` 索引加载。
2. **session resume（可选）**：`claude --continue` 或 `--resume` 恢复本地 session 文件，保留原始对话。

## 推荐流程（30 秒）

```bash
cd /Users/sunpcm/code/tryon-collector
claude                          # 启动 Claude Code
```

然后一句话开场：

> 从 Phase 1 开始，按 `docs/phases/phase_0.md` §6 的三个 ticket 顺序推进。

Claude 会自动从 memory 恢复：
- 项目定位与技术栈强约束（`project_overview.md`）
- Phase 0 已完成、分支 `feat/phase-0-scaffold`、Phase 1 待办 3 个 ticket（`current_progress.md`）
- 你的协作偏好：阶段末必更文档、每子任务一 commit、feat 分支、中文对话（`collaboration_preferences.md`）
- 本机已踩过的坑：Clash 代理、Vite IPv6、pnpm approve-builds（`gotchas.md`）
- 权威文档路径（`key_docs_index.md`）

## 想恢复完整历史对话（可选）

```bash
cd /Users/sunpcm/code/tryon-collector
claude --resume                 # 弹出 session 列表，选今天这场
```

或直接延续最近一场：

```bash
claude --continue
```

⚠️ 注意：session 文件本地存储，**换机器就没了**。memory 是跨机器可搬运的（只要复制 `~/.claude/projects/...` 目录）。

## 验证恢复是否成功

新会话开头让 Claude 执行这几条，如果输出符合预期就 OK：

```bash
git status                      # 当前应在 feat/phase-0-scaffold
git log --oneline -10           # HEAD 应是 919ce20 docs(phases): close Phase 0...
make test                       # 15 个单测全绿
make e2e                        # Playwright chromium+webkit 全绿
```

如果 Claude 没提 Phase 1 的三个 ticket，或说不出 `animal-island-ui@0.7.7` 这个锁定版本，说明 memory 没加载，检查：

```bash
ls ~/.claude/projects/-Users-sunpcm-code-tryon-collector/memory/
# 应看到 MEMORY.md + 5 个主题文件
```

## Memory 维护习惯

- 每个 Phase 收官时，让 Claude 更新 `current_progress.md`（它会主动做）
- 新发现的坑记到 `gotchas.md`
- 技术栈、分支、命名规则变动 → 同时更新 `project_overview.md` 与 `docs/phase_plan.md`
- `MEMORY.md` 是索引，内容写在单独文件里，不要塞满索引

## Memory 目录速览

```
~/.claude/projects/-Users-sunpcm-code-tryon-collector/memory/
├── MEMORY.md                       # 索引（每次会话自动加载）
├── project_overview.md             # 项目定位 + 技术栈强约束
├── current_progress.md             # Phase 进度、分支状态、下一步 ticket
├── collaboration_preferences.md    # 协作偏好（feat 分支 / 多 commit / 中文）
├── gotchas.md                      # 已踩坑（代理、IPv6、approve-builds）
└── key_docs_index.md               # 权威文档路径与读法
```
