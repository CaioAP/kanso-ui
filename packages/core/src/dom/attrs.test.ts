import { describe, expect, it } from 'vitest';
import { ariaAttr, dataAttr } from './attrs';

describe('dataAttr', () => {
  it('returns an empty string when true, so the attribute renders bare', () => {
    expect(dataAttr(true)).toBe('');
  });

  it('returns undefined when false, so the attribute is omitted', () => {
    expect(dataAttr(false)).toBeUndefined();
  });

  it('returns undefined when the condition is undefined', () => {
    expect(dataAttr(undefined)).toBeUndefined();
  });
});

describe('ariaAttr', () => {
  it('returns true when the condition holds', () => {
    expect(ariaAttr(true)).toBe(true);
  });

  it('returns undefined when false, rather than the string "false"', () => {
    expect(ariaAttr(false)).toBeUndefined();
  });

  it('returns undefined when the condition is undefined', () => {
    expect(ariaAttr(undefined)).toBeUndefined();
  });
});
