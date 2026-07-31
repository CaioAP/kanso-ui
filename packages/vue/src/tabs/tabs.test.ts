import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { defineComponent, h, ref } from 'vue';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from './tabs';

/**
 * Deliberately a mirror of packages/react/src/tabs/tabs.test.tsx.
 *
 * The thesis is that behaviour lives once in core and the frameworks are skins.
 * The way that claim stays true is that a behaviour present in one adapter and
 * missing from the other shows up here as a failing test, not as a shrug.
 */

type RootProps = Record<string, unknown>;

const example = (props: RootProps = {}, attrs: RootProps = {}) =>
  defineComponent({
    setup: () => () =>
      h(TabsRoot, { defaultValue: 'one', ...props, ...attrs }, () => [
        h(TabsList, { 'aria-label': 'Sections' }, () => [
          h(TabsTrigger, { value: 'one' }, () => 'One'),
          h(TabsTrigger, { value: 'two' }, () => 'Two'),
          h(TabsTrigger, { value: 'three' }, () => 'Three'),
        ]),
        h(TabsContent, { value: 'one' }, () => 'First panel'),
        h(TabsContent, { value: 'two' }, () => 'Second panel'),
        h(TabsContent, { value: 'three' }, () => 'Third panel'),
      ]),
  });

const renderExample = (props: RootProps = {}, attrs: RootProps = {}) =>
  render(example(props, attrs));

const tabs = () => screen.getAllByRole('tab');
const list = () => screen.getByRole('tablist');
const root = () => document.querySelector('[data-part="root"]') as HTMLElement;
const panels = () => Array.from(document.querySelectorAll<HTMLElement>('[data-part="content"]'));
const tabIndexes = () => tabs().map((tab) => tab.tabIndex);
const selected = () => tabs().map((tab) => tab.getAttribute('aria-selected'));

describe('Tabs — rendering', () => {
  it('uses the native roles', () => {
    renderExample();
    expect(list()).toBeInTheDocument();
    expect(tabs()).toHaveLength(3);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('First panel');
  });

  it('uses native buttons, so Enter and Space come free', () => {
    renderExample();
    for (const tab of tabs()) {
      expect(tab.tagName).toBe('BUTTON');
      expect(tab).toHaveAttribute('type', 'button');
    }
  });

  it('marks the root and only the root with data-kanso', () => {
    renderExample();
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(root()).toHaveAttribute('data-kanso');
  });

  it('names every part', () => {
    renderExample();
    expect(root()).toHaveAttribute('data-part', 'root');
    expect(list()).toHaveAttribute('data-part', 'list');
    expect(tabs()[0]).toHaveAttribute('data-part', 'trigger');
    expect(panels()[0]).toHaveAttribute('data-part', 'content');
  });

  it('passes class and arbitrary attributes through to each part', () => {
    render(
      defineComponent({
        setup: () => () =>
          h(TabsRoot, { defaultValue: 'one', class: 'mine', 'data-testid': 'root' }, () => [
            h(TabsList, { class: 'list-class' }, () => [
              h(TabsTrigger, { value: 'one', class: 'trigger-class' }, () => 'One'),
            ]),
            h(TabsContent, { value: 'one', class: 'content-class' }, () => 'Panel'),
          ]),
      }),
    );
    expect(root()).toHaveClass('mine');
    expect(root()).toHaveAttribute('data-testid', 'root');
    expect(list()).toHaveClass('list-class');
    expect(tabs()[0]).toHaveClass('trigger-class');
    expect(screen.getByRole('tabpanel')).toHaveClass('content-class');
  });

  it('puts a consumer id on the root verbatim and derives the rest', () => {
    renderExample({ id: 'settings' });
    expect(root()).toHaveAttribute('id', 'settings');
    expect(list()).toHaveAttribute('id', 'settings-list');
    expect(tabs()[0]).toHaveAttribute('id', 'settings-trigger-one');
  });

  it('encodes values that are not id-safe', () => {
    // Unencoded, `aria-controls="…-content-my tab"` is read as two idrefs.
    render(
      defineComponent({
        setup: () => () =>
          h(TabsRoot, { defaultValue: 'my tab', id: 't' }, () => [
            h(TabsList, null, () => [h(TabsTrigger, { value: 'my tab' }, () => 'One')]),
            h(TabsContent, { value: 'my tab' }, () => 'Panel'),
          ]),
      }),
    );
    expect(tabs()[0]).toHaveAttribute('id', 't-trigger-my%20tab');
    expect(tabs()[0]).toHaveAttribute('aria-controls', 't-content-my%20tab');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 't-content-my%20tab');
  });

  it('refuses to render a part outside the root', () => {
    // The alternative is a TypeError from inside a prop getter, which names
    // nothing the consumer can act on.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      render(
        defineComponent({
          setup: () => () => h(TabsTrigger, { value: 'one' }, () => 'One'),
        }),
      ),
    ).toThrow(/must be rendered inside/);
    error.mockRestore();
    warn.mockRestore();
  });
});

describe('Tabs — ARIA wiring', () => {
  it('links every trigger to its panel, both ways', () => {
    renderExample();
    for (const tab of tabs()) {
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      const panel = document.getElementById(panelId as string);
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    }
  });

  it('keeps unselected panels mounted, so aria-controls never dangles', () => {
    // docs/03 §2 decision 1. axe reports an unresolvable aria-controls as
    // *incomplete*, not a violation, so only this assertion catches it.
    renderExample();
    expect(panels()).toHaveLength(3);
  });

  it('hides the unselected panels', () => {
    renderExample();
    expect(panels()[0]).not.toHaveAttribute('hidden');
    expect(panels()[1]).toHaveAttribute('hidden');
    expect(panels()[2]).toHaveAttribute('hidden');
  });

  it('makes the panel focusable, for panels with nothing focusable inside', () => {
    renderExample();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
  });

  it('announces the orientation on the list', () => {
    renderExample();
    expect(list()).toHaveAttribute('aria-orientation', 'horizontal');

    renderExample({ orientation: 'vertical', id: 'v' });
    expect(document.getElementById('v-list')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('reflects orientation as a data attribute on every part', () => {
    renderExample({ orientation: 'vertical' });
    expect(root()).toHaveAttribute('data-orientation', 'vertical');
    expect(list()).toHaveAttribute('data-orientation', 'vertical');
    expect(tabs()[0]).toHaveAttribute('data-orientation', 'vertical');
    expect(panels()[0]).toHaveAttribute('data-orientation', 'vertical');
  });
});

describe('Tabs — roving tabindex', () => {
  it('gives the tab stop to the selected trigger alone', () => {
    // Every tab at tabindex 0 would make Tab walk the whole list — the bug
    // docs/03 §2 names.
    renderExample();
    expect(tabIndexes()).toEqual([0, -1, -1]);
  });

  it('moves the tab stop with the selection', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(tabs()[1] as HTMLElement);
    expect(tabIndexes()).toEqual([-1, 0, -1]);
  });

  it('leaves no tab stop when nothing is selected', () => {
    renderExample({ defaultValue: undefined });
    expect(tabIndexes()).toEqual([-1, -1, -1]);
  });

  it('lets Tab skip the rest of the list and land in the panel', async () => {
    const user = userEvent.setup();
    renderExample();

    await user.tab();
    expect(tabs()[0]).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });
});

describe('Tabs — uncontrolled', () => {
  it('honours defaultValue', () => {
    renderExample({ defaultValue: 'two' });
    expect(selected()).toEqual(['false', 'true', 'false']);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Second panel');
  });

  it('selects on click and reports the change', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderExample({ onValueChange });

    await user.click(tabs()[2] as HTMLElement);

    expect(selected()).toEqual(['false', 'false', 'true']);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('three');
  });

  it('stays quiet when the selected tab is clicked again', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderExample({ onValueChange });

    await user.click(tabs()[0] as HTMLElement);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('reflects selection as data-state on trigger and panel', async () => {
    const user = userEvent.setup();
    renderExample();
    await user.click(tabs()[1] as HTMLElement);

    expect(tabs()[1]).toHaveAttribute('data-state', 'active');
    expect(tabs()[0]).toHaveAttribute('data-state', 'inactive');
    expect(panels()[1]).toHaveAttribute('data-state', 'active');
  });
});

describe('Tabs — controlled', () => {
  const Controlled = defineComponent({
    setup() {
      const value = ref('one');
      return () =>
        h('div', [
          h('output', value.value),
          h(
            TabsRoot,
            {
              modelValue: value.value,
              'onUpdate:modelValue': (next: string) => {
                value.value = next;
              },
            },
            () => [
              h(TabsList, { 'aria-label': 'Sections' }, () => [
                h(TabsTrigger, { value: 'one' }, () => 'One'),
                h(TabsTrigger, { value: 'two' }, () => 'Two'),
                h(TabsTrigger, { value: 'three' }, () => 'Three'),
              ]),
              h(TabsContent, { value: 'one' }, () => 'First panel'),
              h(TabsContent, { value: 'two' }, () => 'Second panel'),
              h(TabsContent, { value: 'three' }, () => 'Third panel'),
            ],
          ),
        ]);
    },
  });

  it('follows the consumer through v-model', async () => {
    const user = userEvent.setup();
    render(Controlled);

    await user.click(tabs()[1] as HTMLElement);

    expect(screen.getByRole('status')).toHaveTextContent('two');
    expect(selected()).toEqual(['false', 'true', 'false']);
  });

  it('does not move on its own when the consumer ignores the change', async () => {
    const user = userEvent.setup();
    renderExample({ value: 'one', onValueChange: () => {} });

    await user.click(tabs()[1] as HTMLElement);

    expect(selected()).toEqual(['true', 'false', 'false']);
  });
});

describe('Tabs — keyboard, horizontal', () => {
  const setup = (props: RootProps = {}) => {
    const user = userEvent.setup();
    renderExample(props);
    (tabs()[0] as HTMLElement).focus();
    return user;
  };

  it('ArrowRight moves to the next tab', async () => {
    const user = setup();
    await user.keyboard('{ArrowRight}');
    expect(tabs()[1]).toHaveFocus();
  });

  it('ArrowLeft moves to the previous tab', async () => {
    const user = setup();
    await user.keyboard('{ArrowRight}{ArrowLeft}');
    expect(tabs()[0]).toHaveFocus();
  });

  it('Home and End jump to the ends', async () => {
    const user = setup();
    await user.keyboard('{End}');
    expect(tabs()[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(tabs()[0]).toHaveFocus();
  });

  it('wraps past the ends by default', async () => {
    const user = setup();
    await user.keyboard('{ArrowLeft}');
    expect(tabs()[2]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(tabs()[0]).toHaveFocus();
  });

  it('stops at the ends when loop is off', async () => {
    const user = setup({ loop: false });
    await user.keyboard('{ArrowLeft}');
    expect(tabs()[0]).toHaveFocus();
    await user.keyboard('{End}{ArrowRight}');
    expect(tabs()[2]).toHaveFocus();
  });

  it('leaves the block arrows alone', async () => {
    const user = setup();
    await user.keyboard('{ArrowDown}');
    expect(tabs()[0]).toHaveFocus();
    expect(selected()).toEqual(['true', 'false', 'false']);
  });

  it('Enter and Space select the focused tab', async () => {
    // Both arrive as a click on a real <button>, which is why core adds no
    // keydown branch for them.
    const user = setup({ activationMode: 'manual' });
    await user.keyboard('{ArrowRight}{Enter}');
    expect(selected()).toEqual(['false', 'true', 'false']);

    await user.keyboard('{ArrowRight}[Space]');
    expect(selected()).toEqual(['false', 'false', 'true']);
  });
});

describe('Tabs — keyboard, vertical', () => {
  const setup = () => {
    const user = userEvent.setup();
    renderExample({ orientation: 'vertical' });
    (tabs()[0] as HTMLElement).focus();
    return user;
  };

  it('ArrowDown moves to the next tab', async () => {
    const user = setup();
    await user.keyboard('{ArrowDown}');
    expect(tabs()[1]).toHaveFocus();
  });

  it('ArrowUp moves to the previous tab', async () => {
    const user = setup();
    await user.keyboard('{ArrowDown}{ArrowUp}');
    expect(tabs()[0]).toHaveFocus();
  });

  it('Home and End still work', async () => {
    const user = setup();
    await user.keyboard('{End}');
    expect(tabs()[2]).toHaveFocus();
  });

  it('leaves the inline arrows alone', async () => {
    const user = setup();
    await user.keyboard('{ArrowRight}');
    expect(tabs()[0]).toHaveFocus();
  });
});

describe('Tabs — activation mode', () => {
  it('selects as focus arrives, in automatic mode', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderExample({ onValueChange });
    (tabs()[0] as HTMLElement).focus();

    await user.keyboard('{ArrowRight}');

    expect(tabs()[1]).toHaveFocus();
    expect(selected()).toEqual(['false', 'true', 'false']);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('two');
  });

  it('moves focus without selecting, in manual mode', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderExample({ activationMode: 'manual', onValueChange });
    (tabs()[0] as HTMLElement).focus();

    await user.keyboard('{ArrowRight}');

    expect(tabs()[1]).toHaveFocus();
    expect(selected()).toEqual(['true', 'false', 'false']);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  // The cost the docs page has to teach: this is why `manual` exists.
  it('fires once per tab arrowed past, in automatic mode', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderExample({ onValueChange });
    (tabs()[0] as HTMLElement).focus();

    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenNthCalledWith(1, 'two');
    expect(onValueChange).toHaveBeenNthCalledWith(2, 'three');
  });

  // The manual-mode consequence of having no `focusedValue` in state: the tab
  // stop marks the selection, not wherever focus last wandered. docs/03 §2.
  it('returns the tab stop to the selected tab after arrowing away in manual mode', async () => {
    const user = userEvent.setup();
    renderExample({ activationMode: 'manual' });
    (tabs()[0] as HTMLElement).focus();

    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(tabs()[2]).toHaveFocus();
    expect(tabIndexes()).toEqual([0, -1, -1]);
  });
});

describe('Tabs — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderExample();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when vertical', async () => {
    const { container } = renderExample({ orientation: 'vertical' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with nothing selected', async () => {
    const { container } = renderExample({ defaultValue: undefined });
    expect(await axe(container)).toHaveNoViolations();
  });
});
