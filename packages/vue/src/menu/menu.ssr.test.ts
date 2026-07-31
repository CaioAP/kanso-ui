import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import {
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPositioner,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from './menu';

/**
 * Mirror of packages/react/src/menu/menu.ssr.test.tsx. See that file for why a
 * hydration test that only checks "did not throw" proves nothing.
 *
 * Menu adds a second source of ids — every `MenuGroup` mints one for its label
 * — which is exactly the kind of thing that works until two menus exist.
 */

const instance = (name: string) =>
  h(MenuRoot, null, () => [
    h(MenuTrigger, null, () => name),
    h(MenuPositioner, null, () => [
      h(MenuContent, null, () => [
        h(MenuItem, { value: 'save' }, () => 'Save'),
        h(MenuSeparator),
        h(MenuGroup, null, () => [
          h(MenuGroupLabel, null, () => 'Danger'),
          h(MenuItem, { value: 'delete' }, () => 'Delete'),
        ]),
      ]),
    ]),
  ]);

/** Two instances, because one cannot collide with anything. */
const app = () =>
  defineComponent({
    setup: () => () => h('main', [instance('First'), instance('Second')]),
  });

async function hydrate(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  // createSSRApp().mount() hydrates rather than replacing.
  createSSRApp(app()).mount(container);
  await nextTick();

  return { container, error, warn };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Menu — server rendering', () => {
  it('renders the trigger without a DOM', async () => {
    const html = await renderToString(createSSRApp(app()));
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-scope="menu"');
  });

  it('renders no menu content while closed', async () => {
    const html = await renderToString(createSSRApp(app()));
    expect(html).not.toContain('role="menu"');
    expect(html).not.toContain('role="menuitem"');
  });

  it('gives each instance distinct ids', async () => {
    const html = await renderToString(createSSRApp(app()));
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces the same markup twice — no counter, no randomness', async () => {
    const first = await renderToString(createSSRApp(app()));
    const second = await renderToString(createSSRApp(app()));
    expect(first).toBe(second);
  });
});

describe('Menu — hydration', () => {
  it('hydrates with no mismatch logged', async () => {
    const html = await renderToString(createSSRApp(app()));
    const { error, warn } = await hydrate(html);

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('is interactive after hydration', async () => {
    // The `normalizeProps` capitalisation trap in its Menu form: a handler Vue
    // fails to recognise as an event works on a fresh mount and is silently
    // dropped on hydration, leaving the trigger inert. See docs/01 §4.
    const html = await renderToString(createSSRApp(app()));
    const { container } = await hydrate(html);

    const trigger = container.querySelector<HTMLButtonElement>('[data-part="trigger"]');
    trigger?.click();
    await nextTick();

    expect(container.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('keeps the group label idref resolvable after hydration', async () => {
    const html = await renderToString(createSSRApp(app()));
    const { container } = await hydrate(html);

    const trigger = container.querySelector<HTMLButtonElement>('[data-part="trigger"]');
    trigger?.click();
    await nextTick();

    const group = container.querySelector('[role="group"]');
    const labelId = group?.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(container.querySelector(`#${CSS.escape(labelId as string)}`)).not.toBeNull();
  });
});
