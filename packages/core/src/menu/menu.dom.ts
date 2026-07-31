import { createDismissable } from '../dom/dismissable';
import { getRovingIndex, getRovingItems, getRovingMove } from '../dom/roving-focus';
import { createTypeahead, isTypeaheadKey, matchTypeahead } from '../dom/typeahead';
import type { MenuOpenFocus, MenuPlacement } from './menu.types';

/**
 * Everything an open menu does that is not a prop: the arrow keys, `Home` and
 * `End`, typeahead, `Tab`, dismissal, where focus starts and where it goes
 * back to, and the one measurement that decides placement.
 *
 * More lives here than in `menu.connect.ts`, and that is the design rather than
 * an overflow. All of it needs either the live item collection — read from the
 * DOM at keypress time, as `roving-focus.ts` explains — or a buffer that
 * survives between keystrokes. Neither is expressible as a prop bag.
 *
 * Notably absent: any focus trap. `Tab` has to close the menu and let focus
 * move on, which is the opposite of what a trap does. `docs/03` §4 decision 1.
 */

/** The collection the arrows and typeahead move through. */
const ITEM_SELECTOR = '[role="menuitem"]';

export interface ActivateMenuOptions {
  /** The `role="menu"` element. */
  content: HTMLElement;
  /** The trigger, for dismissal exclusion and for focus restoration. */
  getTrigger: () => HTMLElement | null | undefined;
  /** Which end focus starts at — `ArrowUp` on the trigger opens at the last item. */
  openFocus: MenuOpenFocus;
  loop: boolean;
  typeahead: boolean;
  /** Current placement, so a measurement that changes nothing reports nothing. */
  placement: MenuPlacement;
  onClose: () => void;
  onPlacementChange: (placement: MenuPlacement) => void;
}

/**
 * Where the menu fits.
 *
 * Measured once at open, and nothing listens for `resize` or `scroll`
 * afterwards: a menu open across a viewport change is rare enough that a stale
 * placement beats two live listeners per menu. `docs/03` §4 decision 9.
 *
 * The measurement is deliberately taken from the **trigger** plus the menu's
 * *size*, never from where the menu currently sits. Reading its position would
 * make the answer depend on the previous answer — a menu that flipped above
 * last time is measured while it is above, finds no overflow below, reports
 * `bottom`, and flips back and forth on alternate opens. That failure is
 * user-visible (the menu lands somewhere different each press) and completely
 * invisible to a test that only opens once.
 *
 * No RTL handling, matching `roving-focus.ts`: mirroring `start`/`end` needs
 * the computed direction, which is a DOM read this does not take.
 */
export function measureMenuPlacement(trigger: HTMLElement, content: HTMLElement): MenuPlacement {
  const view = content.ownerDocument.defaultView;
  if (view === null) return 'bottom-start';

  const anchor = trigger.getBoundingClientRect();
  const menu = content.getBoundingClientRect();

  // Flip above only when the menu genuinely fits there. One taller than the
  // viewport overflows either way, and flipping it would push the *first* item
  // off-screen instead of the last — strictly worse, since that is where focus
  // lands.
  const spaceBelow = view.innerHeight - anchor.bottom;
  const spaceAbove = anchor.top;
  const side = menu.height > spaceBelow && menu.height <= spaceAbove ? 'top' : 'bottom';

  // Where a start-aligned menu *would* end, rather than where this one does.
  const align = anchor.left + menu.width > view.innerWidth ? 'end' : 'start';

  return `${side}-${align}`;
}

export function activateMenu(options: ActivateMenuOptions): () => void {
  const { content, getTrigger, openFocus, loop, typeahead: typeaheadEnabled, onClose } = options;
  const doc = content.ownerDocument;

  const typeahead = createTypeahead();

  const items = (): HTMLElement[] => getRovingItems(content.id, ITEM_SELECTOR);

  /** Where focus is in the item list, or `-1` when it is on the content itself. */
  const currentIndex = (list: HTMLElement[]): number =>
    list.indexOf(doc.activeElement as HTMLElement);

  const focusAt = (list: HTMLElement[], index: number): void => {
    list[index]?.focus();
  };

  const releaseDismissable = createDismissable(content, {
    onEscape: onClose,
    onOutsidePress: onClose,
    // Excluding the trigger is what lets it toggle: without it, `pointerdown`
    // dismisses and the `click` that follows reopens, so the menu never closes
    // from its own button.
    exclude: () => [getTrigger() ?? null],
    // Deliberately not blocked, unlike Dialog's modal layer. A menu is not
    // modal, so a press on the page behind it should reach — and focus — what
    // it hit. `docs/03` §4 decision 8.
  });

  const onKeyDown = (event: KeyboardEvent) => {
    const list = items();

    if (event.key === 'Tab') {
      // Closed, focus put back on the trigger, and `preventDefault` deliberately
      // *not* called — so the browser's own Tab handling continues from the
      // trigger and lands on whatever follows it. Swallowing the press instead
      // would trap the user in a menu that has already closed.
      getTrigger()?.focus();
      onClose();
      return;
    }

    const move = getRovingMove(event.key, 'vertical');
    if (move !== undefined) {
      if (list.length === 0) return;
      event.preventDefault();
      focusAt(
        list,
        getRovingIndex(move, { current: currentIndex(list), count: list.length, loop }),
      );
      return;
    }

    if (!typeaheadEnabled) return;
    if (!isTypeaheadKey(event.key)) return;
    // Modified keys belong to the browser or the OS: Ctrl+F is find, not a
    // search for items beginning with "f".
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (list.length === 0) return;

    const query = typeahead.push(event.key);
    const labels = list.map((item) => item.textContent ?? '');
    const index = matchTypeahead({ query, labels, currentIndex: currentIndex(list) });
    if (index === undefined) return;

    // Only prevented once there is a match, so an unmatched keystroke still
    // behaves like an ordinary key press to anything listening further up.
    event.preventDefault();
    focusAt(list, index);
  };

  content.addEventListener('keydown', onKeyDown);

  // Focus goes into the menu on open — always, and at the end the opening
  // gesture asked for. `docs/03` §4 decision 7.
  const initial = items();
  if (initial.length === 0) {
    content.focus();
  } else {
    focusAt(initial, openFocus === 'last' ? initial.length - 1 : 0);
  }

  const trigger = getTrigger();
  if (trigger != null) {
    const measured = measureMenuPlacement(trigger, content);
    if (measured !== options.placement) options.onPlacementChange(measured);
  }

  return () => {
    content.removeEventListener('keydown', onKeyDown);
    releaseDismissable();
    typeahead.destroy();

    // Only when the menu still holds focus. `Tab` has already moved it to the
    // trigger on purpose, and a press outside is on its way somewhere else —
    // pulling focus back in either case would undo what the user just did.
    if (content.contains(doc.activeElement)) getTrigger()?.focus();
  };
}
