import type { NormalizeProps, PropTypes } from '../types';

/**
 * Card has no state, no events and no behaviour — it is four elements and their
 * attributes.
 *
 * `docs/03` §7 said "no core module" and has been corrected. The instruction it
 * was protecting still holds: no state machine is manufactured for a `<div>`.
 * But leaving the attributes to two hand-written adapters is exactly the
 * arrangement that drifts — nothing fails when one of them writes
 * `data-part="body"` and the other writes `data-part="content"`, until a
 * stylesheet meets one of them. Core owns data attributes (`docs/01` §1).
 *
 * Which *tag* the parts land on stays with the adapters, because that is
 * rendering, and rendering is their half of the contract.
 */

export interface CardApi<T extends PropTypes> {
  rootProps: T['element'];
  headerProps: T['element'];
  bodyProps: T['element'];
  footerProps: T['element'];
}

export function connectCard<T extends PropTypes>(normalize: NormalizeProps<T>): CardApi<T> {
  return {
    rootProps: normalize.element({
      // Root-only markers. The stylesheet scopes itself with
      // `[data-kanso] [data-part=…]`, so these must be on the root and nowhere else.
      'data-kanso': '',
      'data-scope': 'card',
      'data-part': 'root',
    }),
    headerProps: normalize.element({ 'data-part': 'header' }),
    bodyProps: normalize.element({ 'data-part': 'body' }),
    footerProps: normalize.element({ 'data-part': 'footer' }),
  };
}
