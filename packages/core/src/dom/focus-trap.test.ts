// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { trapFocus } from './focus-trap';

/**
 * What is asserted here is the trap's *mechanism*: which elements were made
 * inert, what teardown restores, and where a `Tab` press is redirected.
 *
 * What is deliberately not asserted here is that focus cannot escape. jsdom
 * neither implements `inert` nor moves focus the way a browser does, so a green
 * test here would say nothing about a real trap. That assertion lives in the
 * Playwright suite — `docs/04`, and CLAUDE.md's "Traps" note.
 */

function render(html: string): HTMLElement {
  document.body.innerHTML = html;
  const container = document.getElementById('dialog');
  if (container === null) throw new Error('fixture did not render');
  return container;
}

/** The usual shape: a page, and a portalled dialog beside it. */
function renderPage(): HTMLElement {
  return render(`
    <div id="page">
      <button id="outside">outside</button>
    </div>
    <div id="portal">
      <div id="dialog" tabindex="-1">
        <button id="first">first</button>
        <button id="middle">middle</button>
        <button id="last">last</button>
      </div>
    </div>
  `);
}

function pressTab(target: Element, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`no #${id}`);
  return element;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('trapFocus — inert', () => {
  it('inerts the background and leaves the branch holding the container alone', () => {
    const container = renderPage();

    const release = trapFocus(container);

    expect(byId('page').hasAttribute('inert')).toBe(true);
    expect(byId('portal').hasAttribute('inert')).toBe(false);

    release();
  });

  it('removes only what it added', () => {
    // An app that inerts a region for its own reasons must still have it inert
    // after the dialog closes. A blanket removeAttribute would un-inert it and
    // nothing would ever report the mistake.
    document.body.innerHTML = `
      <div id="page"></div>
      <div id="already" inert></div>
      <div id="portal"><div id="dialog"></div></div>
    `;
    const container = byId('dialog');

    const release = trapFocus(container);
    expect(byId('page').hasAttribute('inert')).toBe(true);

    release();

    expect(byId('page').hasAttribute('inert')).toBe(false);
    expect(byId('already').hasAttribute('inert')).toBe(true);
  });

  it('takes the boundary from the option when one is given', () => {
    render(`
      <div id="scope">
        <div id="sibling"></div>
        <div id="dialog"></div>
      </div>
      <div id="cousin"></div>
    `);

    const release = trapFocus(byId('dialog'), { boundary: byId('scope') });

    expect(byId('sibling').hasAttribute('inert')).toBe(true);
    // Outside the boundary, so untouched — which is what makes a trap inside a
    // shadow root or a preview frame possible at all.
    expect(byId('cousin').hasAttribute('inert')).toBe(false);

    release();
  });

  it('nests: the inner trap inerts the outer dialog, and unwinds cleanly', () => {
    document.body.innerHTML = `
      <div id="page"></div>
      <div id="outer"><div id="dialog"><button id="a">a</button></div></div>
    `;

    const releaseOuter = trapFocus(byId('dialog'));

    // Appended *after* the outer trap, the way a second dialog's portal really
    // arrives — which is also why the outer trap could not have inerted it.
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="inner-portal"><div id="inner"><button id="b">b</button></div></div>',
    );

    const releaseInner = trapFocus(byId('inner'));

    expect(byId('outer').hasAttribute('inert')).toBe(true);
    expect(byId('inner-portal').hasAttribute('inert')).toBe(false);

    releaseInner();
    // The outer trap did not inert its own branch, so the dialog underneath is
    // interactive again the moment the inner one lets go.
    expect(byId('outer').hasAttribute('inert')).toBe(false);
    expect(byId('page').hasAttribute('inert')).toBe(true);

    releaseOuter();
    expect(byId('page').hasAttribute('inert')).toBe(false);
  });
});

describe('trapFocus — the Tab cycle', () => {
  it('wraps forward from the last stop to the first', () => {
    const container = renderPage();
    const release = trapFocus(container);

    byId('last').focus();
    const event = pressTab(byId('last'));

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('first'));

    release();
  });

  it('wraps backward from the first stop to the last', () => {
    const container = renderPage();
    const release = trapFocus(container);

    byId('first').focus();
    const event = pressTab(byId('first'), true);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('last'));

    release();
  });

  it('leaves Tab alone in the middle, so the browser does the moving', () => {
    const container = renderPage();
    const release = trapFocus(container);

    byId('middle').focus();
    const event = pressTab(byId('middle'));

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(byId('middle'));

    release();
  });

  it('pulls focus back in when it is somewhere else entirely', () => {
    // Focus on the container itself is this case too: the container is not a
    // tab stop, so the first Tab has to land on a real one.
    const container = renderPage();
    const release = trapFocus(container);

    container.focus();
    const event = pressTab(container);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('first'));

    release();
  });

  it('pulls focus back to the last stop on Shift+Tab from outside', () => {
    const container = renderPage();
    const release = trapFocus(container);

    byId('outside').focus();
    const event = pressTab(byId('outside'), true);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('last'));

    release();
  });

  it('swallows Tab entirely when there is nothing focusable inside', () => {
    // The worst failure a trap has: Tab leaves and never comes back, stranding
    // the user on a page they cannot see behind the modal.
    const container = render('<div id="dialog"><p>nothing to focus</p></div>');
    const release = trapFocus(container);

    const event = pressTab(container);

    expect(event.defaultPrevented).toBe(true);

    release();
  });

  it('ignores keys that are not Tab', () => {
    const container = renderPage();
    const release = trapFocus(container);

    byId('last').focus();
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    byId('last').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(byId('last'));

    release();
  });

  it('cannot be suppressed by a handler inside the dialog', () => {
    // Listening in the capture phase is what makes this true. Content rendered
    // inside a modal does not get to opt out of the trap.
    const container = renderPage();
    const release = trapFocus(container);

    container.addEventListener('keydown', (event) => event.stopPropagation());

    byId('last').focus();
    const event = pressTab(byId('last'));

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('first'));

    release();
  });
});

describe('trapFocus — teardown', () => {
  it('stops handling Tab once released', () => {
    const container = renderPage();
    const release = trapFocus(container);
    release();

    byId('last').focus();
    const event = pressTab(byId('last'));

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(byId('last'));
  });

  it('is safe to release twice', () => {
    const container = renderPage();
    const release = trapFocus(container);

    release();
    expect(() => release()).not.toThrow();
    expect(byId('page').hasAttribute('inert')).toBe(false);
  });
});
