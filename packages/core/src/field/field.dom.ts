import { isDevelopment } from '../dom/env';

/**
 * The only side effect Field has, and it is a development warning.
 *
 * There is no focus management here, no document listener and no reducer
 * anywhere in this component — the whole of Field is a pure `connect` plus the
 * check below. If that ever stops being true, something has been put in the
 * wrong layer.
 */

/**
 * A `Field` whose label points at a control that was never rendered.
 *
 * Core emits the label's `for` unconditionally, because it cannot see the
 * consumer's children. That makes this the one dangling-idref case in the
 * library that no design change rules out — the fifth appearance of the defect
 * class, and the first that has to be caught at runtime instead. `docs/03` §5
 * decision 7.
 *
 * It reads the DOM rather than the state, for the same reason Dialog's name
 * check does: state says an `Input` was asked for, the DOM says the id actually
 * resolves, and the second is what an assistive technology will find.
 */
export function assertFieldControl(root: HTMLElement, controlId: string): void {
  if (!isDevelopment()) return;
  if (root.ownerDocument.getElementById(controlId) !== null) return;

  console.error(
    `[kanso] Field "${root.id}" has no control. Render an Input or a Textarea inside it, or the label's "for" points at nothing.`,
  );
}

/**
 * Run the check once the tree has stopped moving. Returns a cancel.
 *
 * A task rather than a microtask or a frame: it is the one delay that is
 * reliably after both frameworks' render work, in jsdom as well as in a
 * browser. Nothing waits on it — the whole function is a development warning.
 *
 * The `isConnected` guard matters more here than it looks: a field rendered and
 * unmounted inside one task (a test, a conditional branch) never had a control
 * to find, and warning about it would be noise about markup that no longer
 * exists.
 */
export function scheduleFieldControlCheck(root: HTMLElement, controlId: string): () => void {
  if (!isDevelopment()) return () => {};

  const handle = setTimeout(() => {
    if (root.isConnected) assertFieldControl(root, controlId);
  }, 0);

  return () => clearTimeout(handle);
}
