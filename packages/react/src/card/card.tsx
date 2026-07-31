import { connectCard } from '@caioalfonso/kanso-core';
import {
  type ComponentPropsWithRef,
  createElement,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { normalizeProps } from '../normalize-props';

/**
 * Layout only. No state, no behaviour, no context — each part reads its own
 * attributes from core and renders them.
 *
 * `connectCard` is stateless, so calling it per part costs nothing and avoids a
 * context whose only content would be four constant objects.
 *
 * The one real accessibility trap is documented rather than prevented: never
 * wrap a card that contains links or buttons in another link. The docs page
 * shows the pseudo-element whole-card link, and says plainly what it costs — a
 * second interactive element inside the card becomes unreachable by pointer.
 */

const api = () => connectCard(normalizeProps);

/** `div` by default; `article` and `section` are the usual alternatives. */
export type CardElement = 'div' | 'article' | 'section' | 'li';

/**
 * Typed against `HTMLElement` rather than `HTMLDivElement`, because `as` makes
 * the rendered tag a union and a `Ref<HTMLDivElement>` cannot be handed to an
 * `<li>`. The looser element type is the honest one here: the caller chose the
 * tag, so only they know what the ref will point at.
 */
export interface CardRootProps extends HTMLAttributes<HTMLElement> {
  /** The tag to render. Rendering is the adapter's half of the contract. */
  as?: CardElement;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

export function CardRoot({ as = 'div', children, ...attributes }: CardRootProps) {
  // `createElement` rather than `<Tag>`: in JSX, a union of intrinsic tags is
  // checked against each member, and `Ref<HTMLElement>` is not assignable to
  // the `Ref<HTMLDivElement>` the `div` branch wants. The props are already
  // checked at the call site by `CardRootProps`; this is the one place that has
  // to be told the tag is chosen at runtime.
  return createElement(as, { ...attributes, ...api().rootProps }, children);
}

export interface CardPartProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

export function CardHeader({ children, ...attributes }: CardPartProps) {
  return (
    <div {...attributes} {...api().headerProps}>
      {children}
    </div>
  );
}

export function CardBody({ children, ...attributes }: CardPartProps) {
  return (
    <div {...attributes} {...api().bodyProps}>
      {children}
    </div>
  );
}

export function CardFooter({ children, ...attributes }: CardPartProps) {
  return (
    <div {...attributes} {...api().footerProps}>
      {children}
    </div>
  );
}

/** Namespace form, which is how the docs show it: `<Card.Root>`, `<Card.Body>`… */
export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
};
