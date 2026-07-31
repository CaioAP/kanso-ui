// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activateDialog, assertDialogName } from './dialog.dom';

/**
 * The composition, not the trap. Whether focus can actually *escape* is a
 * question jsdom cannot answer — it does not implement `inert` and its focus
 * model is not trustworthy — so that assertion lives in Playwright and these
 * tests check what this module is responsible for: which utilities were armed,
 * in which order, and what teardown puts back. See `docs/04`.
 */

const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`no #${id}`);
  return element;
};

function render(
  contentInner = '<button id="ok">ok</button><button id="cancel">cancel</button>',
): void {
  document.body.innerHTML = `
    <div id="page">
      <button id="trigger">open</button>
      <button id="elsewhere">elsewhere</button>
    </div>
    <div id="portal">
      <div id="positioner">
        <div id="backdrop"></div>
        <div id="content" role="dialog" tabindex="-1" aria-label="Settings">${contentInner}</div>
      </div>
    </div>
  `;
}

/**
 * Every activation is tracked and torn down in `afterEach`, on top of the
 * explicit `release()` each test makes.
 *
 * Not belt and braces: the scroll lock is refcounted in module state, so one
 * failing assertion that skips its own teardown leaves the count above zero and
 * every later test in the file inherits a locked body. That failure mode cost
 * two confusing red tests when this file was first written.
 */
const releases: (() => void)[] = [];

const activate = (options: Partial<Parameters<typeof activateDialog>[0]> = {}) => {
  const release = activateDialog({ content: byId('content'), onClose: () => {}, ...options });
  releases.push(release);
  return release;
};

const pressEscape = () =>
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );

const pressOn = (element: Element) =>
  element.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));

beforeEach(() => {
  render();
});

afterEach(() => {
  for (const release of releases.splice(0)) release();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('activateDialog — focus on open', () => {
  it('focuses the first focusable element inside', () => {
    const release = activate();
    expect(document.activeElement).toBe(byId('ok'));
    release();
  });

  it('honours initialFocus', () => {
    // The prop that lets `alertdialog` point at Cancel rather than at the
    // destructive action — see docs/03 §3 decision 9.
    const release = activate({ initialFocus: () => byId('cancel') });
    expect(document.activeElement).toBe(byId('cancel'));
    release();
  });

  it('ignores an initialFocus that resolves to nothing', () => {
    const release = activate({ initialFocus: () => null });
    expect(document.activeElement).toBe(byId('ok'));
    release();
  });

  it('falls back to the content element when nothing inside is focusable', () => {
    // Which is why the content carries tabindex="-1". Without focus landing
    // somewhere inside, a screen reader never announces the dialog at all.
    render('<p>nothing here</p>');
    const release = activate();
    expect(document.activeElement).toBe(byId('content'));
    release();
  });
});

describe('activateDialog — dismissal', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn();
    const release = activate({ onClose });

    pressEscape();

    expect(onClose).toHaveBeenCalledTimes(1);
    release();
  });

  it('does not close on Escape when closeOnEscape is off', () => {
    const onClose = vi.fn();
    const release = activate({ onClose, closeOnEscape: false });

    pressEscape();

    expect(onClose).not.toHaveBeenCalled();
    release();
  });

  it('closes on a press outside, including on the backdrop', () => {
    const onClose = vi.fn();
    const release = activate({ onClose });

    pressOn(byId('backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // The positioner's own padding — the gap a backdrop-only handler misses.
    pressOn(byId('positioner'));
    expect(onClose).toHaveBeenCalledTimes(2);

    release();
  });

  it('does not close on a press inside the content', () => {
    const onClose = vi.fn();
    const release = activate({ onClose });

    pressOn(byId('ok'));

    expect(onClose).not.toHaveBeenCalled();
    release();
  });

  it('does not close on a press on the trigger', () => {
    // Otherwise pointerdown dismisses and the click that follows reopens, and
    // the dialog looks like it refuses to close.
    const onClose = vi.fn();
    const release = activate({ onClose, getTrigger: () => byId('trigger') });

    pressOn(byId('trigger'));

    expect(onClose).not.toHaveBeenCalled();
    release();
  });

  it('does not close on an outside press when closeOnInteractOutside is off', () => {
    const onClose = vi.fn();
    const release = activate({ onClose, closeOnInteractOutside: false });

    pressOn(byId('backdrop'));

    expect(onClose).not.toHaveBeenCalled();
    release();
  });

  it('swallows the Escape it acts on, and leaves alone the one it does not', () => {
    // `closeOnEscape` means exactly "Escape does not close this", and nothing
    // more. A dialog that handles the press consumes it, so a page-level
    // shortcut cannot also fire behind the modal; a dialog that opted out never
    // claimed the press in the first place, and swallowing it anyway would make
    // the prop silently disable the consumer's own keyboard handling.
    const page = vi.fn();
    document.addEventListener('keydown', page);

    const releaseDismissable = activate();
    pressEscape();
    expect(page).not.toHaveBeenCalled();
    releaseDismissable();

    const releaseFixed = activate({ closeOnEscape: false });
    pressEscape();
    expect(page).toHaveBeenCalledTimes(1);
    releaseFixed();

    document.removeEventListener('keydown', page);
  });
});

describe('activateDialog — modal versus non-modal', () => {
  it('inerts the background and locks scrolling while modal', () => {
    const release = activate();

    expect(byId('page').hasAttribute('inert')).toBe(true);
    expect(byId('portal').hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');

    release();

    expect(byId('page').hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('does neither when non-modal', () => {
    // A non-modal dialog is a panel: the page behind it stays usable, which is
    // the entire distinction. Dismissal and focus handling still apply.
    const release = activate({ modal: false });

    expect(byId('page').hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(byId('ok'));

    release();
  });
});

describe('activateDialog — focus on close', () => {
  it('restores focus to whatever had it when the dialog opened', () => {
    byId('trigger').focus();
    const release = activate();
    expect(document.activeElement).toBe(byId('ok'));

    release();

    expect(document.activeElement).toBe(byId('trigger'));
  });

  it('restores to whatever had focus, not to the trigger specifically', () => {
    // A dialog can be opened by a keyboard shortcut, or by a controlled parent
    // with no trigger rendered at all.
    byId('elsewhere').focus();
    const release = activate({ getTrigger: () => byId('trigger') });

    release();

    expect(document.activeElement).toBe(byId('elsewhere'));
  });

  it('honours finalFocus', () => {
    byId('trigger').focus();
    const release = activate({ finalFocus: () => byId('elsewhere') });

    release();

    expect(document.activeElement).toBe(byId('elsewhere'));
  });

  it('falls back to the body when the element that had focus is gone', () => {
    // The row that opened the dialog, deleted by the dialog. Common enough to
    // be the reason this branch exists rather than a throw.
    byId('trigger').focus();
    const release = activate();

    byId('trigger').remove();
    release();

    expect(document.activeElement).toBe(document.body);
    // Borrowed, not kept: the body is not a tab stop, and leaving a tabindex on
    // it would put one in every consumer's page.
    expect(document.body.hasAttribute('tabindex')).toBe(false);
  });

  it('lifts inert before restoring, so the restore is not a no-op', () => {
    // Ordering, and the only reason this module exists rather than four calls
    // in each adapter: focusing an element inside an inert subtree does
    // nothing, and the trigger is inside one until the trap lets go.
    byId('trigger').focus();
    const release = activate();
    expect(byId('page').hasAttribute('inert')).toBe(true);

    release();

    expect(byId('page').hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(byId('trigger'));
  });
});

describe('assertDialogName', () => {
  it('warns when the content has neither a name nor a title to point at', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    byId('content').removeAttribute('aria-label');

    assertDialogName(byId('content'));

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain('no accessible name');
  });

  it('stays quiet when the content carries an aria-label', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    assertDialogName(byId('content'));

    expect(error).not.toHaveBeenCalled();
  });

  it('stays quiet when aria-labelledby resolves to text', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const content = byId('content');
    content.removeAttribute('aria-label');
    content.setAttribute('aria-labelledby', 'title');
    content.insertAdjacentHTML('afterbegin', '<h2 id="title">Settings</h2>');

    assertDialogName(content);

    expect(error).not.toHaveBeenCalled();
  });

  it('warns when aria-labelledby points at nothing', () => {
    // The dangling idref itself. axe reports this as *incomplete*, never as a
    // violation, so nothing in CI would say a word about it.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const content = byId('content');
    content.removeAttribute('aria-label');
    content.setAttribute('aria-labelledby', 'nowhere');

    assertDialogName(content);

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('warns when the element it points at is empty', () => {
    // A `Dialog.Title` rendered with no children. The idref resolves, and the
    // name it resolves to is nothing at all.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const content = byId('content');
    content.removeAttribute('aria-label');
    content.setAttribute('aria-labelledby', 'title');
    content.insertAdjacentHTML('afterbegin', '<h2 id="title">  </h2>');

    assertDialogName(content);

    expect(error).toHaveBeenCalledTimes(1);
  });
});
