import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { defineComponent, h, ref } from 'vue';
import {
  DialogContent,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../dialog/dialog';
import {
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPositioner,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from './menu';

/**
 * Deliberately a mirror of packages/react/src/menu/menu.test.tsx.
 *
 * The thesis is that behaviour lives once in core and the frameworks are skins.
 * The way that claim stays true is that a behaviour present in one adapter and
 * missing from the other shows up here as a failing test, not as a shrug.
 */

type RootProps = Record<string, unknown>;

const example = (props: RootProps = {}) =>
  defineComponent({
    setup: () => () =>
      h('div', [
        h(MenuRoot, props, () => [
          h(MenuTrigger, null, () => 'Actions'),
          h(MenuPositioner, null, () => [
            h(MenuContent, null, () => [
              h(MenuItem, { value: 'archive' }, () => 'Archive'),
              h(MenuItem, { value: 'save' }, () => 'Save'),
              h(MenuItem, { value: 'save-as', disabled: true }, () => 'Save as…'),
              h(MenuSeparator),
              h(MenuGroup, null, () => [
                h(MenuGroupLabel, null, () => 'Danger'),
                h(MenuItem, { value: 'settings' }, () => 'Settings'),
              ]),
            ]),
          ]),
        ]),
        h('button', { type: 'button' }, 'After'),
      ]),
  });

const renderExample = (props: RootProps = {}) => render(example(props));

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
    renderExample();

    expect(trigger()).toBeInTheDocument();
    expect(queryMenu()).not.toBeInTheDocument();
  });

  it('opens from the trigger', async () => {
    const user = userEvent.setup();
    renderExample();

    await user.click(trigger());

    expect(menu()).toBeInTheDocument();
    expect(items()).toHaveLength(4);
  });

  it('renders in flow, not in a portal', async () => {
    const user = userEvent.setup();
    const { container } = renderExample();
    await user.click(trigger());

    expect(container.contains(menu())).toBe(true);
    expect(part('root')?.contains(menu())).toBe(true);
  });

  it('marks one scope root, and names every part', async () => {
    const user = userEvent.setup();
    renderExample();
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
    const user = userEvent.setup();
    renderExample();

    await user.click(trigger());
    expect(menu()).toBeInTheDocument();

    await user.click(trigger());
    expect(queryMenu()).not.toBeInTheDocument();
  });

  it('says what it opens, and promises nothing that dangles', () => {
    renderExample();
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).not.toHaveAttribute('aria-controls');
  });

  it('labels the menu with its trigger, and the group with its label', async () => {
    const user = userEvent.setup();
    renderExample();
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
    renderExample();

    await user.click(trigger());

    expect(item('Archive')).toHaveFocus();
  });

  it('focuses the first item on Enter, Space and ArrowDown', async () => {
    const user = userEvent.setup();
    renderExample();

    for (const key of ['{Enter}', ' ', '{ArrowDown}']) {
      await openWith(user, key);
      expect(item('Archive')).toHaveFocus();
      await user.keyboard('{Escape}');
    }
  });

  it('focuses the last item on ArrowUp', async () => {
    const user = userEvent.setup();
    renderExample();

    await openWith(user, '{ArrowUp}');

    expect(item('Settings')).toHaveFocus();
  });
});

describe('Menu — the keyboard table', () => {
  it('moves with the arrows and wraps', async () => {
    const user = userEvent.setup();
    renderExample();
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
    renderExample({ loop: false });
    await user.click(trigger());

    await user.keyboard('{ArrowUp}');
    expect(item('Archive')).toHaveFocus();
  });

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.keyboard('{End}');
    expect(item('Settings')).toHaveFocus();

    await user.keyboard('{Home}');
    expect(item('Archive')).toHaveFocus();
  });

  it('lands on disabled items rather than skipping them', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.keyboard('{ArrowDown}{ArrowDown}');

    expect(item('Save as…')).toHaveFocus();
    expect(item('Save as…')).toHaveAttribute('aria-disabled', 'true');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(queryMenu()).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes on Tab without swallowing the press', async () => {
    // Where focus *lands* is not assertable in jsdom — user-event computes the
    // next tab stop itself, from a DOM the framework has not finished
    // unmounting. The Playwright suite asserts it in a real browser.
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.keyboard('{Tab}');

    expect(queryMenu()).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(trigger());
  });

  it('closes on a press outside', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'After' }));

    expect(queryMenu()).not.toBeInTheDocument();
  });
});

describe('Menu — typeahead', () => {
  it('jumps to the first match', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(trigger());

    await user.keyboard('s');

    expect(item('Save')).toHaveFocus();
  });

  it('cycles through matches when the letter is repeated', async () => {
    const user = userEvent.setup();
    renderExample();
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
    renderExample();
    await user.click(trigger());

    await user.keyboard('se');

    expect(item('Settings')).toHaveFocus();
  });

  it('does nothing when typeahead is off', async () => {
    const user = userEvent.setup();
    renderExample({ typeahead: false });
    await user.click(trigger());

    await user.keyboard('s');

    expect(item('Archive')).toHaveFocus();
  });
});

describe('Menu — selection', () => {
  it('reports the value, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderExample({ onSelect });
    await user.click(trigger());

    await user.click(item('Save'));

    expect(onSelect).toHaveBeenCalledWith('save');
    expect(queryMenu()).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('selects with Enter and with Space, because items are real buttons', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderExample({ onSelect });

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
    renderExample({ onSelect });
    await user.click(trigger());

    await user.click(item('Save as…'));

    expect(onSelect).not.toHaveBeenCalled();
    expect(menu()).toBeInTheDocument();
  });
});

describe('Menu — controlled and uncontrolled', () => {
  it('opens uncontrolled from defaultOpen', async () => {
    renderExample({ defaultOpen: true });
    await waitFor(() => expect(queryMenu()).toBeInTheDocument());
  });

  it('reports every change through openChange, once each', async () => {
    const user = userEvent.setup();
    const openChange = vi.fn();
    renderExample({ onOpenChange: openChange });

    await user.click(trigger());
    expect(openChange).toHaveBeenLastCalledWith(true);

    await user.keyboard('{Escape}');
    expect(openChange).toHaveBeenLastCalledWith(false);
    expect(openChange).toHaveBeenCalledTimes(2);
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
                MenuRoot,
                { open: open.value, 'onUpdate:open': (value: boolean) => (open.value = value) },
                () => [
                  h(MenuTrigger, null, () => 'Actions'),
                  h(MenuPositioner, null, () => [
                    h(MenuContent, null, () => [h(MenuItem, { value: 'save' }, () => 'Save')]),
                  ]),
                ],
              ),
            ]);
        },
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Open from outside' }));
    expect(menu()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryMenu()).not.toBeInTheDocument();
  });
});

describe('Menu — inside a Dialog', () => {
  const menuInDialog = () =>
    defineComponent({
      setup: () => () =>
        h(DialogRoot, { defaultOpen: true }, () => [
          h(DialogTrigger, null, () => 'Open dialog'),
          h(DialogPositioner, null, () => [
            h(DialogContent, null, () => [
              h(DialogTitle, null, () => 'Settings'),
              h(MenuRoot, null, () => [
                h(MenuTrigger, null, () => 'Actions'),
                h(MenuPositioner, null, () => [
                  h(MenuContent, null, () => [h(MenuItem, { value: 'save' }, () => 'Save')]),
                ]),
              ]),
            ]),
          ]),
        ]),
    });

  it('Escape closes the menu and leaves the dialog open', async () => {
    // The claim `docs/03` §3 decision 5 made about the dismissable layer stack,
    // finally exercised: only the topmost layer acts.
    const user = userEvent.setup();
    render(menuInDialog());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeInTheDocument());

    await user.click(trigger());
    expect(menu()).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(queryMenu()).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the dialog’s focus trap leaves the menu alone', async () => {
    const user = userEvent.setup();
    render(menuInDialog());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeInTheDocument());

    await user.click(trigger());

    expect(item('Save')).toHaveFocus();
  });
});

describe('Menu — axe', () => {
  it('has no violations while closed', async () => {
    const { container } = renderExample();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations while open', async () => {
    const user = userEvent.setup();
    const { container } = renderExample();
    await user.click(trigger());

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Menu — misuse', () => {
  it('throws for a part rendered outside the root', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      render(defineComponent({ setup: () => () => h(MenuItem, { value: 'x' }, () => 'Orphan') })),
    ).toThrow('[kanso] MenuItem must be rendered inside MenuRoot.');

    warn.mockRestore();
  });

  it('throws for a group label outside a group', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      render(
        defineComponent({
          setup: () => () =>
            h(MenuRoot, { defaultOpen: true }, () => [
              h(MenuTrigger, null, () => 'Actions'),
              h(MenuPositioner, null, () => [
                h(MenuContent, null, () => [h(MenuGroupLabel, null, () => 'Orphan')]),
              ]),
            ]),
        }),
      ),
    ).toThrow('[kanso] MenuGroupLabel must be rendered inside MenuGroup.');

    warn.mockRestore();
  });
});
