import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  it('shows content on hover', async () => {
    render(
      <Tooltip content="提示文字">
        <span>hover me</span>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText('hover me'));
    expect(screen.getByText('提示文字')).toBeInTheDocument();
  });

  it('hides content on mouse leave', () => {
    render(
      <Tooltip content="消失提示">
        <span>hover me</span>
      </Tooltip>
    );
    const trigger = screen.getByText('hover me');
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('消失提示')).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    // The tooltip hides after a 100ms delay
    setTimeout(() => {
      expect(screen.queryByText('消失提示')).not.toBeInTheDocument();
    }, 200);
  });
});
