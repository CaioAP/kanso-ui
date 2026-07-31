import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Tabs, type TabsRootProps, TabsTrigger } from './tabs';

/**
 * Deliberately mirrored by `packages/vue/src/tabs/tabs.test.ts`, assertion for
 * assertion. A behaviour present in one adapter and missing in the other is a
 * bug, not a shortcut (CLAUDE.md rule 2) — keeping the two files parallel is
 * what makes that visible.
 */
function Example(props: Partial<TabsRootProps> = {}) {
  return (
    <Tabs.Root defaultValue="one" {...props}>
      <Tabs.List aria-label="Sections">
        <Tabs.Trigger value="one">One</Tabs.Trigger>
        <Tabs.Trigger value="two">Two</Tabs.Trigger>
        <Tabs.Trigger value="three">Three</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="one">First panel</Tabs.Content>
      <Tabs.Content value="two">Second panel</Tabs.Content>
      <Tabs.Content value="three">Third panel</Tabs.Content>
    </Tabs.Root>
  );
}

const tabs = () => screen.getAllByRole('tab');
const list = () => screen.getByRole('tablist');
const root = () => document.querySelector('[data-part="root"]') as HTMLElement;
const panels = () => Array.from(document.querySelectorAll<HTMLElement>('[data-part="content"]'));
const tabIndexes = () => tabs().map((tab) => tab.tabIndex);
const selected = () => tabs().map((tab) => tab.getAttribute('aria-selected'));

describe('Tabs — rendering', () => {
  it('uses the native roles', () => {
    render(<Example />);
    expect(list()).toBeInTheDocument();
    expect(tabs()).toHaveLength(3);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('First panel');
  });

  it('uses native buttons, so Enter and Space come free', () => {
    render(<Example />);
    for (const tab of tabs()) {
      expect(tab.tagName).toBe('BUTTON');
      expect(tab).toHaveAttribute('type', 'button');
    }
  });

  it('marks the root and only the root with data-kanso', () => {
    render(<Example />);
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(root()).toHaveAttribute('data-kanso');
  });

  it('names every part', () => {
    render(<Example />);
    expect(root()).toHaveAttribute('data-part', 'root');
    expect(list()).toHaveAttribute('data-part', 'list');
    expect(tabs()[0]).toHaveAttribute('data-part', 'trigger');
    expect(panels()[0]).toHaveAttribute('data-part', 'content');
  });

  it('passes className and arbitrary attributes through to each part', () => {
    render(
      <Tabs.Root defaultValue="one" className="mine" data-testid="root">
        <Tabs.List className="list-class">
          <Tabs.Trigger value="one" className="trigger-class">
            One
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="one" className="content-class">
          Panel
        </Tabs.Content>
      </Tabs.Root>,
    );
    expect(root()).toHaveClass('mine');
    expect(root()).toHaveAttribute('data-testid', 'root');
    expect(list()).toHaveClass('list-class');
    expect(tabs()[0]).toHaveClass('trigger-class');
    expect(screen.getByRole('tabpanel')).toHaveClass('content-class');
  });

  it('puts a consumer id on the root verbatim and derives the rest', () => {
    render(<Example id="settings" />);
    expect(root()).toHaveAttribute('id', 'settings');
    expect(list()).toHaveAttribute('id', 'settings-list');
    expect(tabs()[0]).toHaveAttribute('id', 'settings-trigger-one');
  });

  it('encodes values that are not id-safe', () => {
    // Unencoded, `aria-controls="…-content-my tab"` is read as two idrefs.
    render(
      <Tabs.Root defaultValue="my tab" id="t">
        <Tabs.List>
          <Tabs.Trigger value="my tab">One</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="my tab">Panel</Tabs.Content>
      </Tabs.Root>,
    );
    expect(tabs()[0]).toHaveAttribute('id', 't-trigger-my%20tab');
    expect(tabs()[0]).toHaveAttribute('aria-controls', 't-content-my%20tab');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 't-content-my%20tab');
  });

  it('refuses to render a part outside the root', () => {
    // The alternative is a TypeError from inside a prop getter, which names
    // nothing the consumer can act on.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TabsTrigger value="one">One</TabsTrigger>)).toThrow(
      /must be rendered inside/,
    );
    error.mockRestore();
  });
});

describe('Tabs — ARIA wiring', () => {
  it('links every trigger to its panel, both ways', () => {
    render(<Example />);
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
    render(<Example />);
    expect(panels()).toHaveLength(3);
  });

  it('hides the unselected panels', () => {
    render(<Example />);
    expect(panels()[0]).not.toHaveAttribute('hidden');
    expect(panels()[1]).toHaveAttribute('hidden');
    expect(panels()[2]).toHaveAttribute('hidden');
  });

  it('makes the panel focusable, for panels with nothing focusable inside', () => {
    render(<Example />);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
  });

  it('announces the orientation on the list', () => {
    render(<Example />);
    expect(list()).toHaveAttribute('aria-orientation', 'horizontal');

    render(<Example orientation="vertical" id="v" />);
    expect(document.getElementById('v-list')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('reflects orientation as a data attribute on every part', () => {
    render(<Example orientation="vertical" />);
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
    render(<Example />);
    expect(tabIndexes()).toEqual([0, -1, -1]);
  });

  it('moves the tab stop with the selection', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(tabs()[1] as HTMLElement);
    expect(tabIndexes()).toEqual([-1, 0, -1]);
  });

  it('leaves no tab stop when nothing is selected', () => {
    render(<Example defaultValue={undefined} />);
    expect(tabIndexes()).toEqual([-1, -1, -1]);
  });

  it('lets Tab skip the rest of the list and land in the panel', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    expect(tabs()[0]).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });
});

describe('Tabs — uncontrolled', () => {
  it('honours defaultValue', () => {
    render(<Example defaultValue="two" />);
    expect(selected()).toEqual(['false', 'true', 'false']);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Second panel');
  });

  it('selects on click and reports the change', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);

    await user.click(tabs()[2] as HTMLElement);

    expect(selected()).toEqual(['false', 'false', 'true']);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('three');
  });

  it('stays quiet when the selected tab is clicked again', () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    (tabs()[0] as HTMLElement).click();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('reflects selection as data-state on trigger and panel', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(tabs()[1] as HTMLElement);

    expect(tabs()[1]).toHaveAttribute('data-state', 'active');
    expect(tabs()[0]).toHaveAttribute('data-state', 'inactive');
    expect(panels()[1]).toHaveAttribute('data-state', 'active');
  });
});

describe('Tabs — controlled', () => {
  function Controlled() {
    const [value, setValue] = useState('one');
    return (
      <>
        <output>{value}</output>
        <Example value={value} onValueChange={setValue} />
      </>
    );
  }

  it('follows the consumer', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(tabs()[1] as HTMLElement);

    expect(screen.getByRole('status')).toHaveTextContent('two');
    expect(selected()).toEqual(['false', 'true', 'false']);
  });

  it('does not move on its own when the consumer ignores the change', async () => {
    const user = userEvent.setup();
    render(<Example value="one" onValueChange={() => {}} />);

    await user.click(tabs()[1] as HTMLElement);

    expect(selected()).toEqual(['true', 'false', 'false']);
  });
});

describe('Tabs — keyboard, horizontal', () => {
  const setup = async (props: Partial<TabsRootProps> = {}) => {
    const user = userEvent.setup();
    render(<Example {...props} />);
    (tabs()[0] as HTMLElement).focus();
    return user;
  };

  it('ArrowRight moves to the next tab', async () => {
    const user = await setup();
    await user.keyboard('{ArrowRight}');
    expect(tabs()[1]).toHaveFocus();
  });

  it('ArrowLeft moves to the previous tab', async () => {
    const user = await setup();
    await user.keyboard('{ArrowRight}{ArrowLeft}');
    expect(tabs()[0]).toHaveFocus();
  });

  it('Home and End jump to the ends', async () => {
    const user = await setup();
    await user.keyboard('{End}');
    expect(tabs()[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(tabs()[0]).toHaveFocus();
  });

  it('wraps past the ends by default', async () => {
    const user = await setup();
    await user.keyboard('{ArrowLeft}');
    expect(tabs()[2]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(tabs()[0]).toHaveFocus();
  });

  it('stops at the ends when loop is off', async () => {
    const user = await setup({ loop: false });
    await user.keyboard('{ArrowLeft}');
    expect(tabs()[0]).toHaveFocus();
    await user.keyboard('{End}{ArrowRight}');
    expect(tabs()[2]).toHaveFocus();
  });

  it('leaves the block arrows alone', async () => {
    const user = await setup();
    await user.keyboard('{ArrowDown}');
    expect(tabs()[0]).toHaveFocus();
    expect(selected()).toEqual(['true', 'false', 'false']);
  });

  it('Enter and Space select the focused tab', async () => {
    // Both arrive as a click on a real <button>, which is why core adds no
    // keydown branch for them.
    const user = await setup({ activationMode: 'manual' });
    await user.keyboard('{ArrowRight}{Enter}');
    expect(selected()).toEqual(['false', 'true', 'false']);

    await user.keyboard('{ArrowRight}[Space]');
    expect(selected()).toEqual(['false', 'false', 'true']);
  });
});

describe('Tabs — keyboard, vertical', () => {
  const setup = async () => {
    const user = userEvent.setup();
    render(<Example orientation="vertical" />);
    (tabs()[0] as HTMLElement).focus();
    return user;
  };

  it('ArrowDown moves to the next tab', async () => {
    const user = await setup();
    await user.keyboard('{ArrowDown}');
    expect(tabs()[1]).toHaveFocus();
  });

  it('ArrowUp moves to the previous tab', async () => {
    const user = await setup();
    await user.keyboard('{ArrowDown}{ArrowUp}');
    expect(tabs()[0]).toHaveFocus();
  });

  it('Home and End still work', async () => {
    const user = await setup();
    await user.keyboard('{End}');
    expect(tabs()[2]).toHaveFocus();
  });

  it('leaves the inline arrows alone', async () => {
    const user = await setup();
    await user.keyboard('{ArrowRight}');
    expect(tabs()[0]).toHaveFocus();
  });
});

describe('Tabs — activation mode', () => {
  it('selects as focus arrives, in automatic mode', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    (tabs()[0] as HTMLElement).focus();

    await user.keyboard('{ArrowRight}');

    expect(tabs()[1]).toHaveFocus();
    expect(selected()).toEqual(['false', 'true', 'false']);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('two');
  });

  it('moves focus without selecting, in manual mode', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example activationMode="manual" onValueChange={onValueChange} />);
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
    render(<Example onValueChange={onValueChange} />);
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
    render(<Example activationMode="manual" />);
    (tabs()[0] as HTMLElement).focus();

    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(tabs()[2]).toHaveFocus();
    expect(tabIndexes()).toEqual([0, -1, -1]);
  });
});

describe('Tabs — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<Example />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when vertical', async () => {
    const { container } = render(<Example orientation="vertical" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with nothing selected', async () => {
    const { container } = render(<Example defaultValue={undefined} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
