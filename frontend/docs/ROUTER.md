# 路由配置指南

本指南将帮你在项目中集成 React Router v6。

## 安装依赖

```bash
pnpm add react-router-dom
pnpm add -D @types/react-router-dom
```

## 1. 创建路由结构

```
src/
├── router/
│   ├── index.tsx        # 路由主配置
│   ├── routes.tsx       # 路由定义
│   └── types.ts         # 路由类型
├── pages/              # 页面组件
│   ├── Home/
│   │   └── index.tsx
│   ├── About/
│   │   └── index.tsx
│   └── NotFound/
│       └── index.tsx
└── components/
    └── layout/
        ├── Layout.tsx   # 主布局
        ├── Header.tsx
        └── Footer.tsx
```

## 2. 路由配置文件

### `src/router/routes.tsx`

```tsx
import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// 懒加载页面组件
const Home = lazy(() => import('@/pages/Home'));
const About = lazy(() => import('@/pages/About'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/about',
    element: <About />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];
```

### `src/router/index.tsx`

```tsx
import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Loading from '@/components/ui/Loading';
import { routes } from './routes';

// 为路由添加布局
const routesWithLayout = routes.map(route => ({
  ...route,
  element: (
    <Layout>
      <Suspense fallback={<Loading />}>{route.element}</Suspense>
    </Layout>
  ),
}));

const router = createBrowserRouter(routesWithLayout);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default router;
```

## 3. 布局组件

### `src/components/layout/Layout.tsx`

```tsx
import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

### `src/components/layout/Header.tsx`

```tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            My App
          </Link>
          <nav className="flex space-x-4">
            <Link to="/">
              <Button variant="ghost">首页</Button>
            </Link>
            <Link to="/about">
              <Button variant="ghost">关于</Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
```

## 4. 页面组件示例

### `src/pages/Home/index.tsx`

```tsx
import { Button, Card } from '@/components';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">欢迎来到首页</h1>
        <p className="text-gray-600 mb-6">这是使用 React Router 创建的首页。</p>
        <Button>开始探索</Button>
      </Card>
    </div>
  );
}
```

## 5. 更新 App.tsx

```tsx
import { AppRouter } from './routes';

function App() {
  return <AppRouter />;
}

export default App;
```

## 6. 高级功能

### 路由守卫

```tsx
// src/router/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  isAuthenticated: boolean;
}

export default function ProtectedRoute({
  children,
  isAuthenticated,
}: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### 嵌套路由

```tsx
// 在 routes.tsx 中
{
  path: '/dashboard',
  element: <DashboardLayout />,
  children: [
    {
      path: '',
      element: <DashboardHome />,
    },
    {
      path: 'settings',
      element: <Settings />,
    },
  ],
}
```

### 路由参数

```tsx
// 路由定义
{
  path: '/user/:id',
  element: <UserProfile />,
}

// 在组件中使用
import { useParams } from 'react-router-dom';

function UserProfile() {
  const { id } = useParams<{ id: string }>();
  return <div>用户 ID: {id}</div>;
}
```

## 常用 Hooks

```tsx
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // 编程式导航
  const handleNavigate = () => {
    navigate('/about');
  };

  return (
    <div>
      <p>当前路径: {location.pathname}</p>
      <button onClick={handleNavigate}>跳转到关于页面</button>
    </div>
  );
}
```

这样你就成功集成了 React Router！
