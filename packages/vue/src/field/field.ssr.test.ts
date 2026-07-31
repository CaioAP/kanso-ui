import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Field, Input, Textarea } from './field';

/**
 * Mirror of packages/react/src/field/field.ssr.test.tsx.
 *
 * The assertion that shaped the component is the first one: the *server HTML*
 * already carries `aria-describedby`. A child registering with the root from
 * its own mount hook would leave it out and add it when JavaScript arrived, so
 * a form that works without JavaScript would ship without its description
 * association. `docs/03` §5 decision 1.
 *
 * Vue has a second reason to care. `readonly` reaches the DOM as a boolean
 * attribute only if it is spelled in lowercase — the server renderer's boolean
 * list is lowercase and the client's property check is not — so a `readOnly`
 * that slipped through unmapped would render one way on the server and another
 * in the browser. See `normalize-props.ts`.
 */

const App = defineComponent({
  setup: () => () =>
    h('form', [
      h(
        Field,
        { invalid: true },
        {
          label: () => 'Email',
          description: () => 'We only use this to sign you in.',
          'error-text': () => 'Required.',
          default: () => h(Input, { type: 'email', name: 'email' }),
        },
      ),
      h(
        Field,
        { readOnly: true },
        {
          label: () => 'Notes',
          description: () => 'Optional.',
          default: () => h(Textarea, { name: 'notes', rows: 3 }),
        },
      ),
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

describe('Field — server rendering', () => {
  it('ships the describedby association in the HTML itself', async () => {
    const html = await renderToString(createSSRApp(App));
    const control = /<input[^>]*type="email"[^>]*>/.exec(html)?.[0] ?? '';

    expect(control).toContain('aria-describedby=');
    expect(control).toContain('-description');
    expect(control).toContain('-error');
  });

  it('ships aria-invalid and the state attributes too', async () => {
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('aria-invalid="true"');
    // `data-invalid`, where React writes `data-invalid=""`. The two parse to the
    // same attribute with the same empty value, which is why hydration below is
    // clean and why `[data-invalid]` in the stylesheet matches either — the only
    // difference is how each server renderer chooses to serialise it.
    expect(html).toContain('data-invalid');
  });

  it('renders readonly as a lowercase boolean attribute', async () => {
    // Not `readOnly="true"`. The value is the whole point: Vue's server
    // renderer only treats a prop as a boolean attribute when the name is in
    // its lowercase list, and the client only sets it as a property when it is
    // not — so the two halves disagree unless the name is mapped.
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('readonly');
    expect(html).not.toContain('readOnly');
  });

  it('renders the live region on the server, so it is there before the message changes', async () => {
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('aria-live="polite"');
  });

  it('gives each field distinct ids', async () => {
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

  it('keeps the same describedby after hydration as before it', async () => {
    const html = await renderToString(createSSRApp(App));
    const { container } = await hydrate(html);

    const control = container.querySelector('input[type="email"]');
    const describedBy = control?.getAttribute('aria-describedby') ?? '';

    expect(describedBy).not.toBe('');
    expect(html).toContain(`aria-describedby="${describedBy}"`);
  });
});
