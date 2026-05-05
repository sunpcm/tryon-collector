# 测试文件组织指南

## 📁 推荐的测试目录结构

```
src/
├── __tests__/
│   ├── App.test.tsx                    # 主应用组件测试
│   ├── components/
│   │   ├── Button.test.tsx             # Button 组件测试
│   │   ├── Modal.test.tsx              # 其他组件测试
│   │   └── index.test.tsx              # 组件导出测试
│   ├── utils/
│   │   └── index.test.tsx              # 工具函数测试
│   ├── config/
│   │   └── index.test.tsx              # 配置测试
│   └── hooks/                          # 自定义 Hook 测试
│       └── useLocalStorage.test.tsx
├── components/
│   ├── Button.tsx
│   └── index.ts
├── utils/
├── config/
└── hooks/
```

## 🎯 测试文件命名规范

- **组件测试**: `ComponentName.test.tsx`
- **Hook 测试**: `useHookName.test.tsx`
- **工具函数测试**: `functionName.test.ts`
- **页面测试**: `PageName.test.tsx`

## 📝 测试模板

### 组件测试模板

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComponentName from '../../components/ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    // 测试渲染
  });

  it('handles user interactions', () => {
    const handleClick = jest.fn();
    render(<ComponentName onClick={handleClick} />);
    // 测试交互
  });

  it('applies props correctly', () => {
    render(<ComponentName prop="value" />);
    // 测试 props
  });
});
```

### Hook 测试模板

```typescript
import { renderHook, act } from '@testing-library/react';
import useCustomHook from '../../hooks/useCustomHook';

describe('useCustomHook', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.value).toBe(expectedValue);
  });

  it('updates value correctly', () => {
    const { result } = renderHook(() => useCustomHook());

    act(() => {
      result.current.setValue(newValue);
    });

    expect(result.current.value).toBe(newValue);
  });
});
```

## 🚀 运行测试命令

```bash
# 运行所有测试
pnpm test

# 运行特定文件测试
pnpm test src/__tests__/components/Button.test.tsx

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 运行特定组件的所有测试
pnpm test -- --testPathPattern=components
```

## 📊 测试覆盖率目标

- **组件**: 90%+ 覆盖率
- **工具函数**: 95%+ 覆盖率
- **关键业务逻辑**: 100% 覆盖率

## 💡 最佳实践

1. **AAA 模式**: Arrange (准备) → Act (执行) → Assert (断言)
2. **描述性测试名**: 清楚描述测试的行为和期望
3. **单一职责**: 每个测试只验证一个功能点
4. **独立性**: 测试之间不应该相互依赖
5. **边界测试**: 测试边界情况和错误场景
