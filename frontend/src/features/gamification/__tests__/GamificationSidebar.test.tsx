import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  GamificationSidebar,
  getSubmitCount,
  incrementSubmitCount,
} from '../GamificationSidebar';

const STORAGE_KEY = 'tryon_submit_count';

describe('GamificationSidebar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders with zero count initially', () => {
    render(<GamificationSidebar />);
    expect(screen.getByText(/拦截 AI 翻车/)).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders with stored count', () => {
    localStorage.setItem(STORAGE_KEY, '42');
    render(<GamificationSidebar />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('updates when submit-count-changed event fires', () => {
    localStorage.setItem(STORAGE_KEY, '5');
    render(<GamificationSidebar />);
    expect(screen.getByText('5')).toBeTruthy();

    localStorage.setItem(STORAGE_KEY, '10');
    act(() => {
      window.dispatchEvent(new Event('submit-count-changed'));
    });
    expect(screen.getByText('10')).toBeTruthy();
  });
});

describe('submit count helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getSubmitCount returns 0 by default', () => {
    expect(getSubmitCount()).toBe(0);
  });

  it('incrementSubmitCount adds delta', () => {
    incrementSubmitCount(3);
    expect(getSubmitCount()).toBe(3);
    incrementSubmitCount(2);
    expect(getSubmitCount()).toBe(5);
  });
});
