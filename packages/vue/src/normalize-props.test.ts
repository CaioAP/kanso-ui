import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { normalizeProps } from './normalize-props';

describe('normalizeProps (vue)', () => {
  it('keeps class as class', () => {
    expect(normalizeProps.element({ class: 'track' })).toEqual({ class: 'track' });
  });

  it('keeps for as for', () => {
    expect(normalizeProps.label({ for: 'control-id' })).toEqual({ for: 'control-id' });
  });

  it('lowercases the tail of event names so Vue binds the real DOM event', () => {
    // Vue hyphenates the part after `on`, so onKeyDown would bind `key-down`.
    const handler = () => {};
    expect(normalizeProps.button({ onKeyDown: handler })).toEqual({ onKeydown: handler });
    expect(normalizeProps.button({ onPointerDown: handler })).toEqual({ onPointerdown: handler });
  });

  it('keeps the first letter after `on` capitalised', () => {
    // Vue only treats a prop as an event when it matches /^on[^a-z]/. Lowercase
    // it entirely and Vue assigns el.onclick as a DOM property instead — which
    // works on a fresh mount and vanishes on hydration. See docs/01 §4.
    const handler = () => {};
    expect(normalizeProps.button({ onClick: handler })).toEqual({ onClick: handler });
    expect(Object.keys(normalizeProps.button({ onKeyDown: handler }))[0]).toMatch(/^on[^a-z]/);
  });

  it('leaves onUpdate:modelValue alone so v-model keeps working', () => {
    const handler = () => {};
    expect(normalizeProps.input({ 'onUpdate:modelValue': handler })).toEqual({
      'onUpdate:modelValue': handler,
    });
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

  // Same silent failure mode as React, by a different route: Vue would bind a
  // listener for a `key-down` event that no browser ever fires.
  it('produces props Vue actually applies to the DOM', async () => {
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
      defineComponent({
        setup: () => () => h('button', { type: 'button', ...props }, 'Wi-Fi'),
      }),
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
