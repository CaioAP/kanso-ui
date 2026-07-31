import { describe, expect, it, vi } from 'vitest';
import { createNormalizer } from '../normalize';
import type { Dict, PropTypes } from '../types';
import { connectDialog } from './dialog.connect';
import { initialDialogState } from './dialog.state';
import type { DialogEvent, DialogStateInit } from './dialog.types';

/** A pass-through normalizer, so these tests see exactly what core emits. */
interface IdentityPropTypes extends PropTypes {
  element: Dict;
  button: Dict;
  input: Dict;
  label: Dict;
}
const identity = createNormalizer<IdentityPropTypes>((props) => props);

const api = (init: Partial<DialogStateInit> = {}, send: (e: DialogEvent) => void = () => {}) =>
  connectDialog(initialDialogState({ id: 'd', ...init }), send, identity);

/** Open, with both optional parts present — the fully-wired case. */
const openApi = (init: Partial<DialogStateInit> = {}) =>
  api({ open: true, hasTitle: true, hasDescription: true, ...init });

describe('connectDialog — parts and data attributes', () => {
  it('marks the two scope roots, and only those', () => {
    // Dialog has two: the trigger stays in the page while everything else is
    // portalled, so no single element contains both. The stylesheet keys off
    // `[data-scope='dialog']`, and a stray marker on a child would make every
    // descendant selector match twice.
    const a = openApi();

    expect(a.triggerProps['data-kanso']).toBe('');
    expect(a.positionerProps['data-kanso']).toBe('');

    expect(a.backdropProps['data-kanso']).toBeUndefined();
    expect(a.contentProps['data-kanso']).toBeUndefined();
    expect(a.titleProps['data-kanso']).toBeUndefined();
    expect(a.descriptionProps['data-kanso']).toBeUndefined();
    expect(a.closeProps['data-kanso']).toBeUndefined();
  });

  it('scopes both roots to dialog', () => {
    const a = api();
    expect(a.triggerProps['data-scope']).toBe('dialog');
    expect(a.positionerProps['data-scope']).toBe('dialog');
  });

  it('names every part', () => {
    const a = openApi();
    expect(a.triggerProps['data-part']).toBe('trigger');
    expect(a.positionerProps['data-part']).toBe('positioner');
    expect(a.backdropProps['data-part']).toBe('backdrop');
    expect(a.contentProps['data-part']).toBe('content');
    expect(a.titleProps['data-part']).toBe('title');
    expect(a.descriptionProps['data-part']).toBe('description');
    expect(a.closeProps['data-part']).toBe('close');
  });

  it('reports open state on every part a stylesheet can animate', () => {
    const closed = api();
    expect(closed.triggerProps['data-state']).toBe('closed');
    expect(closed.positionerProps['data-state']).toBe('closed');

    const open = openApi();
    expect(open.triggerProps['data-state']).toBe('open');
    expect(open.positionerProps['data-state']).toBe('open');
    expect(open.backdropProps['data-state']).toBe('open');
    expect(open.contentProps['data-state']).toBe('open');
  });
});

describe('connectDialog — the trigger', () => {
  it('is a button that says what it opens', () => {
    const a = api();
    expect(a.triggerProps.type).toBe('button');
    expect(a.triggerProps['aria-haspopup']).toBe('dialog');
    expect(a.triggerProps.id).toBe('d-trigger');
  });

  it('reports expansion', () => {
    expect(api().triggerProps['aria-expanded']).toBe(false);
    expect(api({ open: true }).triggerProps['aria-expanded']).toBe(true);
  });

  it('emits no aria-controls, because the content is unmounted while closed', () => {
    // An idref to an element that does not exist is worse than no idref: it
    // resolves to nothing and axe reports it as *incomplete*, never as a
    // violation. `aria-haspopup` says the same thing without the promise.
    expect(api().triggerProps['aria-controls']).toBeUndefined();
    expect(api({ open: true }).triggerProps['aria-controls']).toBeUndefined();
  });

  it('opens rather than toggles', () => {
    // Closing on a second press is the dismissable layer's job, and it excludes
    // the trigger precisely so that pointerdown-then-click cannot close and
    // immediately reopen.
    const send = vi.fn();
    api({ open: true }, send).triggerProps.onClick();
    expect(send).toHaveBeenCalledWith({ type: 'OPEN' });
  });
});

describe('connectDialog — the content', () => {
  it('is a dialog, labelled and described by its parts', () => {
    const a = openApi();
    expect(a.contentProps.role).toBe('dialog');
    expect(a.contentProps.id).toBe('d-content');
    expect(a.contentProps['aria-labelledby']).toBe('d-title');
    expect(a.contentProps['aria-describedby']).toBe('d-description');
    expect(a.titleProps.id).toBe('d-title');
    expect(a.descriptionProps.id).toBe('d-description');
  });

  it('takes the alertdialog role when asked', () => {
    expect(openApi({ role: 'alertdialog' }).contentProps.role).toBe('alertdialog');
  });

  it('omits each idref when its part is not mounted', () => {
    // The defect this prevents, for the third time in this repo: emitting the
    // reference unconditionally points it at an element that was never
    // rendered, and a screen reader then announces nothing at all.
    const a = api({ open: true });
    expect(a.contentProps['aria-labelledby']).toBeUndefined();
    expect(a.contentProps['aria-describedby']).toBeUndefined();

    const titleOnly = api({ open: true, hasTitle: true });
    expect(titleOnly.contentProps['aria-labelledby']).toBe('d-title');
    expect(titleOnly.contentProps['aria-describedby']).toBeUndefined();

    const descriptionOnly = api({ open: true, hasDescription: true });
    expect(descriptionOnly.contentProps['aria-labelledby']).toBeUndefined();
    expect(descriptionOnly.contentProps['aria-describedby']).toBe('d-description');
  });

  it('drops aria-labelledby when the consumer supplied their own name', () => {
    // Two names is not better than one: `aria-label` wins over the title's
    // text, so the visible heading would stop being what is announced.
    const a = openApi({ hasAriaLabel: true });
    expect(a.contentProps['aria-labelledby']).toBeUndefined();
    // The description is unaffected — it names nothing.
    expect(a.contentProps['aria-describedby']).toBe('d-description');
  });

  it('is aria-modal only while modal, and never false', () => {
    expect(openApi().contentProps['aria-modal']).toBe(true);
    // `aria-modal="false"` is legal and says nothing its absence does not.
    expect(openApi({ modal: false }).contentProps['aria-modal']).toBeUndefined();
  });

  it('is focusable by script but not by Tab', () => {
    // Where focus lands when the dialog holds nothing focusable of its own.
    // `getFocusableElements` excludes tabindex="-1", so the trap cannot wrap
    // onto the container.
    expect(openApi().contentProps.tabIndex).toBe(-1);
  });

  it('has no keyboard handler of its own', () => {
    // Escape has to work from anywhere, including from inside a native select
    // and including when nothing inside the dialog has focus. That makes it a
    // document listener, which makes it an effect — see dialog.dom.ts.
    expect(openApi().contentProps.onKeyDown).toBeUndefined();
  });
});

describe('connectDialog — the backdrop and the close button', () => {
  it('hides the backdrop from assistive technology and gives it no handler', () => {
    const a = openApi();
    expect(a.backdropProps['aria-hidden']).toBe(true);
    expect(a.backdropProps.onClick).toBeUndefined();
    expect(a.backdropProps.onPointerDown).toBeUndefined();
  });

  it('closes from the close button', () => {
    const send = vi.fn();
    api({ open: true }, send).closeProps.onClick();
    expect(send).toHaveBeenCalledWith({ type: 'CLOSE' });
  });

  it('is a button, so Enter and Space are the platform’s problem', () => {
    expect(openApi().closeProps.type).toBe('button');
  });
});

describe('connectDialog — the api surface', () => {
  it('reports open and writes it', () => {
    const send = vi.fn();
    const a = api({ open: true }, send);

    expect(a.open).toBe(true);

    a.setOpen(false);
    expect(send).toHaveBeenCalledWith({ type: 'SET_OPEN', value: false });
  });
});
