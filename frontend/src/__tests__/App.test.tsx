import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock react-dropzone to avoid issues in jsdom
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));

import App from '../App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Tryon Collector')).toBeInTheDocument();
  });

  it('shows nickname modal on first visit', () => {
    render(<App />);
    expect(screen.getByText('欢迎使用 Tryon Collector')).toBeInTheDocument();
  });

  it('shows manual sort boxes by default', () => {
    render(<App />);
    expect(screen.getByText(/产品图/)).toBeInTheDocument();
    expect(screen.getByText(/试穿图/)).toBeInTheDocument();
    expect(screen.getByText(/精修图/)).toBeInTheDocument();
    expect(screen.getByText(/标注图/)).toBeInTheDocument();
  });

  it('renders tag selectors', () => {
    render(<App />);
    expect(screen.getByText('品牌')).toBeInTheDocument();
    expect(screen.getByText('品类')).toBeInTheDocument();
  });
});
