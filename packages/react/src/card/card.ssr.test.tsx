import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Card } from './card';

/**
 * Card has no ids and no state, so this is the smallest SSR test in the
 * library — and it is still here, because `docs/00` §8 makes one a condition of
 * "done" and because "this component cannot possibly break hydration" is the
 * kind of claim that is cheap to check and embarrassing to be wrong about.
 */

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function App() {
  return (
    <Card.Root as="article">
      <Card.Header>Kanso</Card.Header>
      <Card.Body>Simplicity through the elimination of clutter.</Card.Body>
      <Card.Footer>
        <a href="/read">Read more</a>
      </Card.Footer>
    </Card.Root>
  );
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Card — server rendering', () => {
  it('renders every part without a DOM', () => {
    const html = renderToString(<App />);
    expect(html).toContain('<article');
    expect(html).toContain('data-part="header"');
    expect(html).toContain('data-part="body"');
    expect(html).toContain('data-part="footer"');
  });

  it('hydrates with no mismatch logged', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<App />);
    document.body.appendChild(container);

    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await act(async () => {
      hydrateRoot(container, <App />);
    });

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
