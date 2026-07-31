import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Dialog, type DialogRootProps } from './dialog';

/**
 * Deliberately mirrored by `packages/vue/src/dialog/dialog.test.ts`, assertion
 * for assertion. A behaviour present in one adapter and missing in the other is
 * a bug, not a shortcut (CLAUDE.md rule 2) — keeping the two files parallel is
 * what makes that visible.
 *
 * What these cannot check is the trap itself: jsdom does not implement `inert`
 * and its focus model is not trustworthy. "Focus cannot escape" is asserted in
 * Playwright, against a real browser. See `docs/04`.
 */
function Example({ children, ...props }: Partial<DialogRootProps> = {}) {
  return (
    <Dialog.Root {...props}>
      <Dialog.Trigger>Open settings</Dialog.Trigger>
      <Dialog.Positioner>
        <Dialog.Backdrop />
        <Dialog.Content>
          <Dialog.Title>Settings</Dialog.Title>
          <Dialog.Description>Change how the app behaves.</Dialog.Description>
          {children}
          <button type="button">Save</button>
          <Dialog.Close>Cancel</Dialog.Close>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

const dialog = () => screen.getByRole('dialog');
const queryDialog = () => screen.queryByRole('dialog');
const trigger = () => screen.getByRole('button', { name: 'Open settings' });
const part = (name: string) => document.querySelector<HTMLElement>(`[data-part="${name}"]`);

afterEach(() => {
  // Deliberately *not* `document.body.innerHTML = ''`: the dialog is portalled
  // into the body, and wiping it out from under Testing Library's own cleanup
  // makes React fail to unmount with "The node to be removed is not a child of
  // this node" — 24 tests failing for a reason that has nothing to do with the
  // component. `cleanup` in `vitest.setup.ts` removes the roots properly, and
  // that takes the portals with it.
  vi.restoreAllMocks();
});

describe('Dialog — rendering', () => {
  it('renders nothing but the trigger while closed', () => {
    render(<Example />);

    expect(trigger()).toBeInTheDocument();
    expect(queryDialog()).not.toBeInTheDocument();
    expect(part('positioner')).toBeNull();
  });

  it('opens from the trigger', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(trigger());

    expect(dialog()).toBeInTheDocument();
    expect(dialog()).toHaveTextContent('Change how the app behaves.');
  });

  it('portals to the body, not into the trigger’s parent', async () => {
    // Which is what stops an ancestor's overflow, transform or z-index from
    // clipping or mis-stacking the dialog.
    const user = userEvent.setup();
    const { container } = render(<Example />);

    await user.click(trigger());

    expect(container.contains(dialog())).toBe(false);
    expect(part('positioner')?.parentElement).toBe(document.body);
  });

  it('names every part', async () => {
    const user = userEvent.setup();
    render(<Example defaultOpen />);
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
    // Dialog has two because the trigger stays in the page and the rest is
    // portalled; no single element contains both.
    render(<Example defaultOpen />);

    await waitFor(() => expect(queryDialog()).toBeInTheDocument());
    const marked = Array.from(document.querySelectorAll('[data-kanso]'));
    expect(marked.map((element) => element.getAttribute('data-part'))).toEqual([
      'trigger',
      'positioner',
    ]);
  });

  it('reports open state through data-state', async () => {
    const user = userEvent.setup();
    render(<Example />);

    expect(trigger()).toHaveAttribute('data-state', 'closed');

    await user.click(trigger());

    expect(trigger()).toHaveAttribute('data-state', 'open');
    expect(part('content')).toHaveAttribute('data-state', 'open');
  });

  it('renders nothing on the trigger’s behalf that dangles', () => {
    // No aria-controls: the content is unmounted while closed, so the idref
    // would point at nothing for most of the component's life.
    render(<Example />);
    expect(trigger()).not.toHaveAttribute('aria-controls');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Dialog — accessible name and description', () => {
  it('wires aria-labelledby and aria-describedby to the rendered parts', async () => {
    render(<Example defaultOpen />);
    await waitFor(() => expect(queryDialog()).toBeInTheDocument());

    await waitFor(() => {
      expect(dialog()).toHaveAttribute('aria-labelledby', part('title')?.id);
    });
    expect(dialog()).toHaveAttribute('aria-describedby', part('description')?.id);
    expect(dialog()).toHaveAccessibleName('Settings');
    expect(dialog()).toHaveAccessibleDescription('Change how the app behaves.');
  });

  it('emits no idref for a part that was not rendered', async () => {
    // The defect this prevents, for the third time in this repo: an idref to an
    // element that does not exist resolves to nothing, and axe reports it as
    // *incomplete* rather than as a violation.
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Positioner>
          <Dialog.Content aria-label="Bare">
            <button type="button">Only a button</button>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>,
    );

    await waitFor(() => expect(queryDialog()).toBeInTheDocument());
    expect(dialog()).not.toHaveAttribute('aria-labelledby');
    expect(dialog()).not.toHaveAttribute('aria-describedby');
    expect(dialog()).toHaveAccessibleName('Bare');
  });

  it('every idref it does emit resolves to an element', async () => {
    render(<Example defaultOpen />);
    await waitFor(() => expect(queryDialog()).toBeInTheDocument());

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
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Positioner>
          <Dialog.Content aria-label="Chosen name">
            <Dialog.Title>Heading</Dialog.Title>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>,
    );

    await waitFor(() => expect(queryDialog()).toBeInTheDocument());
    await waitFor(() => expect(dialog()).not.toHaveAttribute('aria-labelledby'));
    expect(dialog()).toHaveAccessibleName('Chosen name');
  });

  it('complains in development about a dialog with no name at all', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Positioner>
          <Dialog.Content>
            <p>No title, no aria-label.</p>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>,
    );

    await waitFor(() => {
      expect(error.mock.calls.flat().join(' ')).toContain('no accessible name');
    });
  });
});

describe('Dialog — dismissal', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('does not close on Escape when closeOnEscape is off', async () => {
    const user = userEvent.setup();
    render(<Example closeOnEscape={false} />);
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(queryDialog()).toBeInTheDocument();
  });

  it('closes on a press outside, including the backdrop', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    const backdrop = part('backdrop');
    if (backdrop === null) throw new Error('no backdrop');
    await user.click(backdrop);

    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('does not close on a press inside', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(queryDialog()).toBeInTheDocument();
  });

  it('does not close when closeOnInteractOutside is off', async () => {
    const user = userEvent.setup();
    render(<Example closeOnInteractOutside={false} />);
    await user.click(trigger());

    const backdrop = part('backdrop');
    if (backdrop === null) throw new Error('no backdrop');
    await user.click(backdrop);

    expect(queryDialog()).toBeInTheDocument();
  });

  it('closes from the close button', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('stays open when the trigger is pressed again', async () => {
    // The failure this prevents: pointerdown outside dismisses, the click that
    // follows reopens, and the dialog appears to flicker and never close.
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.click(trigger());

    expect(queryDialog()).toBeInTheDocument();
  });
});

describe('Dialog — focus', () => {
  it('moves focus into the dialog on open', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(trigger());

    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('honours initialFocus', async () => {
    function WithInitialFocus() {
      const cancelRef = useRef<HTMLButtonElement | null>(null);
      return (
        <Dialog.Root initialFocus={() => cancelRef.current}>
          <Dialog.Trigger>Open settings</Dialog.Trigger>
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Title>Delete</Dialog.Title>
              <button type="button">Delete for ever</button>
              <Dialog.Close ref={cancelRef}>Cancel</Dialog.Close>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      );
    }

    const user = userEvent.setup();
    render(<WithInitialFocus />);
    await user.click(trigger());

    // The alertdialog rule made concrete: never auto-focus the destructive
    // action. `docs/03` §3 decision 9.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('falls back to the content element when nothing inside is focusable', async () => {
    const user = userEvent.setup();
    render(
      <Dialog.Root>
        <Dialog.Trigger>Open settings</Dialog.Trigger>
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Title>Nothing to press</Dialog.Title>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>,
    );

    await user.click(trigger());

    expect(dialog()).toHaveFocus();
  });

  it('restores focus to the trigger on close', async () => {
    // Failing to do this strands keyboard users at the top of the document.
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(trigger()).toHaveFocus();
  });

  it('honours finalFocus', async () => {
    function WithFinalFocus() {
      const afterRef = useRef<HTMLButtonElement | null>(null);
      return (
        <>
          <Dialog.Root finalFocus={() => afterRef.current}>
            <Dialog.Trigger>Open settings</Dialog.Trigger>
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Title>Done</Dialog.Title>
                <Dialog.Close>Cancel</Dialog.Close>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>
          <button type="button" ref={afterRef}>
            Next step
          </button>
        </>
      );
    }

    const user = userEvent.setup();
    render(<WithFinalFocus />);
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: 'Next step' })).toHaveFocus();
  });
});

describe('Dialog — modal versus non-modal', () => {
  it('inerts the background and locks scrolling while modal', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);

    await user.click(trigger());

    // The testing-library container holds the trigger; the positioner is a
    // separate body child, which is exactly the arrangement the trap expects.
    const container = baseElement.firstElementChild;
    expect(container?.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');

    expect(container?.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('does neither when non-modal', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example modal={false} />);

    await user.click(trigger());

    expect(baseElement.firstElementChild?.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    // Dismissal and focus still apply — the difference is only the trap and
    // the lock.
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('marks the content aria-modal only while modal', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.click(trigger());
    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    unmount();

    render(<Example modal={false} />);
    await user.click(trigger());
    expect(dialog()).not.toHaveAttribute('aria-modal');
  });
});

describe('Dialog — controlled and uncontrolled', () => {
  it('opens uncontrolled from defaultOpen', async () => {
    render(<Example defaultOpen />);
    await waitFor(() => expect(queryDialog()).toBeInTheDocument());
  });

  it('reports every change through onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);

    await user.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it('does not fire onOpenChange for a no-op', async () => {
    // Escape and a press outside can both ask to close in the same frame; the
    // reducer refuses the second and the adapter compares by reference.
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);

    await user.click(trigger());
    await user.click(trigger());

    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('lets the consumer own the state when controlled', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open from outside
          </button>
          <Example open={open} onOpenChange={setOpen} />
        </>
      );
    }

    const user = userEvent.setup();
    render(<Controlled />);

    // Opened by something that is not the trigger, which is why finalFocus
    // defaults to "whatever had focus" rather than to the trigger.
    await user.click(screen.getByRole('button', { name: 'Open from outside' }));
    expect(dialog()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryDialog()).not.toBeInTheDocument();
  });

  it('refuses to close a controlled dialog whose owner says otherwise', async () => {
    const user = userEvent.setup();
    render(<Example open />);

    await waitFor(() => expect(queryDialog()).toBeInTheDocument());
    await user.keyboard('{Escape}');

    // The consumer holds `open` at true and ignored the callback, so it stays.
    expect(queryDialog()).toBeInTheDocument();
  });
});

describe('Dialog — roles', () => {
  it('takes the alertdialog role', async () => {
    const user = userEvent.setup();
    render(<Example role="alertdialog" />);

    await user.click(trigger());

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

describe('Dialog — axe', () => {
  it('has no violations while closed', async () => {
    const { container } = render(<Example />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations while open', async () => {
    // The scan that is easy to skip: a closed dialog is nothing but a button,
    // so a closed-only scan says almost nothing about the component.
    const user = userEvent.setup();
    const { baseElement } = render(<Example />);
    await user.click(trigger());

    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('has no violations as an alertdialog', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example role="alertdialog" />);
    await user.click(trigger());

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});

describe('Dialog — misuse', () => {
  it('throws a useful error for a part rendered outside the root', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Dialog.Title>Orphan</Dialog.Title>)).toThrow(
      '[kanso] Dialog.Title must be rendered inside Dialog.Root.',
    );

    error.mockRestore();
  });
});
