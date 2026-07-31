import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Card } from './card';

const root = () => document.querySelector('[data-part="root"]') as HTMLElement;

const sample = (
  <Card.Root>
    <Card.Header>
      <h3>Kanso</h3>
    </Card.Header>
    <Card.Body>
      <p>Simplicity through the elimination of clutter.</p>
    </Card.Body>
    <Card.Footer>
      <a href="/read">Read more</a>
    </Card.Footer>
  </Card.Root>
);

describe('Card', () => {
  it('renders a div by default', () => {
    render(sample);
    expect(root().tagName).toBe('DIV');
  });

  it('renders the tag the `as` prop asks for', () => {
    render(<Card.Root as="article">body</Card.Root>);
    expect(root().tagName).toBe('ARTICLE');
  });

  it('marks the root and only the root with data-kanso', () => {
    render(sample);
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(root()).toHaveAttribute('data-kanso');
  });

  it('names every part', () => {
    render(sample);
    const parts = [...root().children].map((child) => child.getAttribute('data-part'));
    expect(parts).toEqual(['header', 'body', 'footer']);
  });

  it('passes className and arbitrary attributes through', () => {
    render(
      <Card.Root className="mine" data-testid="c">
        body
      </Card.Root>,
    );
    expect(root()).toHaveClass('mine');
    expect(root()).toHaveAttribute('data-testid', 'c');
  });

  it('adds no role, tabindex or state of its own', () => {
    // A card is layout. Anything else here would be a claim about semantics
    // the consumer did not ask for.
    render(sample);
    expect(root()).not.toHaveAttribute('role');
    expect(root()).not.toHaveAttribute('tabindex');
    expect(root()).not.toHaveAttribute('data-state');
  });

  it('leaves interactive children reachable', () => {
    // The trap the docs page teaches: a card wrapped in a link would swallow
    // this one. Nothing in the component does that, and this says so.
    render(sample);
    expect(screen.getByRole('link', { name: 'Read more' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(sample);
    expect(await axe(container)).toHaveNoViolations();
  });
});
