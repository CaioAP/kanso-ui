import { createNormalizer, type Dict, type PropTypes } from '@caioalfonso/kanso-core';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export interface ReactPropTypes extends PropTypes {
  element: HTMLAttributes<HTMLElement>;
  button: ButtonHTMLAttributes<HTMLButtonElement>;
  input: InputHTMLAttributes<HTMLInputElement>;
  textarea: TextareaHTMLAttributes<HTMLTextAreaElement>;
  label: LabelHTMLAttributes<HTMLLabelElement>;
}

/** Neutral names that React spells differently. */
const propMap: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
};

/**
 * Translate core's neutral prop bag into React props.
 *
 * Core emits handler names in React's camelCase form (`onKeyDown`), so events
 * pass straight through and only `class` / `for` need renaming. The asymmetry
 * is deliberate: `keydown` → `KeyDown` cannot be derived without a word list,
 * while `KeyDown` → `keydown` is a lowercase away, so the Vue adapter carries
 * the translation. See docs/01 §4.
 */
export const normalizeProps = createNormalizer<ReactPropTypes>((props: Dict) => {
  const out: Dict = {};

  for (const key in props) {
    const value = props[key];
    if (value === undefined) continue;
    out[propMap[key] ?? key] = value;
  }

  return out;
});
