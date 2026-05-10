import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock animal-island-ui to avoid PNG import issues in jsdom
vi.mock('animal-island-ui', () => ({
  Modal: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
  }) =>
    open ? (
      <div data-testid="modal">
        {title && <div>{title}</div>}
        {children}
      </div>
    ) : null,
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

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
    expect(screen.getByText('业务线')).toBeInTheDocument();
    expect(screen.getByText('品类')).toBeInTheDocument();
  });
});
