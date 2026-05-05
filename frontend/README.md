# 🚀 Modern React TypeScript Template

> A production-ready React + TypeScript template with Vite, pnpm, Jest, and modern development best practices pre-configured.

[![CI](https://github.com/sunpcm/code-js/workflows/CI/badge.svg)](https://github.com/sunpcm/code-js/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- ⚡️ **[Vite](https://vitejs.dev/)** - Lightning fast build tool and HMR
- ⚛️ **[React 19](https://react.dev/)** - Latest React with new features
- 🔷 **[TypeScript](https://www.typescriptlang.org/)** - Type safety and enhanced developer experience
- 📦 **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- 🧪 **[Jest](https://jestjs.io/)** + **[Testing Library](https://testing-library.com/)** - Comprehensive testing setup
- 🔍 **[ESLint](https://eslint.org/)** - Code linting with React and TypeScript rules
- 💅 **[Prettier](https://prettier.io/)** - Opinionated code formatting
- 🐶 **[Husky](https://typicode.github.io/husky/)** - Git hooks for code quality
- 🚀 **SVG Support** - Import SVGs as React components with `vite-plugin-svgr`
- 🎯 **Path Aliases** - Clean imports with `@/` for `src/` directory
- 🛠️ **VS Code Ready** - Pre-configured settings and recommended extensions
- 🔄 **CI/CD** - GitHub Actions workflow included

## 📁 Project Structure

```
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI pipeline
├── .husky/                 # Git hooks
├── .vscode/                # VS Code configuration
│   ├── extensions.json     # Recommended extensions
│   └── settings.json       # Workspace settings
├── public/                 # Static assets
├── src/
│   ├── __mocks__/          # Jest mocks
│   ├── __tests__/          # Test files
│   │   └── App.test.tsx    # Example component test
│   ├── assets/             # Images, icons, etc.
│   ├── components/         # React components
│   │   ├── Button.tsx      # Example Button component
│   │   └── index.ts        # Component exports
│   ├── config/             # App configuration
│   │   └── index.ts        # Environment variables and constants
│   ├── utils/              # Utility functions
│   │   └── index.ts        # Helper functions
│   ├── App.tsx             # Main App component
│   ├── main.tsx            # Entry point
│   └── vite-env.d.ts       # Vite and custom type definitions
├── .env.example            # Environment variables template
├── .eslintrc.cjs           # ESLint configuration
├── .gitignore              # Git ignore rules
├── .lintstagedrc.json      # Lint-staged configuration
├── .prettierrc.json        # Prettier configuration
├── babel.config.cjs        # Babel configuration for Jest
├── jest.config.cjs         # Jest testing configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

## � Quick Start

### Prerequisites

Make sure you have the following installed:

- **Node.js** >= 18.x
- **pnpm** >= 8.x (recommended) or npm/yarn

### Create a New Project

```bash
# Clone this template
git clone https://github.com/sunpcm/code-js.git my-new-project
cd my-new-project

# Remove git history and initialize new repo
rm -rf .git
git init
git add .
git commit -m "Initial commit"

# Setup environment variables
cp .env.example .env

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Using as GitHub Template

1. Click the **"Use this template"** button on GitHub
2. Create your new repository
3. Clone your new repository
4. Follow the installation steps above

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with HMR |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint errors automatically |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm clean` | Clean build and coverage directories |

## 🧪 Testing

This template includes a comprehensive testing setup:

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (recommended for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### Writing Tests

Example test structure:

```typescript
// src/__tests__/Component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Component from '../Component'

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure your variables:

```bash
# App Configuration
VITE_APP_TITLE=My Awesome App
VITE_API_BASE_URL=https://api.example.com

# Add more variables as needed
```

Access in your code:

```typescript
// src/config/index.ts
export const APP_TITLE = import.meta.env.VITE_APP_TITLE
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
```

### Path Aliases

Use `@/` to import from the `src/` directory:

```typescript
// Instead of relative paths
import Button from '../../../components/Button'

// Use clean aliases
import Button from '@/components/Button'
```

### Code Quality

The template includes pre-configured code quality tools:

- **ESLint**: Linting with React and TypeScript rules
- **Prettier**: Code formatting with consistent style
- **Lint-staged**: Run linters on staged files
- **Husky**: Git hooks for automated quality checks

Pre-commit hooks automatically run:

1. ESLint with auto-fix
2. Prettier formatting
3. Type checking
4. Tests

## 🏗️ Building for Production

```bash
# Build the application
pnpm build

# Preview the production build
pnpm preview
```

The build will be generated in the `dist/` directory, optimized and ready for deployment.

## 🎨 Customization Guide

### Adding New Components

1. Create your component in `src/components/`:

```typescript
// src/components/MyComponent.tsx
import type { FC } from 'react'

interface MyComponentProps {
  title: string
}

const MyComponent: FC<MyComponentProps> = ({ title }) => {
  return <h1>{title}</h1>
}

export default MyComponent
```

2. Export it in `src/components/index.ts`:

```typescript
export { default as MyComponent } from './MyComponent'
```

### Adding Utilities

Add helper functions in `src/utils/`:

```typescript
// src/utils/api.ts
export const fetchData = async (url: string) => {
  const response = await fetch(url)
  return response.json()
}
```

### Styling Options

This template is styling-agnostic. You can add:

- **Tailwind CSS**: `pnpm add -D tailwindcss postcss autoprefixer`
- **Styled Components**: `pnpm add styled-components`
- **Emotion**: `pnpm add @emotion/react @emotion/styled`
- **CSS Modules**: Already supported by Vite

## 🚀 Deployment

### Static Hosting (Recommended)

Deploy the `dist/` folder to any static hosting service:

- **Vercel**: Connect your GitHub repo
- **Netlify**: Drag and drop or connect repo
- **GitHub Pages**: Use GitHub Actions
- **AWS S3 + CloudFront**: Upload dist folder

### Docker

Create a `Dockerfile`:

```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📚 Recommended Next Steps

Once you've set up your project, consider adding:

1. **State Management**:
   - [Zustand](https://github.com/pmndrs/zustand) - Simple state management
   - [Redux Toolkit](https://redux-toolkit.js.org/) - Predictable state container

2. **Routing**:
   - [React Router](https://reactrouter.com/) - Declarative routing

3. **Data Fetching**:
   - [TanStack Query](https://tanstack.com/query) - Powerful data synchronization
   - [SWR](https://swr.vercel.app/) - Data fetching with caching

4. **UI Libraries**:
   - [Chakra UI](https://chakra-ui.com/) - Simple and modular
   - [Mantine](https://mantine.dev/) - Full-featured components
   - [Ant Design](https://ant.design/) - Enterprise-class UI

5. **Forms**:
   - [React Hook Form](https://react-hook-form.com/) - Performant forms
   - [Formik](https://formik.org/) - Build forms without tears

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vite](https://vitejs.dev/) for the amazing build tool
- [React Team](https://react.dev/) for React
- [TypeScript Team](https://www.typescriptlang.org/) for TypeScript
- All the maintainers of the included packages

---

**Happy coding! 🎉**

> If you find this template helpful, please consider giving it a ⭐️ on GitHub!
