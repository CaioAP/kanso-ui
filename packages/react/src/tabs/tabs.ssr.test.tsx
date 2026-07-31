import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tabs } from './tabs';

/**
 * The id trap, locked down for a component whose ids also depend on a value.
 *
 * Core must never generate an id: a counter or a random value differs between
 * the server render and the client render, and React reports that as a
 * hydration mismatch. See CLAUDE.md rule 3.
 *
 * A mismatch is a *console error*, not a thrown exception — so a test that
 * merely renders without throwing proves nothing. These spy on the console and
 * fail if anything is logged. Two tablists render in one tree, because a single
 * one can pass with a broken id scheme: there is nothing for it to collide with.
 */

function App() {
  return (
    <main>
      <Tabs.Root defaultValue="one">
        <Tabs.List aria-label="First">
          <Tabs.Trigger value="one">One</Tabs.Trigger>
          <Tabs.Trigger value="two">Two</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="one">First panel</Tabs.Content>
        <Tabs.Content value="two">Second panel</Tabs.Content>
      </Tabs.Root>
      <Tabs.Root defaultValue="two">
        <Tabs.List aria-label="Second">
          <Tabs.Trigger value="one">One</Tabs.Trigger>
          <Tabs.Trigger value="two">Two</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="one">Third panel</Tabs.Content>
        <Tabs.Content value="two">Fourth panel</Tabs.Content>
      </Tabs.Root>
    </main>
  );
}

/** Server-render, put the markup in the DOM, hydrate over it. */
async function hydrate(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await act(async () => {
    hydrateRoot(container, <App />);
  });

  return { container, error, warn };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Tabs — server rendering', () => {
  it('renders without a DOM', () => {
    const html = renderToString(<App />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
  });

  it('renders every panel, hiding the unselected ones', () => {
    // Unmounting them would leave aria-controls dangling in the delivered HTML,
    // before any JavaScript has run.
    const html = renderToString(<App />);
    expect([...html.matchAll(/role="tabpanel"/g)]).toHaveLength(4);
    expect([...html.matchAll(/hidden/g)]).toHaveLength(2);
  });

  it('gives each instance distinct ids', () => {
    const html = renderToString(<App />);
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces the same markup twice — no counter, no randomness', () => {
    expect(renderToString(<App />)).toBe(renderToString(<App />));
  });

  it('hydrates with no mismatch logged', async () => {
    const { error, warn } = await hydrate(renderToString(<App />));

    // If this fails, read the message: React names the mismatched attribute.
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('is interactive after hydration', async () => {
    const { container } = await hydrate(renderToString(<App />));
    const [, second] = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

    await act(async () => {
      second?.click();
    });

    expect(second).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps both idrefs resolvable after hydration', async () => {
    const { container } = await hydrate(renderToString(<App />));

    for (const tab of container.querySelectorAll('[role="tab"]')) {
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      // A mismatched id scheme shows up here as a null lookup rather than as a
      // visible defect — which is exactly why it survives so long in the wild.
      const panel = container.querySelector(`#${CSS.escape(panelId as string)}`);
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    }
  });
});
