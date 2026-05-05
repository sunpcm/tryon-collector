# 开发工作流指南 (Workflow Guide)

本文档详细介绍了本项目的开发规范，包括提交信息的格式、Pull Request (PR) 的流程以及分支管理的最佳实践。

## 1. 提交规范 (Commit Convention)

本项目严格遵循 [Conventional Commits](https://www.conventionalcommits.org/) (Angular 规范)。所有提交信息必须符合以下格式，否则将被 Git Hook (`commitlint`) 拦截。

### 1.1 提交格式

```text
<type>(<scope>): <subject>
// 空行
<body>
// 空行
<footer>
```

- **type**: 提交类别 (必填)
- **scope**: 影响范围 (选填，例如: `auth`, `ui`, `deps`)
- **subject**: 简短描述 (必填)
- **body**: 详细描述 (选填)
- **footer**: 关联 Issue 或 Breaking Changes (选填)

### 1.2 允许的 Type 类型

| Type | Emoji | 含义 (Description) |
| :--- | :---: | :--- |
| `feat` | ✨ | 新增功能 (A new feature) |
| `fix` | 🐛 | 修复缺陷 (A bug fix) |
| `docs` | 📝 | 文档更新 (Documentation only changes) |
| `style` | 💄 | 代码格式 (空格, 分号等格式修正，不影响代码运行的变动) |
| `refactor`| ♻️ | 代码重构 (既不是新增功能，也不是修改bug的代码变动) |
| `perf` | ⚡️ | 性能提升 (A code change that improves performance) |
| `test` | ✅ | 测试相关 (Adding missing tests or correcting existing tests) |
| `build` | 📦️ | 构建相关 (Changes that affect the build system or external dependencies) |
| `ci` | 🎡 | 持续集成 (Changes to our CI configuration files and scripts) |
| `chore` | 🔨 | 其他修改 (Other changes that don't modify src or test files) |
| `revert` | ⏪️ | 回退代码 (Reverts a previous commit) |

### 1.3 提交拦截 (Hooks)

在执行 `git commit` 时，**Husky** 会触发以下检查：
1. **Lint-staged**:
    - 对暂存区的文件运行 `eslint --fix` 和 `prettier --write`。
    - 运行全量类型检查 `pnpm type-check`。
2. **Commitlint**:
    - 验证提交信息是否符合上述格式。

---

## 2. PR 规范流程 (Pull Request Workflow)

所有代码变更必须通过 Pull Request (PR) 合并。

### 2.1 PR 流程
1. **创建分支**: 从 `develop` 分支切出新的功能分支 (`feat/xxx`) 或修复分支 (`fix/xxx`)。
2. **提交代码**: 遵循提交规范进行 commit。
3. **发起 PR**: 将分支合并请求提交到 `develop` 分支 (如果是热修复可针对 `main`)。
4. **CI 检查**: GitHub Actions 会自动运行一系列检查 (见下文)。
5. **代码审查**: 等待人工 Review 或 AI Review 反馈。
6. **合并**: 检查通过并获得批准后，Squash 合并至目标分支。

### 2.2 CI 检查项 (Checklist)

当 PR 创建或更新时，CI 系统会自动执行以下任务：

*   **📝 Commit Lint**: 检查 PR 包含的所有 Commit Message 是否符合规范。
*   **🛡️ Dependency Review**: 扫描是否存在高危依赖漏洞。
*   **🔤 Spell & Link Check**: 检查单词拼写错误及 Markdown 死链。
*   **🏗️ Build Check**: 确保项目能成功构建且无类型错误。
*   **🧪 Unit Test**: 运行全量单元测试 (`pnpm test:run`)。
*   **🎭 E2E Smoke Test**: 运行带有 `@smoke` 标签的关键路径端到端测试。
*   **🤖 AI Code Review**: AI Agent 会自动审查代码并提供改进建议 (非阻塞性)。

> **注意**: 如果 CI 失败，PR 会自动打上 `ci-failed` 标签。你可以通过在评论区输入 `/retest` 重新触发检查。

---

## 3. 分支管理与同步 (Branch Management)

本项目采用简化的 Git Flow 模型。

### 3.1 核心分支

| 分支名 | 说明 | 保护规则 |
| :--- | :--- | :--- |
| **`main`** | 生产分支 (Production) | 🔒 仅允许 PR 合并，必须通过 CI 和 Code Review |
| **`develop`**| 开发主分支 (Integration) | 🔒 仅允许 PR 合并，所有新功能在此集成 |

### 3.2 辅助分支

*   **Feature 分支**: `feat/<name>` (从 `develop` 切出，合回 `develop`)
*   **Fix 分支**: `fix/<name>` (从 `develop` 切出，合回 `develop`)
*   **Hotfix 分支**: `hotfix/<name>` (从 `main` 切出，合回 `main` 和 `develop`)

### 3.3 自动同步策略

为了保持分支一致性，配置了 **Sync Back** 工作流：

*   **触发**: 当代码被 Push 或合并到 `main` 分支时。
*   **动作**: 自动尝试将 `main` 的最新代码合并回 `develop`。
*   **冲突处理**: 如果自动合并遇到冲突，同步任务将失败，需要人工手动解决冲突并推送到 `develop`。

### 3.4 最佳实践

1.  **频繁同步**: 开发过程中经常执行 `git pull origin develop` (或 rebase)，避免合并时产生大量冲突。
2.  **原子提交**: 每个 Commit 只做一件事，便于回退和 Cherry-pick。
3.  **Draft PR**: 开发未完成时可开启 Draft PR，利用 CI 提前发现问题，此时不会触发昂贵的 E2E 全量测试（视配置而定）。
