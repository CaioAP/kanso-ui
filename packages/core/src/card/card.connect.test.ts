import { describe, expect, it } from 'vitest';
import { createNormalizer } from '../normalize';
import type { Dict, PropTypes } from '../types';
import { cardAnatomy } from './card.anatomy';
import { connectCard } from './card.connect';

/** A pass-through normalizer, so these tests see exactly what core emits. */
interface IdentityPropTypes extends PropTypes {
  element: Dict;
  button: Dict;
  input: Dict;
  textarea: Dict;
  label: Dict;
}
const identity = createNormalizer<IdentityPropTypes>((props) => props);

const api = () => connectCard(identity);

describe('connectCard', () => {
  it('marks the root and only the root with data-kanso', () => {
    const a = api();
    expect(a.rootProps['data-kanso']).toBe('');
    expect(a.headerProps['data-kanso']).toBeUndefined();
    expect(a.bodyProps['data-kanso']).toBeUndefined();
    expect(a.footerProps['data-kanso']).toBeUndefined();
  });

  it('names every part in the anatomy, and nothing outside it', () => {
    // The reason this module exists at all. Left to two hand-written adapters,
    // one of them eventually writes `data-part="content"` and nothing fails
    // until a stylesheet meets it.
    const a = api();
    expect([
      a.rootProps['data-part'],
      a.headerProps['data-part'],
      a.bodyProps['data-part'],
      a.footerProps['data-part'],
    ]).toEqual([...cardAnatomy]);
  });

  it('emits no state, because a card has none', () => {
    const a = api();
    expect(a.rootProps['data-state']).toBeUndefined();
    expect(a.rootProps.role).toBeUndefined();
    expect(a.rootProps.tabIndex).toBeUndefined();
  });

  it('scopes itself so the stylesheet can find it', () => {
    expect(api().rootProps['data-scope']).toBe('card');
  });
});
