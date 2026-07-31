import { getFocusableEdges } from './focusable';

/**
 * Keep focus inside one element until the caller lets go.
 *
 * Two mechanisms, deliberately both:
 *
 * 1. **`inert` on the background.** The platform's own answer, and the only one
 *    that also stops a *pointer* reaching the page behind the dialog, removes
 *    the background from the accessibility tree, and blocks find-in-page. It is
 *    what `<dialog>.showModal()` uses internally — see `docs/03` §3 decision 1,
 *    where the native element is rejected but this part of it is kept.
 * 2. **A `Tab` cycle.** The fallback for engines without `inert`, and the thing
 *    that makes the *first* `Tab` wrap correctly rather than stepping into
 *    browser chrome.
 *
 * What is deliberately absent is a `focusin` listener that yanks focus back
 * whenever it lands outside. It looks like the thorough option and it fights
 * with things that are not the page: a `<select>` dropdown, an `<iframe>`, the
 * browser's own find bar. `inert` already stops the cases that matter.
 *
 * One known limitation, stated rather than watched for: the background is
 * inerted once, when the trap is created. A element appended to `<body>` while
 * the dialog is open is *not* inerted — the alternative is a `MutationObserver`
 * running for the lifetime of every modal. In practice the thing that gets
 * appended is another portal, which brings its own trap and is meant to be
 * reachable. The `Tab` cycle still holds regardless, because it reasons about
 * the container rather than about the background.
 */

export interface FocusTrapOptions {
  /**
   * Where the background starts. Every child of this element that does not
   * contain `container` is made `inert`. Defaults to the container's
   * `<body>` — the right answer whenever the dialog is portalled, which it
   * always is here.
   */
  boundary?: HTMLElement;
}

/**
 * Trap focus inside `container`. Returns the teardown, which restores the
 * background exactly as it was.
 *
 * Never moves focus itself. Where focus goes on open is a Dialog decision
 * (`initialFocus`, else the first focusable, else the container), and it is
 * made in `dialog.dom.ts` where the state that answers it lives.
 */
export function trapFocus(container: HTMLElement, options: FocusTrapOptions = {}): () => void {
  const doc = container.ownerDocument;
  const boundary = options.boundary ?? doc.body;

  // Only the elements this call changed. A background element that was already
  // `inert` — an app that inerts a region for its own reasons — must stay inert
  // after teardown, and a naive `removeAttribute` over everything would
  // silently un-inert it.
  const inerted: Element[] = [];

  // Typed as `Element`, not `HTMLElement`, and no `instanceof` narrowing: an
  // `instanceof` check against the ambient constructor is false for a node from
  // another realm — an iframe, or a test that builds its own document — and
  // everything used here is on `Element` anyway.
  for (const child of Array.from(boundary.children)) {
    if (child.contains(container)) continue;
    if (child.hasAttribute('inert')) continue;
    child.setAttribute('inert', '');
    inerted.push(child);
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const edges = getFocusableEdges(container);
    if (edges === undefined) {
      // Nothing focusable inside. Without this branch `Tab` would leave the
      // dialog and never come back — the trap's worst failure, because the user
      // is now on a page they cannot see.
      event.preventDefault();
      return;
    }

    const active = doc.activeElement;

    // The container itself counts as *not* on a stop, and that case is the
    // common one rather than the exotic one: opening a dialog with no
    // `initialFocus` focuses the content element, so this is what the very
    // first `Tab` press hits.
    const onAStop = active !== null && active !== container && container.contains(active);
    if (!onAStop) {
      event.preventDefault();
      (event.shiftKey ? edges.last : edges.first).focus();
      return;
    }

    if (event.shiftKey && active === edges.first) {
      event.preventDefault();
      edges.last.focus();
      return;
    }

    if (!event.shiftKey && active === edges.last) {
      event.preventDefault();
      edges.first.focus();
    }
  };

  // Capture, so a consumer's own `Tab` handler inside the dialog cannot stop the
  // wrap by calling `stopPropagation`. The trap is not optional for anything
  // rendered inside it.
  doc.addEventListener('keydown', onKeyDown, true);

  return () => {
    doc.removeEventListener('keydown', onKeyDown, true);
    for (const element of inerted) element.removeAttribute('inert');
    inerted.length = 0;
  };
}
