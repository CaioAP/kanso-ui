import { connectCard } from '@caioalfonso/kanso-core';
import { defineComponent, h, type PropType } from 'vue';
import { normalizeProps } from '../normalize-props';

/**
 * Mirror of packages/react/src/card/card.tsx.
 *
 * Layout only. No state, no behaviour, no injection — each part reads its own
 * attributes from core and renders them. `connectCard` is stateless, so calling
 * it per part costs nothing and avoids a provide whose only content would be
 * four constant objects.
 */

const api = () => connectCard(normalizeProps);

/** `div` by default; `article` and `section` are the usual alternatives. */
export type CardElement = 'div' | 'article' | 'section' | 'li';

export const CardRoot = defineComponent({
  name: 'KansoCardRoot',

  props: {
    /** The tag to render. Rendering is the adapter's half of the contract. */
    as: { type: String as PropType<CardElement>, default: 'div' },
  },

  inheritAttrs: false,

  setup(props, { attrs, slots }) {
    return () => h(props.as, { ...attrs, ...api().rootProps }, slots.default?.());
  },
});

export const CardHeader = defineComponent({
  name: 'KansoCardHeader',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('div', { ...attrs, ...api().headerProps }, slots.default?.());
  },
});

export const CardBody = defineComponent({
  name: 'KansoCardBody',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('div', { ...attrs, ...api().bodyProps }, slots.default?.());
  },
});

export const CardFooter = defineComponent({
  name: 'KansoCardFooter',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('div', { ...attrs, ...api().footerProps }, slots.default?.());
  },
});

/** Namespace form, which is how the docs show it: `<Card.Root>`, `<Card.Body>`… */
export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
};
