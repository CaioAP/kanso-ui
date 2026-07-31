import { createDismissable } from '../dom/dismissable';
import { isDevelopment } from '../dom/env';
import { trapFocus } from '../dom/focus-trap';
import { getFocusableElements } from '../dom/focusable';
import { lockScroll } from '../dom/scroll-lock';

/**
 * Everything a dialog does that is not a prop.
 *
 * One entry point rather than four, because the *order* is the behaviour and it
 * is not obvious: focus is moved after the trap is armed, and restored after the
 * trap has let go. An adapter composing the four utilities itself would get that
 * order right once and wrong the second time — and it would be behaviour living
 * in an adapter, which CLAUDE.md rule 2 forbids.
 *
 * Adapters call this from a lifecycle hook when the content mounts, and call the
 * returned teardown when it unmounts. That is the whole of their involvement.
 */

export interface ActivateDialogOptions {
  /** The `role="dialog"` element. The trap, the layer and focus all key off it. */
  content: HTMLElement;
  /** Modal traps focus and locks scrolling; non-modal does neither. */
  modal?: boolean;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  /** Where focus goes on open. Defaults to the first focusable, else the content. */
  initialFocus?: () => HTMLElement | null | undefined;
  /** Where focus goes on close. Defaults to whatever had it when the dialog opened. */
  finalFocus?: () => HTMLElement | null | undefined;
  /** Excluded from "outside", so pressing it cannot close and reopen in one gesture. */
  getTrigger?: () => HTMLElement | null | undefined;
  /** Called when the user dismisses. The adapter turns this into a CLOSE event. */
  onClose: () => void;
}

/**
 * A dialog with no accessible name is announced as just "dialog". This says so,
 * once, in development.
 *
 * It reads the DOM rather than the state on purpose: state says a `Title` part
 * was registered, the DOM says a name is actually resolvable, and the second is
 * the thing a screen reader will do.
 *
 * Call it through `scheduleDialogNameCheck` rather than directly from a mount
 * hook — the timing is the whole difficulty, and it is explained there.
 */
export function assertDialogName(content: HTMLElement): void {
  if (!isDevelopment()) return;

  if ((content.getAttribute('aria-label') ?? '').trim() !== '') return;

  const labelledBy = content.getAttribute('aria-labelledby');
  if (labelledBy !== null) {
    const doc = content.ownerDocument;
    const named = labelledBy
      .split(/\s+/)
      .some((id) => (doc.getElementById(id)?.textContent ?? '').trim() !== '');
    if (named) return;
  }

  console.error(
    '[kanso] Dialog has no accessible name. Render a Dialog.Title inside Dialog.Content, or give the content an aria-label.',
  );
}

/**
 * Run the name check once the tree has stopped moving. Returns a cancel.
 *
 * The ordering this exists for: `Dialog.Title` registers itself from its own
 * mount hook, which schedules a re-render of the root, so at the moment the
 * content's mount hook runs the `aria-labelledby` attribute is not on the
 * element yet. Checking there reports every correctly-titled dialog as
 * nameless, which is exactly what the first version of this did — 14 warnings
 * across a passing test suite.
 *
 * A task rather than a microtask or a frame: it is the one delay that is
 * reliably after both frameworks' render work, in jsdom as well as in a
 * browser. Nothing waits on it — the whole function is a development warning.
 */
export function scheduleDialogNameCheck(content: HTMLElement): () => void {
  if (!isDevelopment()) return () => {};

  const handle = setTimeout(() => {
    // A dialog that opened and closed inside one task was never announced, so
    // there is nothing to warn about.
    if (content.isConnected) assertDialogName(content);
  }, 0);

  return () => clearTimeout(handle);
}

export function activateDialog(options: ActivateDialogOptions): () => void {
  const {
    content,
    modal = true,
    closeOnEscape = true,
    closeOnInteractOutside = true,
    initialFocus,
    finalFocus,
    getTrigger,
    onClose,
  } = options;

  const doc = content.ownerDocument;

  // Captured before anything moves it. The trigger is the usual answer and is
  // deliberately not assumed: a dialog can be opened by a keyboard shortcut, or
  // by a controlled parent with no trigger rendered at all.
  const previouslyFocused = doc.activeElement as HTMLElement | null;

  const releaseDismissable = createDismissable(content, {
    // Omitted rather than guarded, and the difference is visible: a layer with
    // no `onEscape` does not consume the press, so a consumer's own keyboard
    // handling still runs. `closeOnEscape: false` means "Escape does not close
    // this dialog", not "Escape stops working on this page".
    onEscape: closeOnEscape ? onClose : undefined,
    onOutsidePress: closeOnInteractOutside ? onClose : undefined,
    exclude: () => [getTrigger?.() ?? null],
    // Modal only. Without it the browser's default focus move lands on the
    // backdrop's nearest focusable ancestor — `<body>` — *after* this teardown
    // has restored focus to the trigger, so dismissing with the mouse quietly
    // strands focus at the top of the document. Non-modal leaves it off: a press
    // on the page behind should focus what it hit.
    blockOutsidePress: modal,
  });

  const releaseTrap = modal ? trapFocus(content) : undefined;
  const releaseScroll = modal ? lockScroll(doc) : undefined;

  const explicitInitial = initialFocus?.();
  if (explicitInitial?.isConnected) {
    explicitInitial.focus();
  } else {
    // First focusable, else the content itself — which is why the content
    // carries `tabindex="-1"`. Landing focus somewhere inside is what makes a
    // screen reader announce the dialog at all.
    const [first] = getFocusableElements(content);
    (first ?? content).focus();
  }

  return () => {
    releaseDismissable();
    // Before the focus restore below: focusing an element inside an `inert`
    // subtree is a no-op, and until this runs the whole page still is one.
    releaseTrap?.();
    releaseScroll?.();

    const explicitFinal = finalFocus?.();
    const target = explicitFinal?.isConnected
      ? explicitFinal
      : previouslyFocused?.isConnected
        ? previouslyFocused
        : undefined;

    if (target !== undefined) {
      target.focus();
      return;
    }

    // The trigger is gone — a dialog opened from a row that the dialog itself
    // deleted, which is a common case rather than an exotic one. Falling back
    // to the body keeps the user near the top of the document instead of
    // wherever the browser decides, and `body.focus()` does nothing at all
    // without a tabindex, which is what the borrowed attribute is for.
    const { body } = doc;
    const hadTabIndex = body.hasAttribute('tabindex');
    if (!hadTabIndex) body.setAttribute('tabindex', '-1');
    body.focus();
    if (!hadTabIndex) body.removeAttribute('tabindex');
  };
}
