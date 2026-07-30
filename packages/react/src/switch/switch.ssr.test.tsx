import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Switch } from './switch';

/**
 * The id trap, locked down.
 *
 * Core must never generate an id: a counter or a random value differs between
 * the server render and the client render, and React reports that as a
 * hydration mismatch. See CLAUDE.md rule 3.
 *
 * A mismatch is a *console error*, not a thrown exception — so a test that
 * merely renders without throwing proves nothing. These spy on the console and
 * fail if anything is logged. Two switches render in one tree, because a single
 * one can pass with a broken id scheme: there is nothing for it to collide with.
 */

function App() {
  return (
    <form>
      <Switch label="Notifications" name="notify" defaultChecked />
      <Switch label="Sound" />
    </form>
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

describe('Switch — server rendering', () => {
  it('renders without a DOM', () => {
    const html = renderToString(<App />);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-part="hidden-input"');
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
    const [first] = container.querySelectorAll<HTMLButtonElement>('[role="switch"]');

    await act(async () => {
      first?.click();
    });

    expect(first).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps the aria-labelledby target resolvable after hydration', async () => {
    const { container } = await hydrate(renderToString(<App />));

    for (const control of container.querySelectorAll('[role="switch"]')) {
      const labelId = control.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      // A mismatched id scheme shows up here as a null lookup rather than as a
      // visible defect — which is exactly why it survives so long in the wild.
      expect(container.querySelector(`#${CSS.escape(labelId as string)}`)).not.toBeNull();
    }
  });
});
