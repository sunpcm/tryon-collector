import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct width', () => {
    const { container } = render(<ProgressBar value={60} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar).toHaveStyle({ width: '60%' });
  });

  it('clamps value to 0-100', () => {
    const { container } = render(<ProgressBar value={150} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('shows label when showLabel is true', () => {
    render(<ProgressBar value={42} showLabel />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });
});
