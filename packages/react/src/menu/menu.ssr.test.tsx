import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Menu } from './menu';

/**
 * The id trap, for the last component that introduces new ids.
 *
 * Core must never generate an id: a counter or a random value differs between
 * the server render and the client render, and React reports that as a
 * hydration mismatch (CLAUDE.md rule 3). A mismatch is a *console error*, not a
 * thrown exception, so these spy on the console and fail if anything is logged.
 *
 * Menu adds a second source of ids — every `Menu.Group` mints one for its label
 * — which is exactly the kind of thing that works until two menus exist.
 */

function Instance({ name }: { name: string }) {
  return (
    <Menu.Root>
      <Menu.Trigger>{name}</Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content>
          <Menu.Item value="save">Save</Menu.Item>
          <Menu.Separator />
          <Menu.Group>
            <Menu.GroupLabel>Danger</Menu.GroupLabel>
            <Menu.Item value="delete">Delete</Menu.Item>
          </Menu.Group>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}

/** Two instances, because one cannot collide with anything. */
function App() {
  return (
    <main>
      <Instance name="First" />
      <Instance name="Second" />
    </main>
  );
}

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

describe('Menu — server rendering', () => {
  it('renders the trigger without a DOM', () => {
    const html = renderToString(<App />);
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-scope="menu"');
  });

  it('renders no menu content while closed', () => {
    const html = renderToString(<App />);
    expect(html).not.toContain('role="menu"');
    expect(html).not.toContain('role="menuitem"');
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
});

describe('Menu — hydration', () => {
  it('hydrates with no mismatch logged', async () => {
    const { error, warn } = await hydrate(renderToString(<App />));

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('is interactive after hydration', async () => {
    // The `normalizeProps` capitalisation trap in its Menu form: a handler the
    // framework fails to recognise as an event works on a fresh mount and is
    // silently dropped on hydration, leaving the trigger inert.
    const { container } = await hydrate(renderToString(<App />));

    const trigger = container.querySelector<HTMLButtonElement>('[data-part="trigger"]');
    await act(async () => {
      trigger?.click();
    });

    expect(container.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('keeps the group label idref resolvable after hydration', async () => {
    const { container } = await hydrate(renderToString(<App />));

    const trigger = container.querySelector<HTMLButtonElement>('[data-part="trigger"]');
    await act(async () => {
      trigger?.click();
    });

    const group = container.querySelector('[role="group"]');
    const labelId = group?.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(container.querySelector(`#${CSS.escape(labelId as string)}`)).not.toBeNull();
  });
});
