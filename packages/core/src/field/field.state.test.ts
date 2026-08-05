import { describe, expect, it } from 'vitest';
import { fieldDescribedBy, fieldIds, fieldMessage, initialFieldState } from './field.state';
import type { FieldStateInit } from './field.types';

const state = (init: Partial<FieldStateInit> = {}) => initialFieldState({ id: 'email', ...init });

describe('fieldIds', () => {
  it('takes the supplied id verbatim for the root', () => {
    // So a consumer who passes id="email" can select #email and get the field.
    expect(fieldIds('email').root).toBe('email');
  });

  it('derives every other id as a suffix, deterministically', () => {
    expect(fieldIds('email')).toEqual({
      root: 'email',
      label: 'email-label',
      control: 'email-control',
      description: 'email-description',
      errorText: 'email-error',
    });
    // Pure and total: the same input twice is the same output. This is what
    // makes the server render and the client render agree.
    expect(fieldIds('email')).toEqual(fieldIds('email'));
  });
});

describe('initialFieldState', () => {
  it('defaults every flag to false', () => {
    const s = state();
    expect(s.invalid).toBe(false);
    expect(s.disabled).toBe(false);
    expect(s.readOnly).toBe(false);
    expect(s.required).toBe(false);
    expect(s.hasLabel).toBe(false);
    expect(s.hasDescription).toBe(false);
    expect(s.hasErrorText).toBe(false);
  });

  it('carries the presence flags through untouched', () => {
    // They are inputs, not deductions: the adapter knows during render whether
    // it is going to render each part, and that is the whole of the SSR story.
    const s = state({ hasLabel: true, hasDescription: true, hasErrorText: true });
    expect(s.hasLabel).toBe(true);
    expect(s.hasDescription).toBe(true);
    expect(s.hasErrorText).toBe(true);
  });
});

describe('fieldDescribedBy — the four cases the roadmap names', () => {
  it('is undefined with neither part, not an empty string', () => {
    // The distinction is the point: aria-describedby="" is not the same as no
    // aria-describedby, and a test written as toBe('') passes on the broken
    // version. Assert absence.
    expect(fieldDescribedBy(state())).toBeUndefined();
  });

  it('is the description id alone', () => {
    expect(fieldDescribedBy(state({ hasDescription: true }))).toBe('email-description');
  });

  it('is the error id alone, but only while invalid', () => {
    expect(fieldDescribedBy(state({ hasErrorText: true, invalid: true }))).toBe('email-error');
  });

  it('drops the error id when the field is valid', () => {
    // The element exists so that the live region is already in the document,
    // but it holds no message, and describing a field with nothing is a claim
    // that is not true.
    expect(fieldDescribedBy(state({ hasErrorText: true }))).toBeUndefined();
  });

  it('is the error id *alone* when both were supplied and the field is invalid', () => {
    // Not "the error id is present" — the description id must be absent. The
    // description is not rendered while an error is showing, so referencing it
    // would be a dangling idref, and a test that only checked for inclusion
    // would pass on the version that leaves it in.
    const both = state({ hasDescription: true, hasErrorText: true, invalid: true });
    expect(fieldDescribedBy(both)).toBe('email-error');
  });

  it('falls back to the description as soon as the field is valid again', () => {
    const both = state({ hasDescription: true, hasErrorText: true });
    expect(fieldDescribedBy(both)).toBe('email-description');
  });
});

describe('fieldMessage — one region of text, never two', () => {
  it('is the description when there is no error to show', () => {
    expect(fieldMessage(state({ hasDescription: true }))).toBe('description');
    expect(fieldMessage(state({ hasDescription: true, hasErrorText: true }))).toBe('description');
  });

  it('is the error while invalid, whether or not a description exists', () => {
    expect(fieldMessage(state({ hasErrorText: true, invalid: true }))).toBe('error-text');
    expect(fieldMessage(state({ hasDescription: true, hasErrorText: true, invalid: true }))).toBe(
      'error-text',
    );
  });

  it('is undefined when the field has nothing to say', () => {
    expect(fieldMessage(state())).toBeUndefined();
    // Invalid with no message supplied is still nothing to say: `aria-invalid`
    // carries the state, and an empty region carries no text.
    expect(fieldMessage(state({ invalid: true }))).toBeUndefined();
  });
});

describe('fieldDescribedBy — the consumer’s own ids', () => {
  it('appends them rather than replacing ours', () => {
    // Every adapter applies core's props last so core wins, which means a
    // consumer's aria-describedby is otherwise dropped in silence.
    const s = state({ hasDescription: true });
    expect(fieldDescribedBy(s, 'char-count')).toBe('email-description char-count');
  });

  it('is the consumer’s alone when the field has nothing to add', () => {
    expect(fieldDescribedBy(state(), 'char-count')).toBe('char-count');
  });

  it('keeps a multi-id list as multiple ids', () => {
    const s = state({ hasDescription: true });
    expect(fieldDescribedBy(s, 'char-count format-hint')).toBe(
      'email-description char-count format-hint',
    );
  });

  it('normalises whitespace, because an idref list is whitespace-separated', () => {
    // "a  b" and "a\nb" are both two ids to the parser. Joining them back with
    // single spaces keeps the attribute readable and the assertion honest.
    const s = state();
    expect(fieldDescribedBy(s, '  char-count \n format-hint  ')).toBe('char-count format-hint');
  });

  it('ignores an empty or whitespace-only value', () => {
    expect(fieldDescribedBy(state(), '')).toBeUndefined();
    expect(fieldDescribedBy(state(), '   ')).toBeUndefined();
  });
});
