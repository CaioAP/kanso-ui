import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Switch } from './switch';

/**
 * Mirror of packages/react/src/switch/switch.ssr.test.tsx. See that file for
 * why a hydration test that only checks "did not throw" proves nothing.
 */

const App = defineComponent({
  setup: () => () =>
    h('form', [
      h(Switch, { label: 'Notifications', name: 'notify', defaultChecked: true }),
      h(Switch, { label: 'Sound' }),
    ]),
});

async function hydrate(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  // createSSRApp().mount() hydrates rather than replacing.
  createSSRApp(App).mount(container);

  return { container, error, warn };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Switch — server rendering', () => {
  it('renders without a DOM', async () => {
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-part="hidden-input"');
  });

  it('gives each instance distinct ids', async () => {
    const html = await renderToString(createSSRApp(App));
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces the same markup twice — no counter, no randomness', async () => {
    const first = await renderToString(createSSRApp(App));
    const second = await renderToString(createSSRApp(App));
    expect(first).toBe(second);
  });

  it('hydrates with no mismatch logged', async () => {
    const { error, warn } = await hydrate(await renderToString(createSSRApp(App)));

    // If this fails, read the message: Vue names the mismatched node.
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('is interactive after hydration', async () => {
    const { container } = await hydrate(await renderToString(createSSRApp(App)));
    const first = container.querySelector<HTMLButtonElement>('[role="switch"]');

    first?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(first).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps the aria-labelledby target resolvable after hydration', async () => {
    const { container } = await hydrate(await renderToString(createSSRApp(App)));

    for (const control of container.querySelectorAll('[role="switch"]')) {
      const labelId = control.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      // A mismatched id scheme shows up here as a null lookup rather than as a
      // visible defect — which is exactly why it survives so long in the wild.
      expect(container.querySelector(`#${CSS.escape(labelId as string)}`)).not.toBeNull();
    }
  });
});
