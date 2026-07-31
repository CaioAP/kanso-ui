import { createNormalizer, type Dict, type PropTypes } from '@caioalfonso/kanso-core';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from 'vue';

export interface VuePropTypes extends PropTypes {
  element: HTMLAttributes;
  button: ButtonHTMLAttributes;
  input: InputHTMLAttributes;
  textarea: TextareaHTMLAttributes;
  label: LabelHTMLAttributes;
}

const isEventKey = (key: string): boolean => key.startsWith('on') && key.length > 2;

/**
 * Neutral names Vue spells differently.
 *
 * Core emits React's spelling for the same reason it emits `onKeyDown` — one of
 * the two adapters has to carry the translation, and the mapping in this
 * direction is a lookup rather than a guess.
 *
 * `readOnly` is not merely cosmetic here. Vue decides between a DOM property
 * and an attribute with `key in el`, and `readOnly` *is* a property of an
 * `<input>`, so the unmapped name would be assigned as a property on the
 * client. That works on a fresh mount, and the server renderer meanwhile emits
 * the literal `readOnly="true"` because its boolean-attribute list is
 * lowercase — the same shape of client/server divergence the event-name folding
 * above exists to prevent. With `readonly`, both halves take the
 * boolean-attribute path and agree.
 */
const propMap: Record<string, string> = {
  readOnly: 'readonly',
};

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
 * Three jobs. Drop `undefined`, so the emitted attribute set matches React's
 * exactly — the adapters must never disagree about whether an attribute is
 * present. Fold event handler names, and rename the few props above.
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

    out[propMap[key] ?? key] = value;
  }

  return out;
});
