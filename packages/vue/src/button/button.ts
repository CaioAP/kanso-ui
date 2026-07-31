import {
  type ButtonPressEvent,
  type ButtonSize,
  type ButtonType,
  type ButtonVariant,
  connectButton,
  initialButtonState,
} from '@caioalfonso/kanso-core';
import { computed, defineComponent, h, type PropType } from 'vue';
import { normalizeProps } from '../normalize-props';

/**
 * Mirror of packages/react/src/button/button.tsx.
 *
 * Presentational, with one piece of behaviour: while `loading`, a press does
 * nothing. The consumer's `onClick` arrives as a fallthrough attr and is handed
 * to core rather than left in the spread — core's props are applied last so
 * that they win, which would otherwise delete the handler. `docs/03` §6
 * decision 2.
 */
export const Button = defineComponent({
  name: 'KansoButton',

  props: {
    variant: { type: String as PropType<ButtonVariant>, default: 'solid' },
    size: { type: String as PropType<ButtonSize>, default: 'md' },
    /** Native. Removes the button from the tab order — for loading, use `loading`. */
    disabled: { type: Boolean, default: false },
    /**
     * Working, not unavailable. The button stays focusable and announces
     * `aria-busy`; activation is blocked, including form submission.
     */
    loading: { type: Boolean, default: false },
    /** Defaults to `'button'`, so a button in a form never submits by accident. */
    type: { type: String as PropType<ButtonType>, default: 'button' },
  },

  // Applied by hand below, so that core's props win over a consumer's.
  inheritAttrs: false,

  setup(props, { attrs, slots }) {
    const api = computed(() =>
      connectButton(
        initialButtonState({
          variant: props.variant,
          size: props.size,
          disabled: props.disabled,
          loading: props.loading,
          type: props.type,
          // Vue hands the consumer's listener in as a fallthrough attr. Taking
          // it out here and giving it to core is what keeps the guard in one
          // place; leaving it in `attrs` would let core's own onClick replace it.
          onClick: attrs.onClick as ((event: ButtonPressEvent) => void) | undefined,
        }),
        normalizeProps,
      ),
    );

    return () => {
      const { onClick: _consumerOnClick, ...rest } = attrs;
      return h('button', { ...rest, ...api.value.rootProps }, [
        // The label is a real element so the stylesheet can fade it with
        // `opacity` while the spinner runs. `visibility: hidden` and
        // `display: none` would both take the button's accessible name with them.
        h('span', api.value.labelProps, slots.default?.()),
      ]);
    };
  },
});
