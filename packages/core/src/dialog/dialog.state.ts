import type { DialogEvent, DialogIds, DialogState, DialogStateInit } from './dialog.types';

export function dialogIds(id: string): DialogIds {
  return {
    trigger: `${id}-trigger`,
    content: `${id}-content`,
    title: `${id}-title`,
    description: `${id}-description`,
  };
}

export function initialDialogState(init: DialogStateInit): DialogState {
  return {
    open: init.open ?? false,
    modal: init.modal ?? true,
    role: init.role ?? 'dialog',
    closeOnEscape: init.closeOnEscape ?? true,
    closeOnInteractOutside: init.closeOnInteractOutside ?? true,
    hasTitle: init.hasTitle ?? false,
    hasDescription: init.hasDescription ?? false,
    hasAriaLabel: init.hasAriaLabel ?? false,
    ids: dialogIds(init.id),
  };
}

/**
 * The whole of Dialog's state behaviour. Pure: no DOM, no side effects, no
 * timers — which is what makes the interesting part of this component (the
 * effects in `dialog.dom.ts`) separable and testable at all.
 *
 * Returns the *same object reference* when nothing changed, so adapters can
 * tell a real transition from a no-op by identity and skip the callback.
 * Closing an already-closed dialog is the common case: `Escape` and a press
 * outside can both land in the same frame.
 */
export function dialogReducer(state: DialogState, event: DialogEvent): DialogState {
  switch (event.type) {
    case 'OPEN':
      return state.open ? state : { ...state, open: true };

    case 'CLOSE':
      return state.open ? { ...state, open: false } : state;

    case 'SET_OPEN':
      return state.open === event.value ? state : { ...state, open: event.value };

    default:
      return state;
  }
}
