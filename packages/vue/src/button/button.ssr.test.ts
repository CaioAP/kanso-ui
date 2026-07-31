import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Button } from './button';

/** Mirror of packages/react/src/button/button.ssr.test.tsx. */

const App = defineComponent({
  setup: () => () =>
    h('form', [
      h(Button, { type: 'submit' }, { default: () => 'Save' }),
      h(Button, { variant: 'outline', size: 'sm', loading: true }, { default: () => 'Publishing' }),
    ]),
});

async function hydrate(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  createSSRApp(App).mount(container);

  return { container, error, warn };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Button — server rendering', () => {
  it('renders without a DOM', async () => {
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('type="submit"');
    expect(html).toContain('data-variant="outline"');
    expect(html).toContain('aria-busy="true"');
  });

  it('keeps the accessible name in the server HTML while loading', async () => {
    expect(await renderToString(createSSRApp(App))).toContain('Publishing');
  });

  it('hydrates with no mismatch logged', async () => {
    const { error, warn } = await hydrate(await renderToString(createSSRApp(App)));
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
