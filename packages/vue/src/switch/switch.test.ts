import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { defineComponent, h, ref } from 'vue';
import { Switch } from './switch';

/**
 * Deliberately a mirror of packages/react/src/switch/switch.test.tsx.
 *
 * The thesis is that behaviour lives once in core and the frameworks are skins.
 * The way that claim stays true is that a behaviour present in one adapter and
 * missing from the other shows up here as a failing test, not as a shrug.
 */

const control = () => screen.getByRole('switch');
const root = () => document.querySelector('[data-part="root"]') as HTMLElement;
const hiddenInput = () =>
  document.querySelector('[data-part="hidden-input"]') as HTMLInputElement | null;

describe('Switch — rendering', () => {
  it('renders a switch with an accessible name from the label', () => {
    render(Switch, { props: { label: 'Notifications' } });
    expect(control()).toHaveAccessibleName('Notifications');
  });

  it('takes its accessible name from aria-label when no label is given', () => {
    render(Switch, { attrs: { 'aria-label': 'Notifications' } });
    expect(control()).toHaveAccessibleName('Notifications');
  });

  it('omits aria-labelledby when no label is rendered', () => {
    // A dangling idref leaves the control nameless — worse than no attribute.
    render(Switch, { attrs: { 'aria-label': 'Notifications' } });
    expect(control()).not.toHaveAttribute('aria-labelledby');
  });

  it('does not put the naming attribute on the root as well', () => {
    // inheritAttrs: false. Left on, Vue would apply aria-label to the root too.
    render(Switch, { attrs: { 'aria-label': 'Notifications' } });
    expect(root()).not.toHaveAttribute('aria-label');
  });

  it('uses a native button, so Space and Enter come free', () => {
    render(Switch, { props: { label: 'Notifications' } });
    expect(control().tagName).toBe('BUTTON');
    expect(control()).toHaveAttribute('type', 'button');
  });

  it('marks the root and only the root with data-kanso', () => {
    render(Switch, { props: { label: 'Notifications' } });
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(root()).toHaveAttribute('data-kanso');
  });

  it('passes class and arbitrary attributes through to the root', () => {
    render(Switch, {
      props: { label: 'Notifications' },
      attrs: { class: 'mine', 'data-testid': 'sw' },
    });
    expect(root()).toHaveClass('mine');
    expect(root()).toHaveAttribute('data-testid', 'sw');
  });

  it('puts a consumer id on the root verbatim and derives the rest', () => {
    render(Switch, { props: { label: 'Notifications', id: 'notify' } });
    expect(root()).toHaveAttribute('id', 'notify');
    expect(control()).toHaveAttribute('id', 'notify-control');
  });

  it('renders the default slot as the label', () => {
    render(Switch, { slots: { default: () => 'Notifications' } });
    expect(control()).toHaveAccessibleName('Notifications');
  });
});

describe('Switch — uncontrolled', () => {
  it('starts unchecked by default', () => {
    render(Switch, { props: { label: 'Notifications' } });
    expect(control()).toHaveAttribute('aria-checked', 'false');
    expect(root()).toHaveAttribute('data-state', 'unchecked');
  });

  it('honours defaultChecked', () => {
    render(Switch, { props: { label: 'Notifications', defaultChecked: true } });
    expect(control()).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles on click and reports the change', async () => {
    const { emitted } = render(Switch, { props: { label: 'Notifications' } });

    await userEvent.click(control());

    expect(control()).toHaveAttribute('aria-checked', 'true');
    expect(root()).toHaveAttribute('data-state', 'checked');
    expect(emitted().checkedChange).toEqual([[true]]);
  });

  it('toggles back off', async () => {
    render(Switch, { props: { label: 'Notifications', defaultChecked: true } });
    await userEvent.click(control());
    expect(control()).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles when the label is clicked', async () => {
    render(Switch, { props: { label: 'Notifications' } });
    await userEvent.click(screen.getByText('Notifications'));
    expect(control()).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Switch — keyboard', () => {
  // axe cannot see a broken key handler. These are the tests that would catch
  // someone "helpfully" adding a keydown handler and double-toggling.
  it('is reachable by Tab', async () => {
    render(Switch, { props: { label: 'Notifications' } });
    await userEvent.tab();
    expect(control()).toHaveFocus();
  });

  it('toggles once on Space', async () => {
    const { emitted } = render(Switch, { props: { label: 'Notifications' } });

    await userEvent.tab();
    await userEvent.keyboard('[Space]');

    expect(control()).toHaveAttribute('aria-checked', 'true');
    expect(emitted().checkedChange).toEqual([[true]]);
  });

  it('toggles once on Enter', async () => {
    const { emitted } = render(Switch, { props: { label: 'Notifications' } });

    await userEvent.tab();
    await userEvent.keyboard('[Enter]');

    expect(control()).toHaveAttribute('aria-checked', 'true');
    expect(emitted().checkedChange).toEqual([[true]]);
  });
});

describe('Switch — controlled', () => {
  it('does not move on its own', async () => {
    const { emitted } = render(Switch, { props: { label: 'Notifications', checked: false } });

    await userEvent.click(control());

    // The consumer owns the value; the click only reports intent.
    expect(control()).toHaveAttribute('aria-checked', 'false');
    expect(emitted().checkedChange).toEqual([[true]]);
  });

  it('reflects a prop change made without any interaction', async () => {
    const { rerender } = render(Switch, { props: { label: 'Notifications', checked: false } });
    await rerender({ label: 'Notifications', checked: true });
    expect(control()).toHaveAttribute('aria-checked', 'true');
  });

  it('follows v-model', async () => {
    const Host = defineComponent({
      setup() {
        const checked = ref(false);
        return () =>
          h(Switch, {
            label: 'Notifications',
            modelValue: checked.value,
            'onUpdate:modelValue': (next: boolean) => {
              checked.value = next;
            },
          });
      },
    });
    render(Host);

    await userEvent.click(control());
    expect(control()).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(control());
    expect(control()).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Switch — disabled', () => {
  it('uses the native disabled attribute', () => {
    render(Switch, { props: { label: 'Notifications', disabled: true } });
    expect(control()).toBeDisabled();
    expect(root()).toHaveAttribute('data-disabled', '');
  });

  it('does not toggle or report', async () => {
    const { emitted } = render(Switch, { props: { label: 'Notifications', disabled: true } });

    await userEvent.click(control());

    expect(control()).toHaveAttribute('aria-checked', 'false');
    expect(emitted().checkedChange).toBeUndefined();
  });

  it('omits data-disabled when enabled', () => {
    render(Switch, { props: { label: 'Notifications' } });
    expect(root()).not.toHaveAttribute('data-disabled');
  });
});

describe('Switch — readOnly', () => {
  it('stays focusable but does not toggle', async () => {
    const { emitted } = render(Switch, { props: { label: 'Notifications', readOnly: true } });

    await userEvent.tab();
    expect(control()).toHaveFocus();

    await userEvent.keyboard('[Space]');
    expect(control()).toHaveAttribute('aria-checked', 'false');
    expect(emitted().checkedChange).toBeUndefined();
  });

  it('announces itself as read-only', () => {
    render(Switch, { props: { label: 'Notifications', readOnly: true } });
    expect(control()).toHaveAttribute('aria-readonly', 'true');
    expect(control()).not.toBeDisabled();
  });
});

describe('Switch — form participation', () => {
  const inForm = (props: Record<string, unknown>) =>
    render(
      defineComponent({
        setup: () => () => h('form', [h(Switch, props), h('button', { type: 'submit' }, 'Save')]),
      }),
    );

  it('renders no hidden input without a name', () => {
    render(Switch, { props: { label: 'Notifications' } });
    expect(hiddenInput()).toBeNull();
  });

  it('submits its value inside a plain form', () => {
    inForm({ label: 'Notifications', name: 'notify', defaultChecked: true });
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('notify')).toBe('on');
  });

  it('drops out of the form data when unchecked', () => {
    inForm({ label: 'Notifications', name: 'notify' });
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('notify')).toBeNull();
  });

  it('honours a custom value', () => {
    inForm({ label: 'Notifications', name: 'notify', value: 'email', defaultChecked: true });
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('notify')).toBe('email');
  });

  it('tracks state, so a toggle changes what would be submitted', async () => {
    inForm({ label: 'Notifications', name: 'notify' });
    const form = document.querySelector('form') as HTMLFormElement;

    await userEvent.click(control());

    expect(new FormData(form).get('notify')).toBe('on');
  });

  it('does not submit the form when toggled', async () => {
    // type="button" on the control. Without it, a button inside a form defaults
    // to type="submit" and every toggle would submit.
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      defineComponent({
        setup: () => () => h('form', { onSubmit }, [h(Switch, { label: 'Notifications' })]),
      }),
    );

    await userEvent.click(control());

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the hidden input out of the tab order and the a11y tree', () => {
    render(Switch, { props: { label: 'Notifications', name: 'notify' } });
    const input = hiddenInput();
    // Two focusable, two announced nodes would make one switch look like two.
    expect(input).toHaveAttribute('tabindex', '-1');
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('is never display:none, so required still blocks submission', () => {
    // A display:none control is skipped by constraint validation, which would
    // silently disable `required`. The stylesheet clips it instead.
    render(Switch, { props: { label: 'Notifications', name: 'notify', required: true } });
    const input = hiddenInput() as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input).not.toHaveAttribute('hidden');
    expect(input.style.display).not.toBe('none');
    // `readonly` on a checkbox bars it from constraint validation too, which
    // would disable `required` just as effectively.
    expect(input.readOnly).toBe(false);
  });
});

describe('Switch — axe', () => {
  // A floor, not a ceiling: axe cannot see keyboard behaviour. See docs/04.
  it('has no violations, labelled', async () => {
    const { container } = render(Switch, { props: { label: 'Notifications' } });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations, aria-labelled with a form and every state on', async () => {
    const { container } = render(
      defineComponent({
        setup: () => () =>
          h('form', [
            h(Switch, {
              name: 'notify',
              required: true,
              defaultChecked: true,
              'aria-label': 'Notifications',
            }),
            h(Switch, { label: 'Sound', disabled: true }),
            h(Switch, { label: 'Vibrate', readOnly: true }),
          ]),
      }),
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
