import { describe, expect, it } from 'vitest';
import { createNormalizer } from '../normalize';
import type { Dict, PropTypes } from '../types';
import { fieldAnatomy } from './field.anatomy';
import { connectField, fieldShowsDescription, fieldShowsErrorText } from './field.connect';
import { initialFieldState } from './field.state';
import type { FieldStateInit } from './field.types';

/** A pass-through normalizer, so these tests see exactly what core emits. */
interface IdentityPropTypes extends PropTypes {
  element: Dict;
  button: Dict;
  input: Dict;
  textarea: Dict;
  label: Dict;
}
const identity = createNormalizer<IdentityPropTypes>((props) => props);

const api = (init: Partial<FieldStateInit> = {}) =>
  connectField(initialFieldState({ id: 'email', ...init }), identity);

describe('connectField — data attributes', () => {
  it('marks the root and only the root with data-kanso', () => {
    // The stylesheet scopes itself as `[data-kanso] [data-part=…]`. A stray
    // data-kanso on a child would make every descendant selector match twice.
    const a = api();
    expect(a.rootProps['data-kanso']).toBe('');
    expect(a.labelProps['data-kanso']).toBeUndefined();
    expect(a.descriptionProps['data-kanso']).toBeUndefined();
    expect(a.errorTextProps['data-kanso']).toBeUndefined();
    expect(a.getInputProps()['data-kanso']).toBeUndefined();
  });

  it('names every part in the anatomy, and nothing outside it', () => {
    const a = api();
    const parts = [
      a.rootProps['data-part'],
      a.labelProps['data-part'],
      a.getInputProps()['data-part'],
      a.descriptionProps['data-part'],
      a.errorTextProps['data-part'],
    ];
    expect(parts).toEqual([...fieldAnatomy]);
  });

  it('gives the textarea the same part name as the input', () => {
    // They are the same part of the anatomy rendered with a different tag. A
    // stylesheet that had to know which one it got would be a design failure.
    const a = api();
    expect(a.getTextareaProps()['data-part']).toBe('control');
  });

  it('reflects each state flag on the root and the control', () => {
    const a = api({ invalid: true, disabled: true, readOnly: true, required: true });
    for (const props of [a.rootProps, a.getInputProps(), a.getTextareaProps()]) {
      expect(props['data-invalid']).toBe('');
      expect(props['data-disabled']).toBe('');
      expect(props['data-readonly']).toBe('');
      expect(props['data-required']).toBe('');
    }
  });

  it('omits the state attributes entirely when the flags are off', () => {
    // `data-invalid=""` and `data-invalid` absent are what CSS distinguishes;
    // `data-invalid="false"` would match `[data-invalid]` and style a valid
    // field as broken.
    const a = api();
    expect(a.rootProps['data-invalid']).toBeUndefined();
    expect(a.getInputProps()['data-disabled']).toBeUndefined();
  });

  it('marks the error element with data-invalid so the stylesheet can reveal it', () => {
    expect(api().errorTextProps['data-invalid']).toBeUndefined();
    expect(api({ invalid: true }).errorTextProps['data-invalid']).toBe('');
  });
});

describe('connectField — the label association', () => {
  it('points the label at the control with a native for', () => {
    // A real for/id pair, not aria-labelledby: it carries click-to-focus as
    // well as the accessible name, and no ARIA attribute does the first half.
    const a = api();
    expect(a.labelProps.for).toBe('email-control');
    expect(a.getInputProps().id).toBe('email-control');
  });

  it('emits the for even when no label is rendered', () => {
    // Deliberate. Core cannot see the consumer's children, so the dangling case
    // is caught at runtime by field.dom.ts instead of guessed at here.
    expect(api({ hasLabel: false }).labelProps.for).toBe('email-control');
  });

  it('does not also set aria-labelledby on the control', () => {
    // Two associations saying the same thing is one that can drift.
    expect(api({ hasLabel: true }).getInputProps()['aria-labelledby']).toBeUndefined();
  });
});

describe('connectField — the control', () => {
  it('forwards disabled, readOnly and required natively', () => {
    const a = api({ disabled: true, readOnly: true, required: true });
    expect(a.getInputProps().disabled).toBe(true);
    expect(a.getInputProps().readOnly).toBe(true);
    expect(a.getInputProps().required).toBe(true);
  });

  it('does not emit aria-required alongside the native attribute', () => {
    // The native attribute maps to the same accessibility property. Shipping
    // both is a redundancy that can only ever drift — docs/03 §5 decision 5.
    expect(api({ required: true }).getInputProps()['aria-required']).toBeUndefined();
  });

  it('sets aria-invalid only when invalid', () => {
    expect(api().getInputProps()['aria-invalid']).toBeUndefined();
    expect(api({ invalid: true }).getInputProps()['aria-invalid']).toBe(true);
  });

  it('gives the input and the textarea identical wiring', () => {
    // Built once, normalised twice, so the two elements cannot drift apart.
    const a = api({ invalid: true, required: true, hasDescription: true });
    expect(a.getTextareaProps()).toEqual(a.getInputProps());
  });

  it('emits no value or change handling of any kind', () => {
    // The value belongs to the consumer and to the framework's own binding. A
    // core that touched it would stand between them for no benefit.
    const input = api().getInputProps();
    expect(input.value).toBeUndefined();
    expect(input.onChange).toBeUndefined();
    expect(input.onInput).toBeUndefined();
  });
});

describe('connectField — aria-describedby composition', () => {
  it('is absent when there is nothing to describe', () => {
    expect(api().getInputProps()['aria-describedby']).toBeUndefined();
  });

  it('composes the *showing* message and the consumer’s own, not both messages', () => {
    // Only one of the two is rendered at a time, so only one may be referenced.
    // The consumer's id is still appended — theirs is a real element they own.
    const a = api({ hasDescription: true, hasErrorText: true, invalid: true });
    expect(a.getInputProps({ describedBy: 'char-count' })['aria-describedby']).toBe(
      'email-error char-count',
    );
  });

  it('composes for the textarea too', () => {
    const a = api({ hasDescription: true });
    expect(a.getTextareaProps({ describedBy: 'char-count' })['aria-describedby']).toBe(
      'email-description char-count',
    );
  });
});

describe('connectField — the error live region', () => {
  it('carries aria-live whether or not the field is invalid', () => {
    // A live region announces changes to a region already in the document.
    // Mounting the region together with its first message is how you get an
    // announcement that fires in some screen readers and not others.
    expect(api().errorTextProps['aria-live']).toBe('polite');
    expect(api({ invalid: true }).errorTextProps['aria-live']).toBe('polite');
  });

  it('reads the message whole', () => {
    expect(api().errorTextProps['aria-atomic']).toBe(true);
  });
});

describe('fieldShowsErrorText', () => {
  it('is true only when there is a message and the field is invalid', () => {
    expect(fieldShowsErrorText(initialFieldState({ id: 'x' }))).toBe(false);
    expect(fieldShowsErrorText(initialFieldState({ id: 'x', invalid: true }))).toBe(false);
    expect(fieldShowsErrorText(initialFieldState({ id: 'x', hasErrorText: true }))).toBe(false);
    expect(
      fieldShowsErrorText(initialFieldState({ id: 'x', hasErrorText: true, invalid: true })),
    ).toBe(true);
  });
});

describe('fieldShowsDescription', () => {
  it('is true whenever a description was supplied and no error is showing', () => {
    expect(fieldShowsDescription(initialFieldState({ id: 'x' }))).toBe(false);
    expect(fieldShowsDescription(initialFieldState({ id: 'x', hasDescription: true }))).toBe(true);
    // Invalid, but no message supplied — there is nothing to replace it with.
    expect(
      fieldShowsDescription(initialFieldState({ id: 'x', hasDescription: true, invalid: true })),
    ).toBe(true);
  });

  it('yields to the error, which is the whole point', () => {
    const both = initialFieldState({
      id: 'x',
      hasDescription: true,
      hasErrorText: true,
      invalid: true,
    });

    // Asserted as a pair. Either one alone can be right while the field still
    // renders two stacked regions, which is the defect this replaces.
    expect(fieldShowsDescription(both)).toBe(false);
    expect(fieldShowsErrorText(both)).toBe(true);
  });
});

describe('connectField — ids', () => {
  it('exposes the id map so adapters can reference parts they render', () => {
    expect(api().ids.control).toBe('email-control');
    expect(api().ids.errorText).toBe('email-error');
  });

  it('puts each id on the part that owns it', () => {
    const a = api();
    expect(a.rootProps.id).toBe('email');
    expect(a.labelProps.id).toBe('email-label');
    expect(a.descriptionProps.id).toBe('email-description');
    expect(a.errorTextProps.id).toBe('email-error');
  });
});
