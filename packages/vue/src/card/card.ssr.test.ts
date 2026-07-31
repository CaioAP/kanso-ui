import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Card } from './card';

/** Mirror of packages/react/src/card/card.ssr.test.tsx. */

const App = defineComponent({
  setup: () => () =>
    h(
      Card.Root,
      { as: 'article' },
      {
        default: () => [
          h(Card.Header, null, { default: () => 'Kanso' }),
          h(Card.Body, null, { default: () => 'Simplicity through the elimination of clutter.' }),
          h(Card.Footer, null, { default: () => h('a', { href: '/read' }, 'Read more') }),
        ],
      },
    ),
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Card — server rendering', () => {
  it('renders every part without a DOM', async () => {
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('<article');
    expect(html).toContain('data-part="header"');
    expect(html).toContain('data-part="body"');
    expect(html).toContain('data-part="footer"');
  });

  it('hydrates with no mismatch logged', async () => {
    const container = document.createElement('div');
    container.innerHTML = await renderToString(createSSRApp(App));
    document.body.appendChild(container);

    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createSSRApp(App).mount(container);

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
