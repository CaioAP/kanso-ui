import { describe, expect, it, vi } from 'vitest';
import { createNormalizer } from '../normalize';
import type { Dict, PropTypes } from '../types';
import { buttonAnatomy } from './button.anatomy';
import { connectButton } from './button.connect';
import { initialButtonState } from './button.state';
import type { ButtonPressEvent, ButtonStateInit } from './button.types';

/** A pass-through normalizer, so these tests see exactly what core emits. */
interface IdentityPropTypes extends PropTypes {
  element: Dict;
  button: Dict;
  input: Dict;
  textarea: Dict;
  label: Dict;
}
const identity = createNormalizer<IdentityPropTypes>((props) => props);

const api = (init: ButtonStateInit = {}) => connectButton(initialButtonState(init), identity);

/** The smallest thing that satisfies `ButtonPressEvent`. */
const pressEvent = (): ButtonPressEvent & { preventDefault: ReturnType<typeof vi.fn> } => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
});

describe('initialButtonState', () => {
  it('defaults to a solid, medium, non-submitting button', () => {
    const state = initialButtonState();
    expect(state.variant).toBe('solid');
    expect(state.size).toBe('md');
    expect(state.type).toBe('button');
    expect(state.disabled).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('defaults type to "button" so a button in a form never submits by accident', () => {
    expect(initialButtonState().type).toBe('button');
    expect(initialButtonState({ type: 'submit' }).type).toBe('submit');
  });
});

describe('connectButton — data attributes', () => {
  it('marks the root and only the root with data-kanso', () => {
    const a = api();
    expect(a.rootProps['data-kanso']).toBe('');
    expect(a.labelProps['data-kanso']).toBeUndefined();
  });

  it('names every part in the anatomy', () => {
    const a = api();
    expect([a.rootProps['data-part'], a.labelProps['data-part']]).toEqual([...buttonAnatomy]);
  });

  it('publishes the variant and size for the stylesheet to key off', () => {
    const a = api({ variant: 'ghost', size: 'lg' });
    expect(a.rootProps['data-variant']).toBe('ghost');
    expect(a.rootProps['data-size']).toBe('lg');
  });

  it('marks both parts as loading, so the label can fade itself', () => {
    const a = api({ loading: true });
    expect(a.rootProps['data-loading']).toBe('');
    expect(a.labelProps['data-loading']).toBe('');
  });

  it('omits data-loading entirely when idle', () => {
    expect(api().rootProps['data-loading']).toBeUndefined();
    expect(api().labelProps['data-loading']).toBeUndefined();
  });
});

describe('connectButton — loading is busy, not disabled', () => {
  it('sets aria-busy and leaves the button enabled', () => {
    // A disabled element is out of the tab order and its state change is not
    // announced. Loading has to stay focusable — docs/03 §6 decision 3.
    const a = api({ loading: true });
    expect(a.rootProps['aria-busy']).toBe(true);
    expect(a.rootProps.disabled).toBe(false);
  });

  it('does not also claim aria-disabled', () => {
    expect(api({ loading: true }).rootProps['aria-disabled']).toBeUndefined();
  });

  it('emits no aria-busy at all when idle', () => {
    expect(api().rootProps['aria-busy']).toBeUndefined();
  });

  it('still forwards a real disabled', () => {
    expect(api({ disabled: true }).rootProps.disabled).toBe(true);
    expect(api({ disabled: true }).rootProps['data-disabled']).toBe('');
  });
});

describe('connectButton — the composed click handler', () => {
  it('calls the consumer’s handler on an ordinary press', () => {
    // The defect this prevents is silent: every adapter applies core's props
    // last, so a core onClick that did not compose would delete the consumer's,
    // and the button would render and scan perfectly while doing nothing.
    const onClick = vi.fn();
    api({ onClick }).rootProps.onClick(pressEvent());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('passes the event through untouched', () => {
    const onClick = vi.fn();
    const event = pressEvent();
    api({ onClick }).rootProps.onClick(event);
    expect(onClick).toHaveBeenCalledWith(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('does not call the handler while loading', () => {
    const onClick = vi.fn();
    api({ onClick, loading: true }).rootProps.onClick(pressEvent());
    expect(onClick).not.toHaveBeenCalled();
  });

  it('cancels the default while loading, so a submit button cannot submit', () => {
    const event = pressEvent();
    api({ loading: true, type: 'submit' }).rootProps.onClick(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('is present even with no consumer handler, and does not throw', () => {
    expect(() => api().rootProps.onClick(pressEvent())).not.toThrow();
    expect(() => api({ loading: true }).rootProps.onClick(pressEvent())).not.toThrow();
  });
});
