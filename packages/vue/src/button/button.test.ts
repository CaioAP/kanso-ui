import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { defineComponent, h } from 'vue';
import { Button } from './button';

/**
 * Deliberately a mirror of packages/react/src/button/button.test.tsx.
 *
 * The thesis is that behaviour lives once in core and the frameworks are skins.
 * The way that claim stays true is that a behaviour present in one adapter and
 * missing from the other shows up here as a failing test, not as a shrug.
 */

const button = () => screen.getByRole('button');

const save = (props: Record<string, unknown> = {}) =>
  render(Button, { props, slots: { default: () => 'Save' } as never });

describe('Button — rendering', () => {
  it('renders a native button with an accessible name', () => {
    save();
    expect(button().tagName).toBe('BUTTON');
    expect(button()).toHaveAccessibleName('Save');
  });

  it('defaults to type="button", so it never submits by accident', () => {
    save();
    expect(button()).toHaveAttribute('type', 'button');
  });

  it('takes an explicit type', () => {
    save({ type: 'submit' });
    expect(button()).toHaveAttribute('type', 'submit');
  });

  it('publishes variant and size for the stylesheet', () => {
    save({ variant: 'ghost', size: 'lg' });
    expect(button()).toHaveAttribute('data-variant', 'ghost');
    expect(button()).toHaveAttribute('data-size', 'lg');
  });

  it('marks the root and only the root with data-kanso', () => {
    save();
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(button()).toHaveAttribute('data-kanso');
  });

  it('wraps the children in a label part, so the spinner can fade them', () => {
    save();
    expect(document.querySelector('[data-part="label"]')).toHaveTextContent('Save');
  });

  it('passes class and arbitrary attributes through', () => {
    save({ class: 'mine', 'data-testid': 'b' });
    expect(button()).toHaveClass('mine');
    expect(button()).toHaveAttribute('data-testid', 'b');
  });
});

describe('Button — clicking', () => {
  it('calls the consumer’s handler', async () => {
    // The defect this catches is silent: core's props are applied last, so a
    // core onClick that did not compose would delete this handler, and the
    // button would render and scan perfectly while doing nothing.
    const user = userEvent.setup();
    const onClick = vi.fn();
    save({ onClick });

    await user.click(button());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('submits a form when type="submit"', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());

    render(
      defineComponent({
        setup: () => () =>
          h('form', { onSubmit }, [h(Button, { type: 'submit' }, { default: () => 'Save' })]),
      }),
    );

    await user.click(button());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    save({ disabled: true, onClick });

    await user.click(button());
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Button — loading', () => {
  it('announces aria-busy and stays focusable', async () => {
    // Not `disabled`: a disabled element leaves the tab order and its state
    // change is not announced. docs/03 §6 decision 3.
    const user = userEvent.setup();
    save({ loading: true });

    expect(button()).toHaveAttribute('aria-busy', 'true');
    expect(button()).toBeEnabled();

    await user.tab();
    expect(button()).toHaveFocus();
  });

  it('does not announce itself as disabled', () => {
    save({ loading: true });
    expect(button()).not.toHaveAttribute('aria-disabled');
  });

  it('blocks activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    save({ loading: true, onClick });

    await user.click(button());
    expect(onClick).not.toHaveBeenCalled();
  });

  it('blocks form submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());

    render(
      defineComponent({
        setup: () => () =>
          h('form', { onSubmit }, [
            h(Button, { type: 'submit', loading: true }, { default: () => 'Save' }),
          ]),
      }),
    );

    await user.click(button());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps its accessible name while loading', () => {
    // The whole reason the label is a separate element faded with opacity.
    save({ loading: true });
    expect(button()).toHaveAccessibleName('Save');
    expect(button()).toHaveAttribute('data-loading', '');
  });
});

describe('Button — accessibility', () => {
  it('has no axe violations, idle', async () => {
    const { container } = save();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations, loading', async () => {
    const { container } = save({ loading: true });
    expect(await axe(container)).toHaveNoViolations();
  });
});
