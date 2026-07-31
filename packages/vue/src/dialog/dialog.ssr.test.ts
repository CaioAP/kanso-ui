import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import {
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from './dialog';

/**
 * Mirror of packages/react/src/dialog/dialog.ssr.test.tsx. See that file for
 * why a hydration test that only checks "did not throw" proves nothing.
 *
 * The teleport is the part specific to this component. Vue *can* render a
 * `<Teleport>` on the server, but its output is collected separately from the
 * main HTML string rather than emitted in place, so hydrating it needs
 * machinery this adapter deliberately does not carry: the dialog is gated on
 * mount and appears after hydration. `docs/03` §3 decision 2.
 */

const instance = (name: string, defaultOpen = false) =>
  h(DialogRoot, { defaultOpen }, () => [
    h(DialogTrigger, null, () => `Open ${name}`),
    h(DialogPositioner, null, () => [
      h(DialogBackdrop),
      h(DialogContent, null, () => [
        h(DialogTitle, null, () => name),
        h(DialogDescription, null, () => `About ${name}.`),
        h(DialogClose, null, () => 'Close'),
      ]),
    ]),
  ]);

/** Two instances, because one cannot collide with anything. */
const app = (defaultOpen = false) =>
  defineComponent({
    setup: () => () => h('main', [instance('first', defaultOpen), instance('second')]),
  });

async function hydrate(html: string, defaultOpen = false) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  // createSSRApp().mount() hydrates rather than replacing.
  createSSRApp(app(defaultOpen)).mount(container);
  await nextTick();

  return { container, error, warn };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Dialog — server rendering', () => {
  it('renders the trigger without a DOM', async () => {
    const html = await renderToString(createSSRApp(app()));
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('renders no dialog at all, even with defaultOpen', async () => {
    const html = await renderToString(createSSRApp(app(true)));
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('data-part="positioner"');
  });

  it('gives each instance distinct ids', async () => {
    const html = await renderToString(createSSRApp(app()));
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Dialog — hydration', () => {
  it('hydrates the closed dialog with no mismatch', async () => {
    const html = await renderToString(createSSRApp(app()));
    const { error, warn } = await hydrate(html);

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('hydrates a defaultOpen dialog with no mismatch, and mounts it after', async () => {
    const html = await renderToString(createSSRApp(app(true)));
    const { error, warn } = await hydrate(html, true);

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('leaves the hydrated trigger able to open the dialog', async () => {
    // The `normalizeProps` capitalisation trap, in its Dialog form: a handler
    // Vue fails to recognise as an event still *works* on a fresh mount and is
    // silently dropped on hydration, leaving the component inert. Only a
    // post-hydration interaction catches it. See docs/01 §4.
    const html = await renderToString(createSSRApp(app()));
    const { container } = await hydrate(html);

    const trigger = container.querySelector<HTMLButtonElement>('[data-part="trigger"]');
    trigger?.click();
    await nextTick();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
