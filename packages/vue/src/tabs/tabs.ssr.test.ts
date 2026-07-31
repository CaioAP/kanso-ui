import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from './tabs';

/**
 * Mirror of packages/react/src/tabs/tabs.ssr.test.tsx. See that file for why a
 * hydration test that only checks "did not throw" proves nothing.
 *
 * There is a second thing under test here that Switch had no equivalent of. The
 * api reaches the child parts through `provide`, and what is provided is a
 * `computed` — provide the api object itself and children hold the state as it
 * was at mount, which looks correct until something changes. Hydration is where
 * that would show, because the handlers are bound from what the children see.
 */

const tablist = (label: string, defaultValue: string) =>
  h(TabsRoot, { defaultValue }, () => [
    h(TabsList, { 'aria-label': label }, () => [
      h(TabsTrigger, { value: 'one' }, () => 'One'),
      h(TabsTrigger, { value: 'two' }, () => 'Two'),
    ]),
    h(TabsContent, { value: 'one' }, () => `${label} first panel`),
    h(TabsContent, { value: 'two' }, () => `${label} second panel`),
  ]);

const App = defineComponent({
  setup: () => () => h('main', [tablist('First', 'one'), tablist('Second', 'two')]),
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

describe('Tabs — server rendering', () => {
  it('renders without a DOM', async () => {
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
  });

  it('renders every panel, hiding the unselected ones', async () => {
    // Unmounting them would leave aria-controls dangling in the delivered HTML,
    // before any JavaScript has run.
    const html = await renderToString(createSSRApp(App));
    expect([...html.matchAll(/role="tabpanel"/g)]).toHaveLength(4);
    expect([...html.matchAll(/hidden/g)]).toHaveLength(2);
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
    const [, second] = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

    second?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(second).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps both idrefs resolvable after hydration', async () => {
    const { container } = await hydrate(await renderToString(createSSRApp(App)));

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
