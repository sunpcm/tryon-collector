import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showToast, ToastContainer } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    return () => vi.useRealTimers();
  });

  it('shows a success toast message', () => {
    render(<ToastContainer />);
    act(() => {
      showToast('提交成功', 'success');
    });
    expect(screen.getByText('提交成功')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', async () => {
    render(<ToastContainer />);
    act(() => {
      showToast('will disappear', 'success', 1000);
    });
    expect(screen.getByText('will disappear')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText('will disappear')).not.toBeInTheDocument();
  });
});
