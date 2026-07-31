// @vitest-environment jsdom
//
// The core project runs in `node` so that a stray module-scope `document` read
// crashes rather than passes (see `roving-focus.test.ts`). These utilities are
// *about* the DOM, so they opt into jsdom per file — which keeps that guard in
// place for every other file in core.

import { afterEach, describe, expect, it } from 'vitest';
import { getFocusableEdges, getFocusableElements } from './focusable';

function render(html: string): HTMLElement {
  document.body.innerHTML = `<div id="container">${html}</div>`;
  const container = document.getElementById('container');
  if (container === null) throw new Error('fixture did not render');
  return container;
}

const ids = (elements: HTMLElement[]): string[] => elements.map((element) => element.id);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getFocusableElements — what counts', () => {
  it('finds the usual controls, in document order', () => {
    const container = render(`
      <a id="link" href="#x">link</a>
      <button id="button">button</button>
      <input id="input" />
      <select id="select"></select>
      <textarea id="textarea"></textarea>
    `);

    expect(ids(getFocusableElements(container))).toEqual([
      'link',
      'button',
      'input',
      'select',
      'textarea',
    ]);
  });

  it('finds elements made focusable by tabindex or contenteditable', () => {
    const container = render(`
      <div id="stop" tabindex="0">focusable div</div>
      <div id="editor" contenteditable="true">editable</div>
      <div id="plain">not focusable</div>
    `);

    expect(ids(getFocusableElements(container))).toEqual(['stop', 'editor']);
  });

  it('skips an anchor with no href, which is not a tab stop', () => {
    const container = render('<a id="anchor">no href</a><button id="button">ok</button>');
    expect(ids(getFocusableElements(container))).toEqual(['button']);
  });

  it('never includes the container itself', () => {
    // A trap that counts its own container as a stop cycles through it on every
    // pass, and the dialog content really does carry tabindex="-1".
    document.body.innerHTML = '<div id="container" tabindex="-1"><button id="b">b</button></div>';
    const container = document.getElementById('container');
    if (container === null) throw new Error('fixture did not render');

    expect(ids(getFocusableElements(container))).toEqual(['b']);
  });
});

describe('getFocusableElements — what is excluded', () => {
  it('excludes disabled controls', () => {
    const container = render('<button id="a" disabled>a</button><button id="b">b</button>');
    expect(ids(getFocusableElements(container))).toEqual(['b']);
  });

  it('excludes tabindex="-1", which is script-focusable but not a tab stop', () => {
    const container = render('<button id="a" tabindex="-1">a</button><button id="b">b</button>');
    expect(ids(getFocusableElements(container))).toEqual(['b']);
  });

  it('excludes an inert element and everything inside it', () => {
    // The module that applies `inert` is the trap itself, so this is what stops
    // a nested trap from wrapping onto the layer underneath it.
    const container = render(`
      <div inert><button id="behind">behind</button></div>
      <button id="front">front</button>
    `);

    expect(ids(getFocusableElements(container))).toEqual(['front']);
  });

  it('excludes a hidden input and contenteditable="false"', () => {
    const container = render(`
      <input id="hidden-input" type="hidden" value="csrf" />
      <div id="locked" contenteditable="false">not editable</div>
      <button id="b">b</button>
    `);

    expect(ids(getFocusableElements(container))).toEqual(['b']);
  });

  it('excludes the hidden attribute', () => {
    const container = render('<button id="a" hidden>a</button><button id="b">b</button>');
    expect(ids(getFocusableElements(container))).toEqual(['b']);
  });

  it('excludes display:none and visibility:hidden, including from an ancestor', () => {
    const container = render(`
      <button id="none" style="display:none">none</button>
      <button id="invisible" style="visibility:hidden">invisible</button>
      <div style="display:none"><button id="inherited">inherited</button></div>
      <button id="visible">visible</button>
    `);

    expect(ids(getFocusableElements(container))).toEqual(['visible']);
  });
});

describe('getFocusableEdges', () => {
  it('returns the first and last stop', () => {
    const container = render(`
      <button id="first">first</button>
      <button id="middle">middle</button>
      <button id="last">last</button>
    `);

    const edges = getFocusableEdges(container);
    expect(edges?.first.id).toBe('first');
    expect(edges?.last.id).toBe('last');
  });

  it('collapses to one element when there is only one', () => {
    const container = render('<button id="only">only</button>');

    const edges = getFocusableEdges(container);
    expect(edges?.first).toBe(edges?.last);
  });

  it('is undefined when nothing inside can be focused', () => {
    // The caller has to distinguish "wrap between these two" from "there is
    // nowhere to go", and the second is what makes a trap prevent Tab outright.
    const container = render('<p>just text</p><button disabled>no</button>');
    expect(getFocusableEdges(container)).toBeUndefined();
  });
});
