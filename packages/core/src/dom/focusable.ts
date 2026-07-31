/**
 * Which elements can be focused, in tab order.
 *
 * Its own module rather than a private helper inside `focus-trap.ts`, because
 * `docs/01` §6 names it separately and three things need it: the trap's wrap
 * arithmetic, Dialog's "focus the first focusable" default, and Phase 4's Menu.
 *
 * There is no perfect selector for this — the platform's own answer depends on
 * layout, and the only exact test is `HTMLElement.focus()` plus checking what
 * moved. What follows is the pragmatic approximation every library uses, with
 * the exclusions that actually matter written out rather than assumed.
 */

/**
 * Candidates, before filtering. Order is document order, which is tab order for
 * everything here — the library emits no positive `tabindex`, and honouring one
 * would mean sorting by it. If a consumer puts `tabindex="1"` inside a dialog,
 * the trap still holds; only the order within it is the browser's, not ours.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]',
  '[tabindex]',
].join(',');

/**
 * `disabled` is the obvious exclusion. The rest are the ones that produce a
 * trap which appears to work and then drops focus somewhere unexpected:
 *
 * - `[tabindex="-1"]` is focusable by script but not by `Tab`, and the trap is
 *   only ever asked about the `Tab` order. The dialog content itself carries
 *   `tabindex="-1"`, so including it would make the trap wrap onto the container.
 * - `[inert]` and anything inside it is unfocusable by definition, and this
 *   module is used *by* the thing that applies `inert`.
 * - `[hidden]` covers a closed panel. `display: none` is caught below by the
 *   dimension check, which is the only reliable read for visibility.
 */
const UNFOCUSABLE_SELECTOR = [
  '[disabled]',
  '[tabindex="-1"]',
  '[inert]',
  '[inert] *',
  '[hidden]',
  // Never rendered, never focusable — and common inside a form in a dialog,
  // which is exactly where a trap would try to wrap onto it.
  'input[type="hidden"]',
  // `contenteditable="false"` still matches `[contenteditable]` in the
  // candidate list above, and means the opposite of it.
  '[contenteditable="false"]',
].join(',');

/**
 * Visible enough to receive focus.
 *
 * Two shortcuts are rejected here. `offsetParent !== null` is the popular one
 * and reports `null` for `position: fixed` elements, which are perfectly
 * visible — and a dialog is very often fixed. `getClientRects().length` is
 * correct in a browser but measures layout, and jsdom lays nothing out, so it
 * would report *every* element unfocusable and quietly turn every jsdom
 * assertion about initial focus into a test of the fallback path.
 *
 * Walking the ancestors for `display: none` / `visibility: hidden` is what is
 * left. It costs one computed-style read per ancestor, on the handful of
 * elements inside a dialog, and it is the same answer in both environments.
 *
 * What it does *not* cover: an element scrolled out of view, or covered by
 * another. Neither affects focusability, so neither belongs here.
 */
function isVisible(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  if (view === null) return false;

  let node: HTMLElement | null = element;
  while (node !== null) {
    const style = view.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    node = node.parentElement;
  }
  return true;
}

/**
 * Every focusable descendant of `container`, in tab order.
 *
 * The container itself is never included, even when it is focusable: a focus
 * trap that counts its own container as a stop cycles through it on every pass.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return candidates.filter(
    (element) => !element.matches(UNFOCUSABLE_SELECTOR) && isVisible(element),
  );
}

/** The first and last tab stops — what a trap wraps between. */
export function getFocusableEdges(
  container: HTMLElement,
): { first: HTMLElement; last: HTMLElement } | undefined {
  const elements = getFocusableElements(container);
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (first === undefined || last === undefined) return undefined;
  return { first, last };
}
