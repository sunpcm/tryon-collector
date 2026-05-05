import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('React TypeScript Template')).toBeInTheDocument();
  });

  it('increments count when button is clicked', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /点击计数: 0/i });

    fireEvent.click(button);

    expect(screen.getByText(/点击计数: 1/)).toBeInTheDocument();
  });

  it('displays logo images', () => {
    render(<App />);

    const viteLogo = screen.getByAltText('Vite logo');
    const reactLogo = screen.getByAltText('React logo');

    expect(viteLogo).toBeInTheDocument();
    expect(reactLogo).toBeInTheDocument();
  });

  it('displays features correctly', () => {
    render(<App />);

    expect(
      screen.getByText('⚡ Vite + React 18 + TypeScript')
    ).toBeInTheDocument();
    expect(screen.getByText('🎨 Tailwind CSS')).toBeInTheDocument();
    expect(
      screen.getByText('🧪 Vitest + Testing Library + AI PR Review')
    ).toBeInTheDocument();
  });

  it('displays call-to-action buttons', () => {
    render(<App />);

    expect(
      screen.getByRole('button', { name: '查看文档' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument();
  });
});
