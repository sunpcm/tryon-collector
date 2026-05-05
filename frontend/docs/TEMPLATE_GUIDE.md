# Template 使用指南

## 🎯 关于这个 Template

这是一个专门为快速启动 React TypeScript 项目而设计的现代化模板。它采用轻量级设计理念，预配置了核心开发工具，同时保持足够的灵活性让你按需扩展。

## ✨ 设计理念

### 轻量优先

- 最小化预装依赖
- 专注于核心开发体验
- 避免过度配置

### 最佳实践

- TypeScript 类型安全
- 现代化工具链配置
- 完整的代码质量检查

### 可扩展性

- 清晰的项目结构
- 详细的扩展指南
- 模块化组件设计

## 🏗️ 架构说明

### 核心技术栈

| 技术         | 版本 | 作用       |
| ------------ | ---- | ---------- |
| React        | 19.x | UI 框架    |
| TypeScript   | 5.x  | 类型安全   |
| Vite         | 7.x  | 构建工具   |
| Tailwind CSS | 4.x  | 样式框架   |
| Jest         | 30.x | 测试框架   |
| ESLint       | 9.x  | 代码检查   |
| Prettier     | 3.x  | 代码格式化 |

### 目录结构说明

```
src/
├── components/          # 组件库
│   ├── ui/             # 基础 UI 组件
│   │   ├── Button.tsx  # 按钮组件
│   │   ├── Card.tsx    # 卡片组件
│   │   ├── Loading.tsx # 加载组件
│   │   └── index.ts    # 导出文件
│   └── index.ts        # 组件总导出
├── hooks/              # 自定义 Hooks
│   ├── useLocalStorage.ts # 本地存储 Hook
│   └── index.ts        # Hook 导出
├── types/              # 类型定义
│   └── index.ts        # 通用类型
├── utils/              # 工具函数
│   ├── cn.ts           # 类名合并工具
│   └── index.ts        # 工具导出
├── App.tsx             # 主应用组件
└── main.tsx            # 应用入口
```

## 🎨 UI 组件设计

### Button 组件

支持多种变体和尺寸的按钮组件：

```tsx
// 基本用法
<Button>默认按钮</Button>

// 不同变体
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="outline">边框按钮</Button>
<Button variant="ghost">幽灵按钮</Button>

// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="md">中等按钮</Button>
<Button size="lg">大按钮</Button>
```

### Card 组件

灵活的卡片容器组件：

```tsx
<Card>
  <h2>卡片标题</h2>
  <p>卡片内容</p>
</Card>

<Card className="max-w-md">
  自定义样式的卡片
</Card>
```

### Loading 组件

Loading 指示器组件：

```tsx
<Loading />
<Loading size="lg" />
<Loading className="text-blue-500" />
```

## 🔧 工具函数

### cn() - 类名合并

基于 `clsx` 和 `tailwind-merge` 的类名合并工具：

```tsx
import { cn } from '@/utils';

// 基本用法
cn('px-4', 'py-2', 'bg-blue-500');

// 条件类名
cn('base-class', {
  'active-class': isActive,
  'disabled-class': isDisabled,
});

// Tailwind 类名智能合并
cn('px-4', 'px-6'); // 结果: 'px-6'
```

### useLocalStorage Hook

自动同步状态与本地存储：

```tsx
import { useLocalStorage } from '@/hooks';

function MyComponent() {
  const [count, setCount] = useLocalStorage('count', 0);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

### useDebounce Hook

防抖处理 Hook：

```tsx
import { useDebounce } from '@/hooks';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // 执行搜索
    }
  }, [debouncedSearchTerm]);
}
```

## 🧪 测试策略

### 组件测试

每个组件都有对应的测试文件：

```typescript
// Button.test.tsx
describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### 测试最佳实践

1. **测试用户行为**，而不是实现细节
2. **使用语义化选择器** (`getByRole`, `getByLabelText`)
3. **测试关键功能和边界情况**
4. **保持测试简单易懂**

## 🚀 部署建议

### 静态托管

推荐使用以下平台：

1. **Vercel** - 零配置部署
2. **Netlify** - 拖拽部署
3. **Cloudflare Pages** - 全球 CDN
4. **GitHub Pages** - 免费托管

### 环境变量

```bash
# .env
VITE_APP_TITLE=我的应用
VITE_API_BASE_URL=https://api.example.com
```

在代码中使用：

```typescript
const appTitle = import.meta.env.VITE_APP_TITLE;
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## 📈 性能优化

### 代码分割

使用 React.lazy 进行组件懒加载：

```tsx
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  );
}
```

### 图片优化

1. 使用适当的图片格式 (WebP, AVIF)
2. 实现图片懒加载
3. 使用响应式图片

### Bundle 分析

```bash
# 分析构建包大小
pnpm add -D rollup-plugin-visualizer
```

## 🔄 持续集成

### GitHub Actions

项目包含基本的 CI 配置，会自动：

1. 运行代码检查
2. 执行测试
3. 构建项目
4. 部署到生产环境

### 提交规范

建议使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式化
refactor: 代码重构
test: 添加测试
chore: 构建配置更新
```

## 🎯 下一步建议

### 立即可以添加的功能

1. **状态管理** - Zustand 或 Redux Toolkit
2. **路由** - React Router v6
3. **数据获取** - TanStack Query
4. **表单处理** - React Hook Form
5. **UI 组件库** - Radix UI 或 Headless UI

### 长期规划

1. **微前端架构** - Module Federation
2. **PWA 支持** - Workbox
3. **国际化** - react-i18next
4. **监控和分析** - Sentry, Google Analytics
5. **设计系统** - Storybook

## ❓ 常见问题

### Q: 为什么选择 Tailwind CSS？

A: Tailwind 提供了实用优先的 CSS 框架，配合类名合并工具，可以快速构建现代化的用户界面。

### Q: 如何添加新的 UI 组件？

A: 在 `src/components/ui/` 目录下创建新组件，然后在 `index.ts` 中导出。

### Q: 如何自定义 Tailwind 配置？

A: 编辑 `tailwind.config.ts` 文件，添加自定义主题、颜色或插件。

### Q: 测试覆盖率要求多少？

A: 建议保持 80% 以上的测试覆盖率，重点关注核心业务逻辑。

---

这个 Template 是你项目的起点，不是终点。根据你的具体需求进行定制和扩展！

Happy Coding! 🎉
