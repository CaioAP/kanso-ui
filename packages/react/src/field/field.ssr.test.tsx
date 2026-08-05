import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Field, Input, Textarea } from './field';

/**
 * The test that decided Field's shape, written before the component was.
 *
 * Every other component in this library is either trivial to server-render
 * (Switch, Tabs) or absent from the server HTML entirely when closed (Dialog,
 * Menu). Field is always rendered and is always wired, which makes it the first
 * component where a *registration* — a child telling the root it exists from
 * its own mount hook — would show up as a real defect rather than a stylistic
 * one: the server would send a control with no `aria-describedby`, and the
 * association would appear only once JavaScript arrived.
 *
 * So the first assertion below is not "hydration is warning-free". It is "the
 * server HTML is already correct". `docs/03` §5 decision 1.
 */

beforeAll(() => {
  // Without this React logs "the current testing environment is not configured
  // to support act(...)" on every hydrate, which would swamp the console spies.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function App() {
  return (
    <form>
      <Field
        label="Email"
        description="We only use this to sign you in."
        errorText="Required."
        invalid
      >
        <Input type="email" name="email" />
      </Field>
      <Field label="Notes" description="Optional.">
        <Textarea name="notes" rows={3} />
      </Field>
    </form>
  );
}

/**
 * The markup of the first field — the invalid one — up to where the second
 * begins. The app renders two on purpose: one showing an error, one showing a
 * description, so an assertion about either cannot be satisfied by the other.
 */
const invalidField = (html: string) => html.slice(0, html.lastIndexOf('data-scope="field"'));

/** Server-render, put the markup in the DOM, hydrate over it. */
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

describe('Field — server rendering', () => {
  it('ships the describedby association in the HTML itself', () => {
    // The whole reason presence is a prop and not a registration. Read the
    // attribute out of the string: no DOM, no JavaScript, no hydration.
    const html = renderToString(<App />);
    const control = /<input[^>]*type="email"[^>]*>/.exec(html)?.[0] ?? '';

    expect(control).toContain('aria-describedby=');
    // The app renders invalid, so the error is the one message and the
    // description is not in the document. The server HTML has to say that
    // already — a description that appears only once JavaScript arrives is the
    // hydration-shape problem this whole component is arranged to avoid.
    expect(control).toContain('-error');
    expect(control).not.toContain('-description');
    // And the element really is absent, not merely unreferenced. Scoped to the
    // invalid field — the second field in the app is valid and keeps its own
    // description, which is the other half of the same rule.
    expect(invalidField(html)).not.toContain('data-part="description"');
  });

  it('ships aria-invalid and the native required-shaped attributes too', () => {
    const html = renderToString(<App />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('data-invalid=""');
  });

  it('renders the live region on the server, so it is there before the message changes', () => {
    const html = renderToString(<App />);
    expect(html).toContain('aria-live="polite"');
  });

  it('gives each field distinct ids', () => {
    const html = renderToString(<App />);
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces the same markup twice — no counter, no randomness', () => {
    expect(renderToString(<App />)).toBe(renderToString(<App />));
  });

  it('hydrates with no mismatch logged', async () => {
    const { error, warn } = await hydrate(renderToString(<App />));

    // If this fails, read the message: React names the mismatched attribute.
    // An attribute that only the client renders is exactly what a registration
    // would produce.
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps the same describedby after hydration as before it', async () => {
    const html = renderToString(<App />);
    const { container } = await hydrate(html);

    const control = container.querySelector('input[type="email"]');
    const describedBy = control?.getAttribute('aria-describedby') ?? '';

    expect(describedBy).not.toBe('');
    expect(html).toContain(`aria-describedby="${describedBy}"`);
  });
});
