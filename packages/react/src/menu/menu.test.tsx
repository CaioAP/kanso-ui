import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Dialog } from '../dialog/dialog';
import { Menu, type MenuRootProps } from './menu';

/**
 * Deliberately mirrored by `packages/vue/src/menu/menu.test.ts`, assertion for
 * assertion. A behaviour present in one adapter and missing in the other is a
 * bug, not a shortcut (CLAUDE.md rule 2).
 */
function Example({ children, ...props }: Partial<MenuRootProps> = {}) {
  return (
    <>
      <Menu.Root {...props}>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="archive">Archive</Menu.Item>
            <Menu.Item value="save">Save</Menu.Item>
            <Menu.Item value="save-as" disabled>
              Save as…
            </Menu.Item>
            <Menu.Separator />
            <Menu.Group>
              <Menu.GroupLabel>Danger</Menu.GroupLabel>
              <Menu.Item value="settings">Settings</Menu.Item>
            </Menu.Group>
            {children}
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
      <button type="button">After</button>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Actions' });
const menu = () => screen.getByRole('menu');
const queryMenu = () => screen.queryByRole('menu');
const items = () => screen.getAllByRole('menuitem');
const item = (name: string) => screen.getByRole('menuitem', { name });
const part = (name: string) => document.querySelector<HTMLElement>(`[data-part="${name}"]`);

/** Open with the keyboard, so focus lands where the key asked. */
async function openWith(user: ReturnType<typeof userEvent.setup>, key: string) {
  trigger().focus();
  await user.keyboard(key);
  await waitFor(() => expect(queryMenu()).toBeInTheDocument());
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Menu — rendering', () => {
  it('renders only the trigger while closed', () => {
    render(<Example />);

    expect(trigger()).toBeInTheDocument();
    expect(queryMenu()).not.toBeInTheDocument();
  });

  it('opens from the trigger', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(trigger());

    expect(menu()).toBeInTheDocument();
    expect(items()).toHaveLength(4);
  });

  it('renders in flow, not in a portal', async () => {
    // Which is what lets a menu work inside a dialog: a portalled menu is a
    // sibling of the dialog content, and the dialog's trap would pull focus out
    // of it. `docs/03` §4 decision 3.
    const user = userEvent.setup();
    const { container } = render(<Example />);
    await user.click(trigger());

    expect(container.contains(menu())).toBe(true);
    expect(part('root')?.contains(menu())).toBe(true);
  });

  it('marks one scope root, and names every part', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(part('root')).toHaveAttribute('data-scope', 'menu');
    for (const name of [
      'trigger',
      'positioner',
      'content',
      'item',
      'separator',
      'group',
      'group-label',
    ]) {
      expect(part(name)).not.toBeNull();
    }
  });

  it('toggles closed from the trigger', async () => {
    // The dismissable layer excludes the trigger, so pointerdown does not
    // dismiss and the click that follows is what closes it. Without the
    // exclusion the menu would close and immediately reopen.
    const user = userEvent.setup();
    render(<Example />);

    await user.click(trigger());
    expect(menu()).toBeInTheDocument();

    await user.click(trigger());
    expect(queryMenu()).not.toBeInTheDocument();
  });

  it('says what it opens, and promises nothing that dangles', () => {
    render(<Example />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).not.toHaveAttribute('aria-controls');
  });

  it('labels the menu with its trigger, and the group with its label', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    expect(menu()).toHaveAttribute('aria-labelledby', trigger().id);
    const group = screen.getByRole('group');
    const labelId = group.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId as string)).toHaveTextContent('Danger');
  });
});

describe('Menu — opening and focus', () => {
  it('focuses the first item when opened with the pointer', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(trigger());

    expect(item('Archive')).toHaveFocus();
  });

  it('focuses the first item on Enter, Space and ArrowDown', async () => {
    const user = userEvent.setup();
    render(<Example />);

    for (const key of ['{Enter}', ' ', '{ArrowDown}']) {
      await openWith(user, key);
      expect(item('Archive')).toHaveFocus();
      await user.keyboard('{Escape}');
    }
  });

  it('focuses the last item on ArrowUp', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await openWith(user, '{ArrowUp}');

    expect(item('Settings')).toHaveFocus();
  });
});

describe('Menu — the keyboard table', () => {
  it('moves with the arrows and wraps', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('{ArrowDown}');
    expect(item('Save')).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(item('Archive')).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(item('Settings')).toHaveFocus();
  });

  it('stops at the ends when loop is off', async () => {
    const user = userEvent.setup();
    render(<Example loop={false} />);
    await user.click(trigger());

    await user.keyboard('{ArrowUp}');
    expect(item('Archive')).toHaveFocus();
  });

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('{End}');
    expect(item('Settings')).toHaveFocus();

    await user.keyboard('{Home}');
    expect(item('Archive')).toHaveFocus();
  });

  it('lands on disabled items rather than skipping them', async () => {
    // So a keyboard user can discover the item exists and is unavailable.
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('{ArrowDown}{ArrowDown}');

    expect(item('Save as…')).toHaveFocus();
    expect(item('Save as…')).toHaveAttribute('aria-disabled', 'true');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(queryMenu()).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes on Tab without swallowing the press', async () => {
    // The no-trap decision, as far as jsdom can go. Where focus *lands* is not
    // assertable here: user-event computes the next tab stop itself, from a DOM
    // that React has not finished unmounting, and reports `<body>`. A real
    // browser continues its own Tab handling from the trigger this handler just
    // focused, and the Playwright suite asserts exactly that. See docs/04.
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('{Tab}');

    expect(queryMenu()).not.toBeInTheDocument();
    // The press was allowed through rather than swallowed, so focus has moved
    // past the trigger the handler put it on. A trap would have kept it on the
    // item instead.
    expect(document.activeElement).not.toBe(trigger());
  });

  it('closes on a press outside', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'After' }));

    expect(queryMenu()).not.toBeInTheDocument();
  });
});

describe('Menu — typeahead', () => {
  it('jumps to the first match', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('s');

    expect(item('Save')).toHaveFocus();
  });

  it('cycles through matches when the letter is repeated', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('s');
    expect(item('Save')).toHaveFocus();
    await user.keyboard('s');
    expect(item('Save as…')).toHaveFocus();
    await user.keyboard('s');
    expect(item('Settings')).toHaveFocus();
  });

  it('matches a longer prefix as one query', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());

    await user.keyboard('se');

    expect(item('Settings')).toHaveFocus();
  });

  it('does nothing when typeahead is off', async () => {
    const user = userEvent.setup();
    render(<Example typeahead={false} />);
    await user.click(trigger());

    await user.keyboard('s');

    expect(item('Archive')).toHaveFocus();
  });
});

describe('Menu — selection', () => {
  it('reports the value, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);
    await user.click(trigger());

    await user.click(item('Save'));

    expect(onSelect).toHaveBeenCalledWith('save');
    expect(queryMenu()).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('selects with Enter and with Space, because items are real buttons', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);

    await user.click(trigger());
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('archive');

    await user.click(trigger());
    await user.keyboard('{ArrowDown} ');
    expect(onSelect).toHaveBeenLastCalledWith('save');
  });

  it('does nothing for a disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);
    await user.click(trigger());

    await user.click(item('Save as…'));

    expect(onSelect).not.toHaveBeenCalled();
    expect(menu()).toBeInTheDocument();
  });
});

describe('Menu — controlled and uncontrolled', () => {
  it('opens uncontrolled from defaultOpen', async () => {
    render(<Example defaultOpen />);
    await waitFor(() => expect(queryMenu()).toBeInTheDocument());
  });

  it('reports every change through onOpenChange, once each', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);

    await user.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
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

    await user.click(screen.getByRole('button', { name: 'Open from outside' }));
    expect(menu()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryMenu()).not.toBeInTheDocument();
  });
});

describe('Menu — inside a Dialog', () => {
  function MenuInDialog() {
    return (
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open dialog</Dialog.Trigger>
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Title>Settings</Dialog.Title>
            <Menu.Root>
              <Menu.Trigger>Actions</Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item value="save">Save</Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    );
  }

  it('Escape closes the menu and leaves the dialog open', async () => {
    // The claim `docs/03` §3 decision 5 made about the dismissable layer stack,
    // finally exercised: only the topmost layer acts.
    const user = userEvent.setup();
    render(<MenuInDialog />);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeInTheDocument());

    await user.click(trigger());
    expect(menu()).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(queryMenu()).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // And a second Escape closes the dialog underneath.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the dialog’s focus trap leaves the menu alone', async () => {
    // Only true because the menu renders in flow. Portalled, it would be a
    // sibling of the dialog content and the trap would pull focus out.
    const user = userEvent.setup();
    render(<MenuInDialog />);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeInTheDocument());

    await user.click(trigger());

    expect(item('Save')).toHaveFocus();
  });
});

describe('Menu — axe', () => {
  it('has no violations while closed', async () => {
    const { container } = render(<Example />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations while open', async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    await user.click(trigger());

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Menu — misuse', () => {
  it('throws for a part rendered outside the root', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Menu.Item value="x">Orphan</Menu.Item>)).toThrow(
      '[kanso] Menu.Item must be rendered inside Menu.Root.',
    );

    error.mockRestore();
  });

  it('throws for a group label outside a group', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(
        <Menu.Root defaultOpen>
          <Menu.Trigger>Actions</Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.GroupLabel>Orphan</Menu.GroupLabel>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>,
      ),
    ).toThrow('[kanso] Menu.GroupLabel must be rendered inside Menu.Group.');

    error.mockRestore();
  });
});
