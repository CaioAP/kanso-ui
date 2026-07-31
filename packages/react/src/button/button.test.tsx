import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Button } from './button';

const button = () => screen.getByRole('button');

describe('Button — rendering', () => {
  it('renders a native button with an accessible name', () => {
    render(<Button>Save</Button>);
    expect(button().tagName).toBe('BUTTON');
    expect(button()).toHaveAccessibleName('Save');
  });

  it('defaults to type="button", so it never submits by accident', () => {
    render(<Button>Save</Button>);
    expect(button()).toHaveAttribute('type', 'button');
  });

  it('takes an explicit type', () => {
    render(<Button type="submit">Save</Button>);
    expect(button()).toHaveAttribute('type', 'submit');
  });

  it('publishes variant and size for the stylesheet', () => {
    render(
      <Button variant="ghost" size="lg">
        Save
      </Button>,
    );
    expect(button()).toHaveAttribute('data-variant', 'ghost');
    expect(button()).toHaveAttribute('data-size', 'lg');
  });

  it('marks the root and only the root with data-kanso', () => {
    render(<Button>Save</Button>);
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(button()).toHaveAttribute('data-kanso');
  });

  it('wraps the children in a label part, so the spinner can fade them', () => {
    render(<Button>Save</Button>);
    const label = document.querySelector('[data-part="label"]');
    expect(label).toHaveTextContent('Save');
  });

  it('passes className and arbitrary attributes through', () => {
    render(
      <Button className="mine" data-testid="b">
        Save
      </Button>,
    );
    expect(button()).toHaveClass('mine');
    expect(button()).toHaveAttribute('data-testid', 'b');
  });
});

describe('Button — clicking', () => {
  it('calls the consumer’s handler', async () => {
    // The defect this catches is silent: core's props are applied last, so a
    // core onClick that did not compose would delete this handler, and the
    // button would render and scan perfectly while doing nothing.
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(button());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('submits a form when type="submit"', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>,
    );

    await user.click(button());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    await user.click(button());
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Button — loading', () => {
  it('announces aria-busy and stays focusable', async () => {
    // Not `disabled`: a disabled element leaves the tab order and its state
    // change is not announced. docs/03 §6 decision 3.
    const user = userEvent.setup();
    render(<Button loading>Save</Button>);

    expect(button()).toHaveAttribute('aria-busy', 'true');
    expect(button()).toBeEnabled();

    await user.tab();
    expect(button()).toHaveFocus();
  });

  it('does not announce itself as disabled', () => {
    render(<Button loading>Save</Button>);
    expect(button()).not.toHaveAttribute('aria-disabled');
  });

  it('blocks activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    await user.click(button());
    expect(onClick).not.toHaveBeenCalled();
  });

  it('blocks form submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading>
          Save
        </Button>
      </form>,
    );

    await user.click(button());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps its accessible name while loading', () => {
    // The whole reason the label is a separate element faded with opacity.
    render(<Button loading>Save</Button>);
    expect(button()).toHaveAccessibleName('Save');
    expect(button()).toHaveAttribute('data-loading', '');
  });
});

describe('Button — accessibility', () => {
  it('has no axe violations, idle', async () => {
    const { container } = render(<Button>Save</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations, loading', async () => {
    const { container } = render(<Button loading>Save</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
