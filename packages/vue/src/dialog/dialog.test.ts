import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { defineComponent, h, ref } from 'vue';
import {
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from './dialog';

/**
 * Deliberately a mirror of packages/react/src/dialog/dialog.test.tsx.
 *
 * The thesis is that behaviour lives once in core and the frameworks are skins.
 * The way that claim stays true is that a behaviour present in one adapter and
 * missing from the other shows up here as a failing test, not as a shrug.
 *
 * What these cannot check is the trap itself: jsdom does not implement `inert`
 * and its focus model is not trustworthy. "Focus cannot escape" is asserted in
 * Playwright, against a real browser. See `docs/04`.
 */

type RootProps = Record<string, unknown>;

const example = (props: RootProps = {}) =>
  defineComponent({
    setup: () => () =>
      h(DialogRoot, props, () => [
        h(DialogTrigger, null, () => 'Open settings'),
        h(DialogPositioner, null, () => [
          h(DialogBackdrop),
          h(DialogContent, null, () => [
            h(DialogTitle, null, () => 'Settings'),
            h(DialogDescription, null, () => 'Change how the app behaves.'),
            h('button', { type: 'button' }, 'Save'),
            h(DialogClose, null, () => 'Cancel'),
          ]),
        ]),
      ]),
  });

const renderExample = (props: RootProps = {}) => render(example(props));

const dialog = () => screen.getByRole('dialog');
const queryDialog = () => screen.queryByRole('dialog');
const trigger = () => screen.getByRole('button', { name: 'Open settings' });
const part = (name: string) => document.querySelector<HTMLElement>(`[data-part="${name}"]`);

afterEach(() => {
  // Deliberately *not* `document.body.innerHTML = ''`: the dialog is teleported
  // into the body, and wiping it out from under Testing Library's own cleanup
  // leaves Vue unmounting nodes that are no longer there.
  vi.restoreAllMocks();
});

describe('Dialog — rendering', () => {
  it('renders nothing but the trigger while closed', () => {
    renderExample();

    expect(trigger()).toBeInTheDocument();
    expect(queryDialog()).not.toBeInTheDocument();
    expect(part('positioner')).toBeNull();
  });

  it('opens from the trigger', async () => {
    const user = userEvent.setup();
    renderExample();

    await user.click(trigger());

    expect(dialog()).toBeInTheDocument();
    expect(dialog()).toHaveTextContent('Change how the app behaves.');
  });

  it('teleports to the body, not into the trigger’s parent', async () => {
    const user = userEvent.setup();
    const { container } = renderExample();

    await user.click(trigger());

    expect(container.contains(dialog())).toBe(false);
    expect(part('positioner')?.parentElement).toBe(document.body);
  });

  it('names every part', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    expect(trigger()).toHaveAttribute('data-part', 'trigger');
    expect(part('positioner')).not.toBeNull();
    expect(part('backdrop')).not.toBeNull();
    expect(part('content')).not.toBeNull();
    expect(part('title')).not.toBeNull();
    expect(part('description')).not.toBeNull();
    expect(part('close')).not.toBeNull();
  });

  it('marks exactly two scope roots — the trigger and the positioner', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    const marked = Array.from(document.querySelectorAll('[data-kanso]'));
    expect(marked.map((element) => element.getAttribute('data-part'))).toEqual([
      'trigger',
      'positioner',
    ]);
  });

  it('reports open state through data-state', async () => {
    const user = userEvent.setup();
    renderExample();

    expect(trigger()).toHaveAttribute('data-state', 'closed');

    await user.click(trigger());

    expect(trigger()).toHaveAttribute('data-state', 'open');
    expect(part('content')).toHaveAttribute('data-state', 'open');
  });

  it('renders nothing on the trigger’s behalf that dangles', () => {
    renderExample();
    expect(trigger()).not.toHaveAttribute('aria-controls');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Dialog — accessible name and description', () => {
  it('wires aria-labelledby and aria-describedby to the rendered parts', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await waitFor(() => {
      expect(dialog()).toHaveAttribute('aria-labelledby', part('title')?.id);
    });
    expect(dialog()).toHaveAttribute('aria-describedby', part('description')?.id);
    expect(dialog()).toHaveAccessibleName('Settings');
    expect(dialog()).toHaveAccessibleDescription('Change how the app behaves.');
  });

  it('emits no idref for a part that was not rendered', async () => {
    const user = userEvent.setup();
    render(
      defineComponent({
        setup: () => () =>
          h(DialogRoot, null, () => [
            h(DialogTrigger, null, () => 'Open settings'),
            h(DialogPositioner, null, () => [
              h(DialogContent, { 'aria-label': 'Bare' }, () => [
                h('button', { type: 'button' }, 'Only a button'),
              ]),
            ]),
          ]),
      }),
    );

    await user.click(trigger());

    expect(dialog()).not.toHaveAttribute('aria-labelledby');
    expect(dialog()).not.toHaveAttribute('aria-describedby');
    expect(dialog()).toHaveAccessibleName('Bare');
  });

  it('every idref it does emit resolves to an element', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await waitFor(() => {
      const refs = ['aria-labelledby', 'aria-describedby']
        .map((attribute) => dialog().getAttribute(attribute))
        .filter((value): value is string => value !== null)
        .flatMap((value) => value.split(/\s+/));

      expect(refs).toHaveLength(2);
      for (const id of refs) expect(document.getElementById(id)).not.toBeNull();
    });
  });

  it('lets a consumer’s aria-label win over the title', async () => {
    const user = userEvent.setup();
    render(
      defineComponent({
        setup: () => () =>
          h(DialogRoot, null, () => [
            h(DialogTrigger, null, () => 'Open settings'),
            h(DialogPositioner, null, () => [
              h(DialogContent, { 'aria-label': 'Chosen name' }, () => [
                h(DialogTitle, null, () => 'Heading'),
              ]),
            ]),
          ]),
      }),
    );

    await user.click(trigger());

    await waitFor(() => expect(dialog()).not.toHaveAttribute('aria-labelledby'));
    expect(dialog()).toHaveAccessibleName('Chosen name');
  });

  it('complains in development about a dialog with no name at all', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      defineComponent({
        setup: () => () =>
          h(DialogRoot, null, () => [
            h(DialogTrigger, null, () => 'Open settings'),
            h(DialogPositioner, null, () => [
              h(DialogContent, null, () => [h('p', 'No title, no aria-label.')]),
            ]),
          ]),
      }),
    );

    await user.click(trigger());

    await waitFor(() => {
      expect(error.mock.calls.flat().join(' ')).toContain('no accessible name');
    });
  });
});

describe('Dialog — dismissal', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('does not close on Escape when closeOnEscape is off', async () => {
    const user = userEvent.setup();
    renderExample({ closeOnEscape: false });
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(queryDialog()).toBeInTheDocument();
  });

  it('closes on a press outside, including the backdrop', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    const backdrop = part('backdrop');
    if (backdrop === null) throw new Error('no backdrop');
    await user.click(backdrop);

    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('does not close on a press inside', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(queryDialog()).toBeInTheDocument();
  });

  it('does not close when closeOnInteractOutside is off', async () => {
    const user = userEvent.setup();
    renderExample({ closeOnInteractOutside: false });
    await user.click(trigger());

    const backdrop = part('backdrop');
    if (backdrop === null) throw new Error('no backdrop');
    await user.click(backdrop);

    expect(queryDialog()).toBeInTheDocument();
  });

  it('closes from the close button', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('stays open when the trigger is pressed again', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.click(trigger());

    expect(queryDialog()).toBeInTheDocument();
  });
});

describe('Dialog — focus', () => {
  it('moves focus into the dialog on open', async () => {
    const user = userEvent.setup();
    renderExample();

    await user.click(trigger());

    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('honours initialFocus', async () => {
    const user = userEvent.setup();
    render(
      defineComponent({
        setup() {
          // A template ref on a *component* resolves to its instance, not to
          // its element, so the element comes from `$el` — the pattern the Vue
          // half of the docs page teaches. Refs on plain elements need no such
          // step, which is why React's version of this test reads differently.
          const cancel = ref<{ $el: HTMLElement } | null>(null);
          return () =>
            h(DialogRoot, { initialFocus: () => cancel.value?.$el ?? null }, () => [
              h(DialogTrigger, null, () => 'Open settings'),
              h(DialogPositioner, null, () => [
                h(DialogContent, null, () => [
                  h(DialogTitle, null, () => 'Delete'),
                  h('button', { type: 'button' }, 'Delete for ever'),
                  h(DialogClose, { ref: cancel }, () => 'Cancel'),
                ]),
              ]),
            ]);
        },
      }),
    );

    await user.click(trigger());

    // The alertdialog rule made concrete: never auto-focus the destructive
    // action. `docs/03` §3 decision 9.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('falls back to the content element when nothing inside is focusable', async () => {
    const user = userEvent.setup();
    render(
      defineComponent({
        setup: () => () =>
          h(DialogRoot, null, () => [
            h(DialogTrigger, null, () => 'Open settings'),
            h(DialogPositioner, null, () => [
              h(DialogContent, null, () => [h(DialogTitle, null, () => 'Nothing to press')]),
            ]),
          ]),
      }),
    );

    await user.click(trigger());

    expect(dialog()).toHaveFocus();
  });

  it('restores focus to the trigger on close', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(trigger()).toHaveFocus();
  });

  it('honours finalFocus', async () => {
    const user = userEvent.setup();
    render(
      defineComponent({
        setup() {
          const after = ref<HTMLElement | null>(null);
          return () =>
            h('div', [
              h(DialogRoot, { finalFocus: () => after.value }, () => [
                h(DialogTrigger, null, () => 'Open settings'),
                h(DialogPositioner, null, () => [
                  h(DialogContent, null, () => [
                    h(DialogTitle, null, () => 'Done'),
                    h(DialogClose, null, () => 'Cancel'),
                  ]),
                ]),
              ]),
              h('button', { type: 'button', ref: after }, 'Next step'),
            ]);
        },
      }),
    );

    await user.click(trigger());
    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: 'Next step' })).toHaveFocus();
  });
});

describe('Dialog — modal versus non-modal', () => {
  it('inerts the background and locks scrolling while modal', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderExample();

    await user.click(trigger());

    const container = baseElement.firstElementChild;
    expect(container?.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');

    expect(container?.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('does neither when non-modal', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderExample({ modal: false });

    await user.click(trigger());

    expect(baseElement.firstElementChild?.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('marks the content aria-modal only while modal', async () => {
    const user = userEvent.setup();
    const { unmount } = renderExample();
    await user.click(trigger());
    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    unmount();

    renderExample({ modal: false });
    await user.click(trigger());
    expect(dialog()).not.toHaveAttribute('aria-modal');
  });
});

describe('Dialog — controlled and uncontrolled', () => {
  it('opens uncontrolled from defaultOpen', async () => {
    renderExample({ defaultOpen: true });
    await waitFor(() => expect(queryDialog()).toBeInTheDocument());
  });

  it('reports every change through openChange and update:open', async () => {
    const user = userEvent.setup();
    const openChange = vi.fn();
    const updateOpen = vi.fn();
    renderExample({ onOpenChange: openChange, 'onUpdate:open': updateOpen });

    await user.click(trigger());
    expect(openChange).toHaveBeenLastCalledWith(true);
    expect(updateOpen).toHaveBeenLastCalledWith(true);

    await user.keyboard('{Escape}');
    expect(openChange).toHaveBeenLastCalledWith(false);
    expect(openChange).toHaveBeenCalledTimes(2);
  });

  it('does not fire openChange for a no-op', async () => {
    const user = userEvent.setup();
    const openChange = vi.fn();
    renderExample({ onOpenChange: openChange });

    await user.click(trigger());
    await user.click(trigger());

    expect(openChange).toHaveBeenCalledTimes(1);
  });

  it('lets the consumer own the state when controlled', async () => {
    const user = userEvent.setup();
    render(
      defineComponent({
        setup() {
          const open = ref(false);
          return () =>
            h('div', [
              h(
                'button',
                { type: 'button', onClick: () => (open.value = true) },
                'Open from outside',
              ),
              h(
                DialogRoot,
                { open: open.value, 'onUpdate:open': (value: boolean) => (open.value = value) },
                () => [
                  h(DialogTrigger, null, () => 'Open settings'),
                  h(DialogPositioner, null, () => [
                    h(DialogContent, null, () => [h(DialogTitle, null, () => 'Settings')]),
                  ]),
                ],
              ),
            ]);
        },
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Open from outside' }));
    expect(dialog()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('refuses to close a controlled dialog whose owner says otherwise', async () => {
    const user = userEvent.setup();
    renderExample({ open: true });

    await waitFor(() => expect(queryDialog()).toBeInTheDocument());
    await user.keyboard('{Escape}');

    expect(queryDialog()).toBeInTheDocument();
  });
});

describe('Dialog — roles', () => {
  it('takes the alertdialog role', async () => {
    const user = userEvent.setup();
    renderExample({ role: 'alertdialog' });

    await user.click(trigger());

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

describe('Dialog — axe', () => {
  it('has no violations while closed', async () => {
    const { container } = renderExample();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations while open', async () => {
    // The scan that is easy to skip: a closed dialog is nothing but a button,
    // so a closed-only scan says almost nothing about the component.
    const user = userEvent.setup();
    const { baseElement } = renderExample();
    await user.click(trigger());

    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('has no violations as an alertdialog', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderExample({ role: 'alertdialog' });
    await user.click(trigger());

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});

describe('Dialog — misuse', () => {
  it('throws a useful error for a part rendered outside the root', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => render(defineComponent({ setup: () => () => h(DialogTitle) }))).toThrow(
      '[kanso] DialogTitle must be rendered inside DialogRoot.',
    );

    warn.mockRestore();
  });
});
