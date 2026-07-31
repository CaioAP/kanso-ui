import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Button } from './button';

/**
 * Button has no ids and no state, so the interesting question here is not the
 * id trap — it is whether the attributes core emits survive the round trip
 * identically in both directions. See switch.ssr.test.tsx for why a hydration
 * test that only checks "did not throw" proves nothing.
 */

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function App() {
  return (
    <form>
      <Button type="submit">Save</Button>
      <Button variant="outline" size="sm" loading>
        Publishing
      </Button>
    </form>
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

describe('Button — server rendering', () => {
  it('renders without a DOM', () => {
    const html = renderToString(<App />);
    expect(html).toContain('type="submit"');
    expect(html).toContain('data-variant="outline"');
    expect(html).toContain('aria-busy="true"');
  });

  it('keeps the accessible name in the server HTML while loading', () => {
    expect(renderToString(<App />)).toContain('Publishing');
  });

  it('hydrates with no mismatch logged', async () => {
    const { error, warn } = await hydrate(renderToString(<App />));
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
