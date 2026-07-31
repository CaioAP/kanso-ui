import { describe, expect, it } from 'vitest';
import { dialogIds, dialogReducer, initialDialogState } from './dialog.state';
import type { DialogState } from './dialog.types';

const state = (overrides: Partial<DialogState> = {}): DialogState => ({
  ...initialDialogState({ id: 'd1' }),
  ...overrides,
});

describe('dialogIds', () => {
  it('derives every part id from the one supplied id', () => {
    // Supplied, never generated: a counter or a random value here differs
    // between the server render and the client one. CLAUDE.md rule 3.
    expect(dialogIds('d1')).toEqual({
      trigger: 'd1-trigger',
      content: 'd1-content',
      title: 'd1-title',
      description: 'd1-description',
    });
  });
});

describe('initialDialogState', () => {
  it('defaults to a closed, modal, dismissable dialog', () => {
    expect(initialDialogState({ id: 'd1' })).toEqual({
      open: false,
      modal: true,
      role: 'dialog',
      closeOnEscape: true,
      closeOnInteractOutside: true,
      hasTitle: false,
      hasDescription: false,
      hasAriaLabel: false,
      ids: dialogIds('d1'),
    });
  });

  it('takes every field from the init when given', () => {
    expect(
      initialDialogState({
        id: 'd1',
        open: true,
        modal: false,
        role: 'alertdialog',
        closeOnEscape: false,
        closeOnInteractOutside: false,
        hasTitle: true,
        hasDescription: true,
        hasAriaLabel: true,
      }),
    ).toMatchObject({
      open: true,
      modal: false,
      role: 'alertdialog',
      closeOnEscape: false,
      closeOnInteractOutside: false,
      hasTitle: true,
      hasDescription: true,
      hasAriaLabel: true,
    });
  });

  it('defaults the parts to absent, so no idref is emitted before one exists', () => {
    const initial = initialDialogState({ id: 'd1' });
    expect(initial.hasTitle).toBe(false);
    expect(initial.hasDescription).toBe(false);
  });
});

describe('dialogReducer', () => {
  it('opens and closes', () => {
    expect(dialogReducer(state(), { type: 'OPEN' }).open).toBe(true);
    expect(dialogReducer(state({ open: true }), { type: 'CLOSE' }).open).toBe(false);
  });

  it('SET_OPEN writes either value', () => {
    expect(dialogReducer(state(), { type: 'SET_OPEN', value: true }).open).toBe(true);
    expect(dialogReducer(state({ open: true }), { type: 'SET_OPEN', value: false }).open).toBe(
      false,
    );
  });

  it('returns the same reference when nothing changes', () => {
    // Identity is how adapters tell a transition from a no-op and skip the
    // callback. Escape and a press outside can both land in one frame, and
    // onOpenChange(false) must not fire twice.
    const closed = state();
    expect(dialogReducer(closed, { type: 'CLOSE' })).toBe(closed);
    expect(dialogReducer(closed, { type: 'SET_OPEN', value: false })).toBe(closed);

    const open = state({ open: true });
    expect(dialogReducer(open, { type: 'OPEN' })).toBe(open);
    expect(dialogReducer(open, { type: 'SET_OPEN', value: true })).toBe(open);
  });

  it('leaves everything but `open` untouched', () => {
    const before = state({ modal: false, role: 'alertdialog', hasTitle: true });
    const after = dialogReducer(before, { type: 'OPEN' });

    expect(after).toEqual({ ...before, open: true });
  });

  it('ignores an unknown event', () => {
    const before = state();
    // Reachable from JavaScript consumers, who have no compiler stopping them.
    expect(dialogReducer(before, { type: 'NOPE' } as never)).toBe(before);
  });
});
