// commitlint.config.js
/** @type {import('cz-git').UserConfig} */
export default {
  // 继承社区默认的规则 (Angular规范)
  extends: ['@commitlint/config-conventional'],

  // 自定义规则（可选）
  rules: {
    // 比如：type 必须小写
    // 'type-case': [2, 'always', 'lower-case'],
    // 比如：scope 不能为空（0=off, 1=warn, 2=error）
    // 'scope-empty': [0],
  },

  // 下面是 cz-git 的配置，用于自定义命令行交互体验
  prompt: {
    alias: { fd: 'docs: fix typos' },
    messages: {
      type: '选择你要提交的类型 :',
      scope: '选择一个提交范围 (可选):',
      customScope: '请输入自定义的提交范围 :',
      subject: '填写简短精炼的变更描述 :\n',
      body: '填写更加详细的变更描述 (可选)。使用 "|" 换行 :\n',
      breaking: '列举非兼容性重大的变更 (可选)。使用 "|" 换行 :\n',
      footerPrefixsSelect: '选择关联issue前缀 (可选):',
      customFooterPrefix: '输入自定义issue前缀 :',
      footer: '列举关联issue (可选) 例如: #31, #I3244 :\n',
      confirmCommit: '是否提交或修改commit ?',
    },
    types: [
      { value: 'feat', name: 'feat:     ✨  新增功能 | A new feature' },
      { value: 'fix', name: 'fix:      🐛  修复缺陷 | A bug fix' },
      {
        value: 'docs',
        name: 'docs:     📝  文档更新 | Documentation only changes',
      },
      {
        value: 'style',
        name: 'style:    💄  代码格式 | Changes that do not affect the meaning of the code',
      },
      {
        value: 'refactor',
        name: 'refactor: ♻️   代码重构 | A code change that neither fixes a bug nor adds a feature',
      },
      {
        value: 'perf',
        name: 'perf:     ⚡️  性能提升 | A code change that improves performance',
      },
      {
        value: 'test',
        name: 'test:     ✅  测试相关 | Adding missing tests or correcting existing tests',
      },
      {
        value: 'build',
        name: 'build:    📦️  构建相关 | Changes that affect the build system or external dependencies',
      },
      {
        value: 'ci',
        name: 'ci:       🎡  持续集成 | Changes to our CI configuration files and scripts',
      },
      {
        value: 'chore',
        name: "chore:    🔨  其他修改 | Other changes that don't modify src or test files",
      },
      {
        value: 'revert',
        name: 'revert:   ⏪️  回退代码 | Reverts a previous commit',
      },
    ],
    useEmoji: true,
    emojiAlign: 'center',
    themeColorCode: '38',
  },
};
