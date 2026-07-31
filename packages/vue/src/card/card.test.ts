import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { defineComponent, h } from 'vue';
import { Card, CardRoot } from './card';

/** Deliberately a mirror of packages/react/src/card/card.test.tsx. */

const root = () => document.querySelector('[data-part="root"]') as HTMLElement;

const Sample = defineComponent({
  setup: () => () =>
    h(Card.Root, null, {
      default: () => [
        h(Card.Header, null, { default: () => h('h3', 'Kanso') }),
        h(Card.Body, null, {
          default: () => h('p', 'Simplicity through the elimination of clutter.'),
        }),
        h(Card.Footer, null, { default: () => h('a', { href: '/read' }, 'Read more') }),
      ],
    }),
});

describe('Card', () => {
  it('renders a div by default', () => {
    render(Sample);
    expect(root().tagName).toBe('DIV');
  });

  it('renders the tag the `as` prop asks for', () => {
    render(CardRoot, { props: { as: 'article' }, slots: { default: () => 'body' } as never });
    expect(root().tagName).toBe('ARTICLE');
  });

  it('marks the root and only the root with data-kanso', () => {
    render(Sample);
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(root()).toHaveAttribute('data-kanso');
  });

  it('names every part', () => {
    render(Sample);
    const parts = [...root().children].map((child) => child.getAttribute('data-part'));
    expect(parts).toEqual(['header', 'body', 'footer']);
  });

  it('passes class and arbitrary attributes through', () => {
    render(CardRoot, {
      attrs: { class: 'mine', 'data-testid': 'c' },
      slots: { default: () => 'body' } as never,
    });
    expect(root()).toHaveClass('mine');
    expect(root()).toHaveAttribute('data-testid', 'c');
  });

  it('adds no role, tabindex or state of its own', () => {
    // A card is layout. Anything else here would be a claim about semantics
    // the consumer did not ask for.
    render(Sample);
    expect(root()).not.toHaveAttribute('role');
    expect(root()).not.toHaveAttribute('tabindex');
    expect(root()).not.toHaveAttribute('data-state');
  });

  it('leaves interactive children reachable', () => {
    // The trap the docs page teaches: a card wrapped in a link would swallow
    // this one. Nothing in the component does that, and this says so.
    render(Sample);
    expect(screen.getByRole('link', { name: 'Read more' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(Sample);
    expect(await axe(container)).toHaveNoViolations();
  });
});
