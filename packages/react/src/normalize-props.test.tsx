import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { normalizeProps } from './normalize-props';

describe('normalizeProps (react)', () => {
  it('renames class to className', () => {
    expect(normalizeProps.element({ class: 'track' })).toEqual({ className: 'track' });
  });

  it('renames for to htmlFor', () => {
    expect(normalizeProps.label({ for: 'control-id' })).toEqual({ htmlFor: 'control-id' });
  });

  it('leaves event handler names alone — core already emits React casing', () => {
    const handler = () => {};
    expect(normalizeProps.button({ onKeyDown: handler })).toEqual({ onKeyDown: handler });
    expect(normalizeProps.button({ onPointerDown: handler })).toEqual({ onPointerDown: handler });
    expect(normalizeProps.button({ onClick: handler })).toEqual({ onClick: handler });
  });

  it('drops undefined values so absent attributes stay absent', () => {
    expect(normalizeProps.element({ 'data-disabled': undefined, 'data-part': 'root' })).toEqual({
      'data-part': 'root',
    });
  });

  it('passes data- and aria- attributes through untouched', () => {
    const props = normalizeProps.button({
      'data-part': 'control',
      'data-state': 'checked',
      'aria-checked': true,
      role: 'switch',
    });
    expect(props).toEqual({
      'data-part': 'control',
      'data-state': 'checked',
      'aria-checked': true,
      role: 'switch',
    });
  });

  // The failure mode this guards against is silent: React ignores an unknown
  // prop name rather than warning, so the attribute simply never lands.
  it('produces props React actually applies to the DOM', async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    const props = normalizeProps.button({
      class: 'control',
      'data-part': 'control',
      'aria-checked': true,
      'data-disabled': undefined,
      onKeyDown,
    });

    render(
      <button type="button" {...props}>
        Wi-Fi
      </button>,
    );

    const control = screen.getByRole('button', { name: 'Wi-Fi' });
    expect(control).toHaveClass('control');
    expect(control).toHaveAttribute('data-part', 'control');
    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(control).not.toHaveAttribute('data-disabled');

    control.focus();
    await user.keyboard('{ArrowDown}');
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});
