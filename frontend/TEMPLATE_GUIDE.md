# 🎯 Template Usage Guide

This guide will help you get the most out of this React TypeScript template.

## 🚀 Getting Started Checklist

After cloning/using this template, follow this checklist:

### 1. Initial Setup

- [ ] Update `package.json` name and description
- [ ] Update `README.md` with your project details
- [ ] Copy `.env.example` to `.env` and configure
- [ ] Update `LICENSE` file with your information
- [ ] Initialize your git repository

### 2. Customize for Your Project

- [ ] Update app title in `index.html`
- [ ] Replace favicon and logos in `public/`
- [ ] Configure environment variables in `.env`
- [ ] Remove example components if not needed
- [ ] Add your project-specific folders

## 📝 Code Style Guide

This template enforces consistent code style through:

### Prettier Configuration

```json
{
  "semi": false,           // No semicolons
  "singleQuote": true,     // Single quotes for strings
  "tabWidth": 2,           // 2 spaces for indentation
  "trailingComma": "es5",  // Trailing commas where valid
  "printWidth": 80,        // Line width
  "endOfLine": "lf",       // Unix line endings
  "arrowParens": "avoid"   // Avoid parens around single arrow function parameters
}
```

### ESLint Rules

- TypeScript strict mode enabled
- React Hooks rules enforced
- React Refresh compatibility
- Import/export best practices

## 🧩 Adding Dependencies

### Regular Dependencies

```bash
# UI Libraries
pnpm add @chakra-ui/react @emotion/react @emotion/styled framer-motion

# State Management
pnpm add zustand
# or
pnpm add @reduxjs/toolkit react-redux

# Routing
pnpm add react-router-dom
pnpm add -D @types/react-router-dom

# Data Fetching
pnpm add @tanstack/react-query
# or
pnpm add swr

# Forms
pnpm add react-hook-form @hookform/resolvers zod
```

### Development Dependencies

```bash
# Storybook
pnpm add -D @storybook/react @storybook/addon-essentials

# Testing utilities
pnpm add -D @testing-library/user-event msw

# Build tools
pnpm add -D rollup-plugin-visualizer

# Linting
pnpm add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

## 🏗️ Project Architecture

### Recommended Folder Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   └── pages/           # Page-specific components
├── hooks/               # Custom React hooks
├── services/            # API calls and external services
├── stores/              # State management (Zustand/Redux)
├── types/               # TypeScript type definitions
├── utils/               # Helper functions
├── constants/           # App constants
└── styles/              # Global styles and themes
```

### Component Patterns

#### Basic Component

```typescript
import type { FC } from 'react'

interface ComponentProps {
  title: string
  onClick?: () => void
}

const Component: FC<ComponentProps> = ({ title, onClick }) => {
  return (
    <button onClick={onClick} type="button">
      {title}
    </button>
  )
}

export default Component
```

#### Component with Children

```typescript
import type { FC, ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
}

const Container: FC<ContainerProps> = ({ children, className = '' }) => {
  return <div className={`container ${className}`}>{children}</div>
}

export default Container
```

#### Custom Hook

```typescript
import { useState, useEffect } from 'react'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export const useApi = <T>(url: string): UseApiResult<T> => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(url)
      .then(response => response.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading, error }
}
```

## 🧪 Testing Strategies

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Button from '../Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useApi } from '../useApi'

// Mock fetch
global.fetch = jest.fn()

describe('useApi Hook', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear()
  })

  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockData,
    })

    const { result } = renderHook(() => useApi('/api/test'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })
})
```

## 🚀 Deployment

### Environment-Specific Builds

```bash
# Development
pnpm dev

# Staging
NODE_ENV=staging pnpm build

# Production
NODE_ENV=production pnpm build
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Vercel Deployment

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ]
}
```

## 📊 Performance Optimization

### Code Splitting

```typescript
import { lazy, Suspense } from 'react'

const LazyComponent = lazy(() => import('./LazyComponent'))

const App = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyComponent />
  </Suspense>
)
```

### Bundle Analysis

```bash
# Add to package.json scripts
"analyze": "vite build && npx vite-bundle-analyzer dist"

# Run analysis
pnpm analyze
```

## 🔒 Security Best Practices

- Always validate environment variables
- Use TypeScript for type safety
- Sanitize user inputs
- Keep dependencies updated
- Use HTTPS in production
- Implement proper error boundaries

## 📚 Learning Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Testing Library Docs](https://testing-library.com/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## 🆘 Troubleshooting

### Common Issues

1. **Build fails with TypeScript errors**
   - Run `pnpm type-check` to see detailed errors
   - Check `tsconfig.json` configuration

2. **Tests fail to run**
   - Verify Jest configuration in `jest.config.js`
   - Check if all test dependencies are installed

3. **Linting errors**
   - Run `pnpm lint:fix` to auto-fix issues
   - Check ESLint configuration

4. **Import path errors**
   - Verify path aliases in `vite.config.ts` and `tsconfig.json`
   - Ensure paths are consistent

### Getting Help

- Check the [Issues](https://github.com/sunpcm/code-js/issues) section
- Create a new issue with detailed description
- Review documentation and examples
