// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertFieldControl, scheduleFieldControlCheck } from './field.dom';

/**
 * The one runtime check Field has. It exists because the label's `for` is
 * emitted unconditionally — core cannot see whether the consumer put a control
 * inside — so the dangling case has to be found by looking at the DOM.
 */

const render = (inner: string): HTMLElement => {
  document.body.innerHTML = `<div id="email">${inner}</div>`;
  const root = document.getElementById('email');
  if (root === null) throw new Error('no root');
  return root;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('assertFieldControl', () => {
  it('says nothing when the control id resolves', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = render('<input id="email-control" />');

    assertFieldControl(root, 'email-control');

    expect(error).not.toHaveBeenCalled();
  });

  it('warns, naming the field, when nothing carries the control id', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = render('<label for="email-control">Email</label>');

    assertFieldControl(root, 'email-control');

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain('email');
    expect(error.mock.calls[0]?.[0]).toContain('no control');
  });

  it('searches the whole document, not only the field', () => {
    // A consumer may render the control outside the root — unusual, but the
    // association is by id and the browser resolves it document-wide, so the
    // check has to agree with the browser rather than with the markup we expect.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = render('<label for="email-control">Email</label>');
    document.body.insertAdjacentHTML('beforeend', '<input id="email-control" />');

    assertFieldControl(root, 'email-control');

    expect(error).not.toHaveBeenCalled();
  });
});

describe('scheduleFieldControlCheck', () => {
  it('defers the check by a task, so a mount hook can run before it', () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = render('<label for="email-control">Email</label>');

    scheduleFieldControlCheck(root, 'email-control');
    expect(error).not.toHaveBeenCalled();

    // The control arrives in the same task the field mounted in, which is what
    // both frameworks do when rendering parent and child together.
    root.insertAdjacentHTML('beforeend', '<input id="email-control" />');
    vi.runAllTimers();

    expect(error).not.toHaveBeenCalled();
  });

  it('warns after the task when the control never arrives', () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = render('<label for="email-control">Email</label>');

    scheduleFieldControlCheck(root, 'email-control');
    vi.runAllTimers();

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('says nothing about a field that unmounted before the check ran', () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = render('<label for="email-control">Email</label>');

    scheduleFieldControlCheck(root, 'email-control');
    root.remove();
    vi.runAllTimers();

    expect(error).not.toHaveBeenCalled();
  });

  it('can be cancelled', () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = render('<label for="email-control">Email</label>');

    const cancel = scheduleFieldControlCheck(root, 'email-control');
    cancel();
    vi.runAllTimers();

    expect(error).not.toHaveBeenCalled();
  });
});
