import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { defineComponent, h, ref } from 'vue';
import { Field, Input, Textarea } from './field';

/**
 * Deliberately a mirror of packages/react/src/field/field.test.tsx.
 *
 * The thesis is that behaviour lives once in core and the frameworks are skins.
 * The way that claim stays true is that a behaviour present in one adapter and
 * missing from the other shows up here as a failing test, not as a shrug.
 *
 * Where React takes `label` / `description` / `errorText` as node props, Vue
 * takes the slots `#label` / `#description` / `#error-text` — the same
 * information, known at the same moment, spelled the way each framework spells
 * content.
 */

const root = () => document.querySelector('[data-part="root"]') as HTMLElement;
const control = () => document.querySelector('[data-part="control"]') as HTMLElement;
const errorText = () => document.querySelector('[data-part="error-text"]');

/** The dev-only missing-control check is scheduled a task out. */
const flushTasks = () => new Promise((resolve) => setTimeout(resolve, 0));

type Slots = Record<string, () => unknown>;

const field = (props: Record<string, unknown> = {}, slots: Slots = {}) =>
  render(Field, {
    props,
    slots: { default: () => h(Input), ...slots } as never,
  });

describe('Field — rendering', () => {
  it('gives the control its accessible name from a real label', () => {
    field({}, { label: () => 'Email' });
    expect(control()).toHaveAccessibleName('Email');
    expect(document.querySelector('label')).toHaveAttribute('for', control().id);
  });

  it('focuses the control when the label is clicked', async () => {
    // The half of the association that no ARIA attribute provides.
    const user = userEvent.setup();
    field({}, { label: () => 'Email' });

    await user.click(screen.getByText('Email'));
    expect(control()).toHaveFocus();
  });

  it('marks the root and only the root with data-kanso', () => {
    field({}, { label: () => 'Email' });
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(root()).toHaveAttribute('data-kanso');
  });

  it('puts a consumer id on the root verbatim and derives the rest', () => {
    field({ id: 'email' }, { label: () => 'Email' });
    expect(root()).toHaveAttribute('id', 'email');
    expect(control()).toHaveAttribute('id', 'email-control');
  });

  it('passes class and arbitrary attributes through to the root', () => {
    render(Field, {
      attrs: { class: 'mine', 'data-testid': 'f' },
      slots: { label: () => 'Email', default: () => h(Input) } as never,
    });
    expect(root()).toHaveClass('mine');
    expect(root()).toHaveAttribute('data-testid', 'f');
  });

  it('renders no label element when no slot was given', () => {
    render(Field, {
      slots: { default: () => h(Input, { 'aria-label': 'Email' }) } as never,
    });
    expect(document.querySelector('label')).toBeNull();
  });

  it('renders the parts in the order the a11y tree wants them', () => {
    field(
      { invalid: true },
      {
        label: () => 'Email',
        description: () => 'Help',
        'error-text': () => 'Bad',
      },
    );
    const parts = [...root().children].map((child) => child.getAttribute('data-part'));
    // No description: the field is invalid, and one region of text below the
    // control is the contract. The error element is still last because it is
    // mounted whenever a message was supplied — it is the live region.
    expect(parts).toEqual(['label', 'control', 'error-text']);
  });

  it('shows the description again once the field is valid', async () => {
    const { rerender } = field(
      { invalid: true },
      {
        label: () => 'Email',
        description: () => 'Help',
        'error-text': () => 'Bad',
      },
    );

    await rerender({ invalid: false });

    const parts = [...root().children].map((child) => child.getAttribute('data-part'));
    expect(parts).toEqual(['label', 'control', 'description', 'error-text']);
  });
});

describe('Field — aria-describedby, the four cases', () => {
  it('has no attribute at all when there is nothing to describe', () => {
    // Absent, not empty. aria-describedby="" is a different thing.
    field({}, { label: () => 'Email' });
    expect(control()).not.toHaveAttribute('aria-describedby');
  });

  it('points at the description alone', () => {
    field({}, { label: () => 'Email', description: () => 'We only use this to sign you in.' });
    expect(control()).toHaveAccessibleDescription('We only use this to sign you in.');
  });

  it('points at the error alone while invalid', () => {
    field(
      { invalid: true },
      { label: () => 'Email', 'error-text': () => 'Enter an email address.' },
    );
    expect(control()).toHaveAccessibleDescription('Enter an email address.');
  });

  it('points at the error alone when both were supplied, never at both', () => {
    // The description is not rendered while an error is showing, so a control
    // still describing it would be pointing at nothing. The element's absence
    // is asserted too: a dangling idref contributes no text, so the accessible
    // description alone cannot tell the two versions apart.
    field(
      { invalid: true },
      {
        label: () => 'Email',
        description: () => 'Help text.',
        'error-text': () => 'Enter an email address.',
      },
    );
    expect(control()).toHaveAccessibleDescription('Enter an email address.');
    expect(document.querySelector('[data-part="description"]')).toBeNull();
  });

  it('drops the error id while the field is valid', () => {
    field(
      {},
      {
        label: () => 'Email',
        description: () => 'Help text.',
        'error-text': () => 'Enter an email address.',
      },
    );
    expect(control()).toHaveAccessibleDescription('Help text.');
  });
});

describe('Field — the consumer’s own aria-describedby', () => {
  it('is composed with the field’s, not replaced by it', () => {
    // Core props are applied last so they win, which is why the control has to
    // hand the consumer's value in rather than letting the spread drop it.
    const App = defineComponent({
      setup: () => () => [
        h(
          Field,
          {},
          {
            label: () => 'Bio',
            description: () => 'Keep it short.',
            default: () => h(Textarea, { 'aria-describedby': 'counter' }),
          },
        ),
        h('span', { id: 'counter' }, '140 characters left'),
      ],
    });

    render(App);
    expect(control()).toHaveAccessibleDescription('Keep it short. 140 characters left');
  });
});

describe('Field — state', () => {
  it('sets aria-invalid and data-invalid when invalid', () => {
    field({ invalid: true }, { label: () => 'Email' });
    expect(control()).toHaveAttribute('aria-invalid', 'true');
    expect(root()).toHaveAttribute('data-invalid', '');
  });

  it('emits no aria-invalid at all when valid', () => {
    field({}, { label: () => 'Email' });
    expect(control()).not.toHaveAttribute('aria-invalid');
  });

  it('forwards disabled, readOnly and required to the control natively', () => {
    field({ disabled: true, readOnly: true, required: true }, { label: () => 'Email' });
    expect(control()).toBeDisabled();
    expect(control()).toHaveAttribute('readonly');
    expect(control()).toBeRequired();
  });

  it('uses the native required rather than aria-required', () => {
    field({ required: true }, { label: () => 'Email' });
    expect(control()).not.toHaveAttribute('aria-required');
  });
});

describe('Field — the error live region', () => {
  it('renders the region before there is a message to put in it', () => {
    // The element has to already be in the document for the change to be
    // announced. This is what the whole "always render, conditionally fill"
    // rule buys, and it is invisible unless asserted.
    field({}, { label: () => 'Email', 'error-text': () => 'Enter an email address.' });

    expect(errorText()).not.toBeNull();
    expect(errorText()).toHaveAttribute('aria-live', 'polite');
    expect(errorText()).toBeEmptyDOMElement();
  });

  it('fills the same element when the field turns invalid', async () => {
    const user = userEvent.setup();

    const App = defineComponent({
      setup() {
        const invalid = ref(false);
        return () => [
          h('button', { type: 'button', onClick: () => (invalid.value = true) }, 'validate'),
          h(
            Field,
            { invalid: invalid.value },
            {
              label: () => 'Email',
              'error-text': () => 'Enter an email address.',
              default: () => h(Input),
            },
          ),
        ];
      },
    });

    render(App);
    const before = errorText();

    await user.click(screen.getByRole('button', { name: 'validate' }));

    expect(errorText()).toHaveTextContent('Enter an email address.');
    // Same node, not a replacement — a live region that is remounted with its
    // message is the failure this design avoids.
    expect(errorText()).toBe(before);
  });

  it('renders no region at all when no message was supplied', () => {
    field({ invalid: true }, { label: () => 'Email' });
    expect(errorText()).toBeNull();
    expect(control()).not.toHaveAttribute('aria-describedby');
  });

  it('does not hide the message with the hidden attribute', () => {
    // The stylesheet is optional. A component whose announcements depend on CSS
    // the consumer may not have installed is not headless.
    field(
      { invalid: true },
      { label: () => 'Email', 'error-text': () => 'Enter an email address.' },
    );
    expect(errorText()).not.toHaveAttribute('hidden');
  });
});

describe('Textarea', () => {
  it('renders a textarea with the same wiring as an input', () => {
    render(Field, {
      props: { id: 'notes' },
      slots: {
        label: () => 'Notes',
        description: () => 'Optional.',
        default: () => h(Textarea, { rows: 4 }),
      } as never,
    });

    const area = control() as HTMLTextAreaElement;
    expect(area.tagName).toBe('TEXTAREA');
    expect(area).toHaveAttribute('id', 'notes-control');
    expect(area).toHaveAttribute('rows', '4');
    expect(area).toHaveAccessibleName('Notes');
    expect(area).toHaveAccessibleDescription('Optional.');
  });

  it('leaves the value to the consumer', async () => {
    const user = userEvent.setup();
    render(Field, {
      slots: { label: () => 'Notes', default: () => h(Textarea) } as never,
    });

    await user.type(control(), 'hello');
    expect(control()).toHaveValue('hello');
  });
});

describe('Field — v-model', () => {
  /**
   * The binding has to be *declared*, not inherited.
   *
   * `v-model` compiles to a `modelValue` prop and an `update:modelValue`
   * listener. A component declaring neither gets both as fallthrough attrs and
   * spreads them onto the native element, where `modelValue` is a junk
   * attribute and the listener waits for an event no DOM element fires. The
   * binding is then silently inert, and it looks like "typing does nothing".
   *
   * Nothing else in the suite would notice: the example files are only ever
   * read as `?raw` source, and the playground has no value binding.
   */
  const bound = (component: typeof Input | typeof Textarea) => {
    const model = ref('');
    const App = defineComponent({
      setup: () => () =>
        h(
          Field,
          {},
          {
            label: () => 'Email',
            default: () =>
              h(component, {
                modelValue: model.value,
                'onUpdate:modelValue': (value: string) => {
                  model.value = value;
                },
              }),
          },
        ),
    });
    render(App);
    return model;
  };

  it('updates the bound ref as the user types into an Input', async () => {
    const user = userEvent.setup();
    const model = bound(Input);

    await user.type(control(), 'hi');

    expect(model.value).toBe('hi');
    expect(control()).toHaveValue('hi');
  });

  it('updates the bound ref as the user types into a Textarea', async () => {
    const user = userEvent.setup();
    const model = bound(Textarea);

    await user.type(control(), 'hi');

    expect(model.value).toBe('hi');
  });

  it('writes back into the control when the model changes', async () => {
    const model = ref('start');
    const App = defineComponent({
      setup: () => () =>
        h(
          Field,
          {},
          {
            label: () => 'Email',
            default: () => h(Input, { modelValue: model.value }),
          },
        ),
    });

    render(App);
    expect(control()).toHaveValue('start');
  });

  it('leaves modelValue off the rendered element', async () => {
    // The junk-attribute half of the same defect.
    bound(Input);
    expect(control()).not.toHaveAttribute('modelValue');
    expect(control()).not.toHaveAttribute('modelvalue');
  });

  it('still calls a consumer’s own onInput', async () => {
    // Composed, not replaced — the same rule Button follows for onClick.
    const user = userEvent.setup();
    const onInput = vi.fn();
    render(Field, {
      slots: { label: () => 'Email', default: () => h(Input, { onInput }) } as never,
    });

    await user.type(control(), 'a');

    expect(onInput).toHaveBeenCalled();
  });
});

describe('Field — misuse', () => {
  it('warns in development when no control was rendered', async () => {
    // The one dangling idref no design change rules out: the label's `for` is
    // emitted unconditionally because core cannot see the children.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(Field, { props: { id: 'email' }, slots: { label: () => 'Email' } as never });

    await flushTasks();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain('no control');
    error.mockRestore();
  });

  it('says nothing when a control is present', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    field({}, { label: () => 'Email' });

    await flushTasks();

    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('throws when an Input is rendered outside a Field', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Vue reports a setup() that threw as a *warning* about a missing render
    // function, which is true and unhelpful; silence it so the suite's output
    // says only what it means to.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => render(Input)).toThrow(/inside a Field/);

    error.mockRestore();
    warn.mockRestore();
  });
});

describe('Field — accessibility', () => {
  it('has no axe violations, valid', async () => {
    const { container } = render(Field, {
      slots: {
        label: () => 'Email',
        description: () => 'We only use this to sign you in.',
        default: () => h(Input, { type: 'email' }),
      } as never,
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations, invalid', async () => {
    const { container } = render(Field, {
      props: { invalid: true },
      slots: {
        label: () => 'Email',
        description: () => 'Help.',
        'error-text': () => 'Enter an email address.',
        default: () => h(Input, { type: 'email' }),
      } as never,
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations for a textarea', async () => {
    const { container } = render(Field, {
      slots: { label: () => 'Notes', default: () => h(Textarea) } as never,
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
