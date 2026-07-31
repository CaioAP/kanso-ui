// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { lockScroll } from './scroll-lock';

/**
 * jsdom lays nothing out, so the viewport width has to be stated rather than
 * measured. That is fine here: the arithmetic is what is under test, and the
 * two readings it depends on are named explicitly below.
 */
function setViewport({
  innerWidth,
  clientWidth,
}: {
  innerWidth: number;
  clientWidth: number;
}): void {
  Object.defineProperty(window, 'innerWidth', { value: innerWidth, configurable: true });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: clientWidth,
    configurable: true,
  });
}

/** No scrollbar: the window and the viewport are the same width. */
const noScrollbar = () => setViewport({ innerWidth: 1024, clientWidth: 1024 });

/** A 15px classic scrollbar, the case that shifts the page. */
const withScrollbar = () => setViewport({ innerWidth: 1024, clientWidth: 1009 });

afterEach(() => {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  noScrollbar();
});

describe('lockScroll', () => {
  it('locks the body and restores it on release', () => {
    noScrollbar();

    const release = lockScroll();
    expect(document.body.style.overflow).toBe('hidden');

    release();
    expect(document.body.style.overflow).toBe('');
  });

  it("restores the page's own inline values rather than clearing them", () => {
    // The failure this prevents is a page that styled its own body losing that
    // styling the first time a dialog opens — and never getting it back.
    noScrollbar();
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '8px';

    const release = lockScroll();
    release();

    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.paddingRight).toBe('8px');
  });

  it('adds the scrollbar width as padding, so the page does not shift', () => {
    withScrollbar();

    const release = lockScroll();
    expect(document.body.style.paddingRight).toBe('15px');

    release();
    expect(document.body.style.paddingRight).toBe('');
  });

  it('adds the scrollbar width on top of existing padding', () => {
    withScrollbar();
    document.body.style.paddingRight = '8px';

    const release = lockScroll();
    expect(document.body.style.paddingRight).toBe('23px');

    release();
    expect(document.body.style.paddingRight).toBe('8px');
  });

  it('leaves padding alone where there is no scrollbar to compensate for', () => {
    // Overlay scrollbars — macOS, every phone. Padding the body there would be
    // the layout shift, not the fix for it.
    noScrollbar();

    const release = lockScroll();
    expect(document.body.style.paddingRight).toBe('');

    release();
  });
});

describe('lockScroll — nesting', () => {
  it('stays locked until the last holder releases', () => {
    // A dialog opened from inside a dialog. Without the count, closing the
    // inner one unlocks the page while the outer is still covering it.
    noScrollbar();

    const releaseOuter = lockScroll();
    const releaseInner = lockScroll();

    releaseInner();
    expect(document.body.style.overflow).toBe('hidden');

    releaseOuter();
    expect(document.body.style.overflow).toBe('');
  });

  it('snapshots the page state on the first lock only', () => {
    noScrollbar();
    document.body.style.overflow = 'auto';

    const releaseOuter = lockScroll();
    // By now overflow is `hidden`. A second snapshot here would capture the
    // lock's own value and restore *that*, leaving the page locked forever.
    const releaseInner = lockScroll();

    releaseInner();
    releaseOuter();

    expect(document.body.style.overflow).toBe('auto');
  });

  it('ignores a release called twice', () => {
    // React strict mode and Vue's HMR both re-run teardown. A second decrement
    // would unlock a page that still has a modal over it.
    noScrollbar();

    const releaseOuter = lockScroll();
    const releaseInner = lockScroll();

    releaseInner();
    releaseInner();
    expect(document.body.style.overflow).toBe('hidden');

    releaseOuter();
    expect(document.body.style.overflow).toBe('');
  });
});
