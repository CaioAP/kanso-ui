// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDismissable, getDismissableLayerCount } from './dismissable';

function render(): void {
  document.body.innerHTML = `
    <button id="trigger">open</button>
    <div id="page"><button id="outside">outside</button></div>
    <div id="layer"><button id="inside">inside</button></div>
    <div id="second-layer"><button id="inner">inner</button></div>
  `;
}

const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`no #${id}`);
  return element;
};

function pressEscape(target: Element = document.body): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

/** `PointerEvent` is not implemented in jsdom; the type is all this reads. */
function pressOn(target: Element): void {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
  expect(getDismissableLayerCount()).toBe(0);
});

describe('createDismissable — escape', () => {
  it('calls onEscape', () => {
    render();
    const onEscape = vi.fn();
    const release = createDismissable(byId('layer'), { onEscape });

    pressEscape();

    expect(onEscape).toHaveBeenCalledTimes(1);
    release();
  });

  it('ignores other keys', () => {
    render();
    const onEscape = vi.fn();
    const release = createDismissable(byId('layer'), { onEscape });

    byId('inside').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onEscape).not.toHaveBeenCalled();
    release();
  });

  it('cannot be suppressed by a handler inside the layer', () => {
    // Capture-phase listening. Escape is a promise the component makes to the
    // user, not to whatever markup a consumer renders inside it.
    render();
    const onEscape = vi.fn();
    const release = createDismissable(byId('layer'), { onEscape });
    byId('layer').addEventListener('keydown', (event) => event.stopPropagation());

    pressEscape(byId('inside'));

    expect(onEscape).toHaveBeenCalledTimes(1);
    release();
  });

  it('stops the press reaching a page-level handler', () => {
    render();
    const pageHandler = vi.fn();
    document.body.addEventListener('keydown', pageHandler);
    const release = createDismissable(byId('layer'), { onEscape: () => {} });

    pressEscape(byId('inside'));

    expect(pageHandler).not.toHaveBeenCalled();
    release();
    document.body.removeEventListener('keydown', pageHandler);
  });

  it('does nothing when the layer opted out', () => {
    render();
    const release = createDismissable(byId('layer'), {});
    expect(() => pressEscape()).not.toThrow();
    release();
  });
});

describe('createDismissable — outside press', () => {
  it('fires for a press outside the layer, with the target', () => {
    render();
    const onOutsidePress = vi.fn();
    const release = createDismissable(byId('layer'), { onOutsidePress });

    pressOn(byId('outside'));

    expect(onOutsidePress).toHaveBeenCalledWith(byId('outside'));
    release();
  });

  it('does not fire for a press inside the layer', () => {
    render();
    const onOutsidePress = vi.fn();
    const release = createDismissable(byId('layer'), { onOutsidePress });

    pressOn(byId('inside'));

    expect(onOutsidePress).not.toHaveBeenCalled();
    release();
  });

  it('does not fire when the press started inside and ended outside', () => {
    // Selecting text in a dialog and releasing the mouse over the backdrop.
    // A `click` listener sees this as a click outside and throws the user's
    // work away; `pointerdown` describes where the interaction began.
    render();
    const onOutsidePress = vi.fn();
    const release = createDismissable(byId('layer'), { onOutsidePress });

    pressOn(byId('inside'));
    byId('outside').dispatchEvent(new Event('pointerup', { bubbles: true }));
    byId('outside').dispatchEvent(new Event('click', { bubbles: true }));

    expect(onOutsidePress).not.toHaveBeenCalled();
    release();
  });

  it('treats excluded elements as inside', () => {
    // The trigger. Without this, pressing it while open dismisses on
    // pointerdown and reopens on the click that follows.
    render();
    const onOutsidePress = vi.fn();
    const release = createDismissable(byId('layer'), {
      onOutsidePress,
      exclude: () => [byId('trigger')],
    });

    pressOn(byId('trigger'));

    expect(onOutsidePress).not.toHaveBeenCalled();
    release();
  });

  it('cancels the press only when asked to', () => {
    // `blockOutsidePress` cancels the browser's default focus move. Without it,
    // a mouse dismissal restores focus to the trigger and the browser then
    // moves it to <body> — focus restoration that works by keyboard and
    // silently fails by mouse, visible only in a real browser.
    render();
    const release = createDismissable(byId('layer'), { onOutsidePress: () => {} });

    const allowed = new Event('pointerdown', { bubbles: true, cancelable: true });
    byId('outside').dispatchEvent(allowed);
    expect(allowed.defaultPrevented).toBe(false);
    release();

    const blockingRelease = createDismissable(byId('layer'), {
      onOutsidePress: () => {},
      blockOutsidePress: true,
    });

    const blocked = new Event('pointerdown', { bubbles: true, cancelable: true });
    byId('outside').dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);
    blockingRelease();
  });

  it('never cancels a press it does not act on', () => {
    render();
    const release = createDismissable(byId('layer'), {
      onOutsidePress: () => {},
      blockOutsidePress: true,
    });

    const inside = new Event('pointerdown', { bubbles: true, cancelable: true });
    byId('inside').dispatchEvent(inside);

    expect(inside.defaultPrevented).toBe(false);
    release();
  });

  it('survives an exclude that has not resolved yet', () => {
    render();
    const onOutsidePress = vi.fn();
    const release = createDismissable(byId('layer'), {
      onOutsidePress,
      // A ref that is still empty — the reason `exclude` is a function.
      exclude: () => [null, undefined],
    });

    pressOn(byId('outside'));

    expect(onOutsidePress).toHaveBeenCalledTimes(1);
    release();
  });
});

describe('createDismissable — the layer stack', () => {
  it('only the topmost layer dismisses', () => {
    // A menu inside a dialog: Escape closes the menu and leaves the dialog.
    render();
    const outer = vi.fn();
    const inner = vi.fn();

    const releaseOuter = createDismissable(byId('layer'), { onEscape: outer });
    const releaseInner = createDismissable(byId('second-layer'), { onEscape: inner });

    pressEscape();

    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    releaseInner();
    pressEscape();
    expect(outer).toHaveBeenCalledTimes(1);

    releaseOuter();
  });

  it('applies the stack to outside presses too', () => {
    render();
    const outer = vi.fn();
    const inner = vi.fn();

    const releaseOuter = createDismissable(byId('layer'), { onOutsidePress: outer });
    const releaseInner = createDismissable(byId('second-layer'), { onOutsidePress: inner });

    // Inside the outer layer, but outside the topmost one — so the topmost
    // dismisses and the one underneath stays put.
    pressOn(byId('inside'));

    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    releaseInner();
    releaseOuter();
  });

  it('unwinds by identity, not by order', () => {
    // Teardown order is the framework's business, and React does not promise
    // it is the reverse of setup. Popping blindly would strand a live layer.
    render();
    const outer = vi.fn();
    const inner = vi.fn();

    const releaseOuter = createDismissable(byId('layer'), { onEscape: outer });
    const releaseInner = createDismissable(byId('second-layer'), { onEscape: inner });

    releaseOuter();
    expect(getDismissableLayerCount()).toBe(1);

    pressEscape();
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    releaseInner();
  });

  it('stops listening once released', () => {
    render();
    const onEscape = vi.fn();
    const onOutsidePress = vi.fn();
    const release = createDismissable(byId('layer'), { onEscape, onOutsidePress });

    release();
    pressEscape();
    pressOn(byId('outside'));

    expect(onEscape).not.toHaveBeenCalled();
    expect(onOutsidePress).not.toHaveBeenCalled();
  });

  it('is safe to release twice', () => {
    render();
    const release = createDismissable(byId('layer'), { onEscape: () => {} });

    release();
    expect(() => release()).not.toThrow();
    expect(getDismissableLayerCount()).toBe(0);
  });
});
