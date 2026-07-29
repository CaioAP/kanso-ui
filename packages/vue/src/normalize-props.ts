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
 * Translate core's neutral prop bag into Vue DOM props.
 *
 * Two jobs. Drop `undefined`, so the emitted attribute set matches React's
 * exactly — the adapters must never disagree about whether an attribute is
 * present. And lowercase event handler names.
 *
 * The lowercasing is not cosmetic. Vue derives the DOM event name by running
 * the part after `on` through `hyphenate`, so `onKeyDown` binds a listener for
 * `key-down`, an event no browser fires — and it fails silently. `onkeydown`
 * hyphenates to `keydown`, which is the event that exists.
 *
 * `onUpdate:modelValue` is left alone: the colon marks it as a Vue component
 * event rather than a DOM one, and lowercasing would break `v-model`.
 */
export const normalizeProps = createNormalizer<VuePropTypes>((props: Dict) => {
  const out: Dict = {};

  for (const key in props) {
    const value = props[key];
    if (value === undefined) continue;

    if (isEventKey(key) && !key.includes(':')) {
      out[`on${key.slice(2).toLowerCase()}`] = value;
      continue;
    }

    out[key] = value;
  }

  return out;
});
