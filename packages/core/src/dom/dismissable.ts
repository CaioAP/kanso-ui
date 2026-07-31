/**
 * The two ways a layered thing gets dismissed: `Escape`, and a press outside it.
 *
 * Shared with Phase 4's Menu, which is why it takes callbacks rather than
 * sending Dialog events — the layer stack below is the part Menu actually needs,
 * and a menu inside a dialog is the case that proves it: pressing `Escape` must
 * close the menu and leave the dialog open.
 */

/** One live registration. Identity is all that matters — the stack compares by it. */
interface DismissableLayer {
  container: HTMLElement;
  onEscape?: () => void;
  onOutsidePress?: (target: HTMLElement) => void;
  exclude: () => (HTMLElement | null | undefined)[];
  blockOutsidePress: boolean;
}

/**
 * Open layers, oldest first. Module-level for the same reason the scroll lock's
 * count is: nesting is a property of the page, not of a component tree, and two
 * dialogs from unrelated trees still stack on one screen.
 */
const layers: DismissableLayer[] = [];

const isTopmost = (layer: DismissableLayer): boolean => layers[layers.length - 1] === layer;

export interface DismissableOptions {
  /** Called on `Escape` when this layer is topmost. Omit to opt out. */
  onEscape?: () => void;
  /** Called on a press outside, when this layer is topmost. Omit to opt out. */
  onOutsidePress?: (target: HTMLElement) => void;
  /**
   * Elements that count as *inside* despite being outside the container.
   *
   * The trigger, in practice. Without it, pressing the trigger of an open
   * dialog dismisses on `pointerdown` and reopens on the `click` that follows —
   * the dialog appears to flicker and never close, and the cause is two correct
   * handlers firing in the right order.
   *
   * A function, not an array, because the trigger element is behind a ref that
   * may not be filled when the layer is created.
   */
  exclude?: () => (HTMLElement | null | undefined)[];
  /**
   * Cancel the browser's default handling of the dismissing press. Off by
   * default; a modal layer wants it on.
   *
   * What it actually cancels is the *focus move* a mouse press performs. The
   * order matters and is not obvious: the layer dismisses during the press, the
   * dialog restores focus to its trigger as it tears down, and then the
   * browser's own default action moves focus to whatever was pressed — for a
   * backdrop, that is `<body>`. Focus restoration appears to work everywhere
   * except by mouse, and only in a real browser.
   *
   * A non-modal layer leaves it off on purpose: pressing a button on the page
   * behind a non-modal dialog *should* focus that button.
   */
  blockOutsidePress?: boolean;
}

/**
 * Register `container` as a dismissable layer. Returns the teardown.
 *
 * **Outside presses are read on `pointerdown`, not `click`.** A `click`
 * listener fires when a press that *started* inside the dialog is released
 * outside it — which is what selecting text and dragging past the edge looks
 * like. Closing there throws away what the user was doing, and it is the single
 * most common way a hand-rolled modal misbehaves. `pointerdown` describes where
 * the interaction began, which is the question actually being asked.
 *
 * The backdrop has no handler of its own; it is paint, and it dismisses because
 * it is outside the content like anything else. One code path, which also
 * covers a press on the positioner's padding — a gap a backdrop-only handler
 * misses, and one that is easy to hit at the corners of a centred dialog.
 */
export function createDismissable(
  container: HTMLElement,
  options: DismissableOptions = {},
): () => void {
  const doc = container.ownerDocument;

  const layer: DismissableLayer = {
    container,
    onEscape: options.onEscape,
    onOutsidePress: options.onOutsidePress,
    exclude: options.exclude ?? (() => []),
    blockOutsidePress: options.blockOutsidePress ?? false,
  };

  layers.push(layer);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!isTopmost(layer)) return;
    if (layer.onEscape === undefined) return;
    // Only the topmost layer gets here, so nothing else can also act on this
    // press — and a page-level Escape handler outside the library should not
    // fire while a modal is open.
    event.stopPropagation();
    layer.onEscape();
  };

  const onPointerDown = (event: Event) => {
    if (!isTopmost(layer)) return;
    if (layer.onOutsidePress === undefined) return;

    // `nodeType`, not `instanceof HTMLElement`: an `instanceof` check against
    // the ambient constructor is false for a node from another realm, and a
    // press inside an iframe would then be treated as "not an element" and
    // silently ignored.
    const target = event.target as Node | null;
    if (target === null || target.nodeType !== 1) return;
    const element = target as HTMLElement;

    if (layer.container.contains(element)) return;
    for (const excluded of layer.exclude()) {
      if (excluded?.contains(element)) return;
    }

    // Before the callback, because the callback may unmount the container and
    // the event is still the one being dispatched either way.
    if (layer.blockOutsidePress) event.preventDefault();

    layer.onOutsidePress(element);
  };

  // Capture on both: a consumer's own handler inside the layer must not be able
  // to suppress dismissal by calling `stopPropagation`, and `Escape` in
  // particular is a promise the component makes to the user, not to the markup.
  doc.addEventListener('keydown', onKeyDown, true);
  doc.addEventListener('pointerdown', onPointerDown, true);

  return () => {
    doc.removeEventListener('keydown', onKeyDown, true);
    doc.removeEventListener('pointerdown', onPointerDown, true);

    // Spliced by identity rather than popped: teardown order is the framework's
    // business and is not guaranteed to be the reverse of creation.
    const index = layers.indexOf(layer);
    if (index !== -1) layers.splice(index, 1);
  };
}

/** How many layers are open. Exported for tests; nothing in the library reads it. */
export function getDismissableLayerCount(): number {
  return layers.length;
}
