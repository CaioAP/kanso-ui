import { describe, expect, it, vi } from 'vitest';
import { createNormalizer } from './normalize';
import type { PropTypes } from './types';

type TestPropTypes = PropTypes<Record<string, unknown>>;

describe('createNormalizer', () => {
  it('exposes every element kind the boundary defines', () => {
    const normalize = createNormalizer<TestPropTypes>((props) => props);
    expect(Object.keys(normalize).sort()).toEqual(['button', 'element', 'input', 'label']);
  });

  it('routes every element kind through the supplied translator', () => {
    const translate = vi.fn((props) => ({ ...props, seen: true }));
    const normalize = createNormalizer<TestPropTypes>(translate);

    for (const kind of ['element', 'button', 'input', 'label'] as const) {
      expect(normalize[kind]({ id: kind })).toEqual({ id: kind, seen: true });
    }
    expect(translate).toHaveBeenCalledTimes(4);
  });
});
