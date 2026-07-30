import { createNormalizer, type Dict, type PropTypes } from '@caioalfonso/kanso-core';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
} from 'vue';

export interface VuePropTypes extends PropTypes {
  element: HTMLAttributes;
  button: ButtonHTMLAttributes;
  input: InputHTMLAttributes;
  label: LabelHTMLAttributes;
}

const isEventKey = (key: string): boolean => key.startsWith('on') && key.length > 2;

/**
 * Fold a neutral handler name to the single form Vue handles correctly.
 *
 * `onKeyDown` → `onKeydown`. Capital first letter, everything after it
 * lowercased. Both halves are load-bearing, and getting either wrong fails
 * silently:
 *
 * - **The tail must be lowercased.** Vue derives the DOM event name by running
 *   the part after `on` through `hyphenate`, so `onKeyDown` binds a listener
 *   for `key-down` — an event no browser fires.
 * - **The first letter must stay capitalised.** Vue only recognises a prop as
 *   an event when it matches `/^on[^a-z]/`, so `onkeydown` is not an event to
 *   it. It falls through to `key in el`, which is true, and gets assigned as
 *   the `el.onkeydown` DOM property. That works on a fresh mount, which is why
 *   it looks fine — but hydration only patches props Vue recognises as events,
 *   so a server-rendered component ends up with no handler at all. Found by the
 *   Phase 1 SSR test; see docs/01 §4.
 */
const toVueEventKey = (key: string): string =>
  `on${key.charAt(2).toUpperCase()}${key.slice(3).toLowerCase()}`;

/**
 * Translate core's neutral prop bag into Vue DOM props.
 *
 * Two jobs. Drop `undefined`, so the emitted attribute set matches React's
 * exactly — the adapters must never disagree about whether an attribute is
 * present. And fold event handler names, per above.
 *
 * `onUpdate:modelValue` is left alone: the colon marks it as a Vue component
 * event rather than a DOM one, and rewriting it would break `v-model`.
 */
export const normalizeProps = createNormalizer<VuePropTypes>((props: Dict) => {
  const out: Dict = {};

  for (const key in props) {
    const value = props[key];
    if (value === undefined) continue;

    if (isEventKey(key) && !key.includes(':')) {
      out[toVueEventKey(key)] = value;
      continue;
    }

    out[key] = value;
  }

  return out;
});
