/**
 * Stop the page behind a modal from scrolling.
 *
 * Three details separate a scroll lock that reads as care from one that reads
 * as a bug, and all three are here rather than in the component:
 *
 * - **The scrollbar is compensated.** Setting `overflow: hidden` removes the
 *   scrollbar, and the page underneath jumps sideways by its width. The lock
 *   adds that width back as padding, so nothing moves. `docs/07` asks Playwright
 *   to assert this, because it is invisible to every other kind of test.
 * - **Unlocking restores the previous inline values, not the empty string.** A
 *   page that sets its own inline `padding-right` on `<body>` gets it back.
 * - **Locks are counted.** A dialog opened from inside a dialog must not unlock
 *   the page when the inner one closes.
 */

/**
 * How many locks are held. Module-level, which is the point: two dialogs from
 * two component trees still share one page, and a lock counted per-component
 * would let the second unlock undo the first.
 */
let lockCount = 0;

/** Taken on the first lock only, so nesting cannot capture an already-locked body. */
let restoreBody: (() => void) | undefined;

/** No-op teardown, for the server and for repeated release. */
const noop = () => {};

/**
 * Lock scrolling. Returns the release, which is idempotent — calling it twice
 * must not decrement the count twice, or a nested dialog closing then
 * re-rendering would unlock the page while a modal is still open.
 *
 * `doc` is injectable for tests; it defaults to the ambient document and the
 * whole thing degrades to a no-op where there is none, so importing this on a
 * server is safe.
 */
export function lockScroll(doc?: Document): () => void {
  const target = doc ?? (typeof document === 'undefined' ? undefined : document);
  if (target === undefined) return noop;

  lockCount += 1;

  if (lockCount === 1) {
    const { body, documentElement } = target;
    const view = target.defaultView;

    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    // The difference between the window and the viewport *is* the scrollbar.
    // Zero on overlay-scrollbar platforms (macOS, mobile), which is why the
    // padding is only touched when there is something to compensate for.
    const scrollbarWidth =
      (view?.innerWidth ?? documentElement.clientWidth) - documentElement.clientWidth;

    body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      const computed = view?.getComputedStyle(body).paddingRight ?? '';
      const current = Number.parseFloat(computed) || 0;
      body.style.paddingRight = `${current + scrollbarWidth}px`;
    }

    restoreBody = () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }

  let released = false;

  return () => {
    if (released) return;
    released = true;

    lockCount -= 1;
    if (lockCount > 0) return;

    restoreBody?.();
    restoreBody = undefined;
  };
}
