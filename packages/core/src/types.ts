/**
 * The three types that define the entire core ↔ adapter boundary.
 *
 * They are deliberately loose. Core emits one neutral prop shape; each adapter
 * narrows it to its own framework's element props. Tightening these here would
 * force core to know about `className` vs `class`, which is exactly the
 * knowledge that must stay in the adapters.
 */

/**
 * An untyped bag of props as core emits them, before an adapter translates it.
 *
 * biome-ignore lint/suspicious/noExplicitAny: the neutral prop bag holds
 * handlers, booleans, strings and `undefined`; a union would be narrower than
 * the truth and would push casts onto every adapter.
 */
export type Dict = Record<string, any>;

/**
 * The element kinds core knows how to emit props for. An adapter supplies the
 * concrete framework type for `T` — React's `HTMLAttributes`, Vue's DOM props.
 *
 * biome-ignore lint/suspicious/noExplicitAny: the default only applies when a
 * caller does not care about the framework type, e.g. in core's own tests.
 */
export interface PropTypes<T = any> {
  element: T;
  button: T;
  input: T;
  label: T;
}

/**
 * The translator each adapter supplies. Core calls these; it never constructs
 * framework-native props itself.
 */
export interface NormalizeProps<T extends PropTypes> {
  element: (props: Dict) => T['element'];
  button: (props: Dict) => T['button'];
  input: (props: Dict) => T['input'];
  label: (props: Dict) => T['label'];
}
