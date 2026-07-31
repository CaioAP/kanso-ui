import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';

/**
 * The id trap, and the portal trap, for a component that has both.
 *
 * Core must never generate an id: a counter or a random value differs between
 * the server render and the client render, and React reports that as a
 * hydration mismatch. See CLAUDE.md rule 3. A mismatch is a *console error*,
 * not a thrown exception, so a test that merely renders without throwing proves
 * nothing — these spy on the console and fail if anything is logged.
 *
 * The portal is the second half. `createPortal` is not supported by
 * `react-dom/server`, so the dialog renders nothing on the server and appears
 * after hydration — including a `defaultOpen` one. `docs/03` §3 decision 2
 * records that as a deliberate limitation rather than an accident, and the
 * tests below are what stop it from silently becoming an error instead.
 */

function Instance({ name, defaultOpen }: { name: string; defaultOpen?: boolean }) {
  return (
    <Dialog.Root defaultOpen={defaultOpen}>
      <Dialog.Trigger>Open {name}</Dialog.Trigger>
      <Dialog.Positioner>
        <Dialog.Backdrop />
        <Dialog.Content>
          <Dialog.Title>{name}</Dialog.Title>
          <Dialog.Description>About {name}.</Dialog.Description>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

/** Two instances, because one cannot collide with anything. */
function App({ defaultOpen }: { defaultOpen?: boolean } = {}) {
  return (
    <main>
      <Instance name="first" defaultOpen={defaultOpen} />
      <Instance name="second" />
    </main>
  );
}

/**
 * Testing Library sets this around its own `render`, and these tests do not use
 * it — they hydrate by hand. Without the flag, React logs "the current testing
 * environment is not configured to support act(...)" for the state update this
 * component makes on mount (the portal's `mounted` gate), and the console spies
 * below would report that as a hydration failure. Tabs needed no equivalent
 * because it updates no state after hydrating.
 */
beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

async function hydrate(html: string, defaultOpen?: boolean) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await act(async () => {
    hydrateRoot(container, <App defaultOpen={defaultOpen} />);
  });

  return { container, error, warn };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Dialog — server rendering', () => {
  it('renders the trigger without a DOM', () => {
    const html = renderToString(<App />);
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('renders no dialog at all, even with defaultOpen', () => {
    const html = renderToString(<App defaultOpen />);
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('data-part="positioner"');
  });

  it('gives each instance distinct ids', () => {
    const html = renderToString(<App />);
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Dialog — hydration', () => {
  it('hydrates the closed dialog with no mismatch', async () => {
    const html = renderToString(<App />);
    const { error, warn } = await hydrate(html);

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('hydrates a defaultOpen dialog with no mismatch, and mounts it after', async () => {
    // The server sent a trigger and nothing else; the client mounts the portal
    // once, after hydration. If this ever starts logging, the portal has crept
    // into the server render.
    const html = renderToString(<App defaultOpen />);
    const { error, warn } = await hydrate(html, true);

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('leaves the hydrated trigger able to open the dialog', async () => {
    // The `normalizeProps` capitalisation trap, in its Dialog form: a handler
    // that Vue or React fails to recognise as an event still *works* on a fresh
    // mount and is silently dropped on hydration, leaving the component inert.
    // Only a post-hydration interaction catches it.
    const html = renderToString(<App />);
    const { container } = await hydrate(html);

    const trigger = container.querySelector<HTMLButtonElement>('[data-part="trigger"]');
    await act(async () => {
      trigger?.click();
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
