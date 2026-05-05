import { useState } from 'react';
import { Button, Card } from '@/components';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';

function App() {
  const [count, setCount] = useState(0);

  const features = [
    '⚡ Vite + React 18 + TypeScript',
    '🎨 Tailwind CSS',
    '🧪 Vitest + Testing Library + AI PR Review',
    '📏 ESLint + Prettier',
    '🔧 Husky + lint-staged',
    '📦 pnpm 包管理器',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo Section */}
          <div className="flex justify-center items-center gap-8 mb-8">
            <a
              href="https://vite.dev"
              target="_blank"
              rel="noopener"
              className="transition-transform hover:scale-110"
            >
              <img src={viteLogo} className="h-16 w-16" alt="Vite logo" />
            </a>
            <a
              href="https://react.dev"
              target="_blank"
              rel="noopener"
              className="transition-transform hover:scale-110"
            >
              <img
                src={reactLogo}
                className="h-16 w-16 animate-spin-slow"
                alt="React logo"
              />
            </a>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            React TypeScript Template
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            一个现代化的 React TypeScript
            开发模板，预配置了最佳实践的工具链和开发体验
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="text-left">
                <p className="text-sm text-gray-700">{feature}</p>
              </Card>
            ))}
          </div>

          {/* Interactive Section */}
          <Card className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              开始开发
            </h2>
            <p className="text-gray-600 mb-6">
              点击按钮测试组件交互，然后开始构建你的应用！
            </p>
            <div className="space-y-4">
              <Button
                onClick={() => setCount(count => count + 1)}
                className="w-full"
                size="lg"
              >
                点击计数: {count}
              </Button>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm">
                  查看文档
                </Button>
                <Button variant="ghost" size="sm">
                  GitHub
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Start */}
          <div className="mt-12 text-left max-w-2xl mx-auto">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🚀 快速开始
              </h3>
              <div className="bg-gray-900 rounded-md p-4 text-green-400 text-sm font-mono">
                <div>pnpm install</div>
                <div>pnpm dev</div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                编辑{' '}
                <code className="bg-gray-100 px-1 rounded">src/App.tsx</code>{' '}
                开始开发你的应用
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
