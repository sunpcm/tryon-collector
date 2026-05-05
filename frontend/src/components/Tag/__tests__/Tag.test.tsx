import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Tag } from '../Tag';

describe('Tag', () => {
  it('renders label text', () => {
    render(<Tag label="春季女装" />);
    expect(screen.getByText('春季女装')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Tag label="连衣裙" onClick={onClick} />);
    fireEvent.click(screen.getByText('连衣裙'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Tag label="配饰" onClick={onClick} disabled />);
    fireEvent.click(screen.getByText('配饰'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies selected styles when selected', () => {
    render(<Tag label="上衣" selected />);
    const el = screen.getByText('上衣');
    expect(el.className).toContain('bg-blue-500');
  });
});
