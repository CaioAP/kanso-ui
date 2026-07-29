import type { Dict, NormalizeProps, PropTypes } from './types';

/**
 * Build a {@link NormalizeProps} from a single translation function.
 *
 * Every adapter so far translates all element kinds identically, so the four
 * entry points share one implementation. The shape stays four separate
 * functions because a future adapter may need to diverge — Vue already treats
 * `<input>` value binding differently from a plain element.
 */
export function createNormalizer<T extends PropTypes>(
  translate: (props: Dict) => Dict,
): NormalizeProps<T> {
  return {
    element: translate,
    button: translate,
    input: translate,
    label: translate,
  };
}
