import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Field, Input, Textarea } from './field';

const root = () => document.querySelector('[data-part="root"]') as HTMLElement;
const control = () => document.querySelector('[data-part="control"]') as HTMLElement;
const errorText = () => document.querySelector('[data-part="error-text"]');

/** The dev-only missing-control check is scheduled a task out. */
const flushTasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Field — rendering', () => {
  it('gives the control its accessible name from a real label', () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    expect(control()).toHaveAccessibleName('Email');
    expect(document.querySelector('label')).toHaveAttribute('for', control().id);
  });

  it('focuses the control when the label is clicked', async () => {
    // The half of the association that no ARIA attribute provides.
    const user = userEvent.setup();
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );

    await user.click(screen.getByText('Email'));
    expect(control()).toHaveFocus();
  });

  it('marks the root and only the root with data-kanso', () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(root()).toHaveAttribute('data-kanso');
  });

  it('puts a consumer id on the root verbatim and derives the rest', () => {
    render(
      <Field label="Email" id="email">
        <Input />
      </Field>,
    );
    expect(root()).toHaveAttribute('id', 'email');
    expect(control()).toHaveAttribute('id', 'email-control');
  });

  it('passes className and arbitrary attributes through to the root', () => {
    render(
      <Field label="Email" className="mine" data-testid="f">
        <Input />
      </Field>,
    );
    expect(root()).toHaveClass('mine');
    expect(root()).toHaveAttribute('data-testid', 'f');
  });

  it('renders no label element when none was given', () => {
    render(
      <Field aria-label="unused">
        <Input aria-label="Email" />
      </Field>,
    );
    expect(document.querySelector('label')).toBeNull();
  });

  it('renders the parts in the order the a11y tree wants them', () => {
    render(
      <Field label="Email" description="Help" errorText="Bad" invalid>
        <Input />
      </Field>,
    );
    const parts = [...root().children].map((child) => child.getAttribute('data-part'));
    // No description: the field is invalid, and one region of text below the
    // control is the contract. The error element is still last because it is
    // mounted whenever a message was supplied — it is the live region.
    expect(parts).toEqual(['label', 'control', 'error-text']);
  });

  it('shows the description again once the field is valid', () => {
    const { rerender } = render(
      <Field label="Email" description="Help" errorText="Bad" invalid>
        <Input />
      </Field>,
    );

    rerender(
      <Field label="Email" description="Help" errorText="Bad">
        <Input />
      </Field>,
    );

    const parts = [...root().children].map((child) => child.getAttribute('data-part'));
    expect(parts).toEqual(['label', 'control', 'description', 'error-text']);
  });
});

describe('Field — aria-describedby, the four cases', () => {
  const setup = (props: Record<string, unknown>) =>
    render(
      <Field label="Email" {...props}>
        <Input />
      </Field>,
    );

  it('has no attribute at all when there is nothing to describe', () => {
    // Absent, not empty. aria-describedby="" is a different thing.
    setup({});
    expect(control()).not.toHaveAttribute('aria-describedby');
  });

  it('points at the description alone', () => {
    setup({ description: 'We only use this to sign you in.' });
    expect(control()).toHaveAccessibleDescription('We only use this to sign you in.');
  });

  it('points at the error alone while invalid', () => {
    setup({ errorText: 'Enter an email address.', invalid: true });
    expect(control()).toHaveAccessibleDescription('Enter an email address.');
  });

  it('points at the error alone when both were supplied, never at both', () => {
    // The description is not rendered while an error is showing, so a control
    // still describing it would be pointing at nothing. Asserted through the
    // accessible description, which is computed from the live DOM — a dangling
    // idref contributes nothing and would show up as the error text alone
    // either way, so the absence of the element is asserted too.
    setup({ description: 'Help text.', errorText: 'Enter an email address.', invalid: true });
    expect(control()).toHaveAccessibleDescription('Enter an email address.');
    expect(document.querySelector('[data-part="description"]')).toBeNull();
  });

  it('drops the error id while the field is valid', () => {
    setup({ description: 'Help text.', errorText: 'Enter an email address.' });
    expect(control()).toHaveAccessibleDescription('Help text.');
  });
});

describe('Field — the consumer’s own aria-describedby', () => {
  it('is composed with the field’s, not replaced by it', () => {
    // Core props are applied last so they win, which is why the control has to
    // hand the consumer's value in rather than letting the spread drop it.
    render(
      <>
        <Field label="Bio" description="Keep it short.">
          <Textarea aria-describedby="counter" />
        </Field>
        <span id="counter">140 characters left</span>
      </>,
    );

    expect(control()).toHaveAccessibleDescription('Keep it short. 140 characters left');
  });
});

describe('Field — state', () => {
  it('sets aria-invalid and data-invalid when invalid', () => {
    render(
      <Field label="Email" invalid>
        <Input />
      </Field>,
    );
    expect(control()).toHaveAttribute('aria-invalid', 'true');
    expect(root()).toHaveAttribute('data-invalid', '');
  });

  it('emits no aria-invalid at all when valid', () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    expect(control()).not.toHaveAttribute('aria-invalid');
  });

  it('forwards disabled, readOnly and required to the control natively', () => {
    render(
      <Field label="Email" disabled readOnly required>
        <Input />
      </Field>,
    );
    expect(control()).toBeDisabled();
    expect(control()).toHaveAttribute('readonly');
    expect(control()).toBeRequired();
  });

  it('uses the native required rather than aria-required', () => {
    render(
      <Field label="Email" required>
        <Input />
      </Field>,
    );
    expect(control()).not.toHaveAttribute('aria-required');
  });
});

describe('Field — the error live region', () => {
  it('renders the region before there is a message to put in it', () => {
    // The element has to already be in the document for the change to be
    // announced. This is what the whole "always render, conditionally fill"
    // rule buys, and it is invisible unless asserted.
    render(
      <Field label="Email" errorText="Enter an email address.">
        <Input />
      </Field>,
    );

    expect(errorText()).not.toBeNull();
    expect(errorText()).toHaveAttribute('aria-live', 'polite');
    expect(errorText()).toBeEmptyDOMElement();
  });

  it('fills the same element when the field turns invalid', async () => {
    const user = userEvent.setup();

    function App() {
      const [invalid, setInvalid] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setInvalid(true)}>
            validate
          </button>
          <Field label="Email" errorText="Enter an email address." invalid={invalid}>
            <Input />
          </Field>
        </>
      );
    }

    render(<App />);
    const before = errorText();

    await user.click(screen.getByRole('button', { name: 'validate' }));

    expect(errorText()).toHaveTextContent('Enter an email address.');
    // Same node, not a replacement — a live region that is remounted with its
    // message is the failure this design avoids.
    expect(errorText()).toBe(before);
  });

  it('renders no region at all when no message was supplied', () => {
    render(
      <Field label="Email" invalid>
        <Input />
      </Field>,
    );
    expect(errorText()).toBeNull();
    expect(control()).not.toHaveAttribute('aria-describedby');
  });

  it('does not hide the message with display: none', () => {
    // The stylesheet is optional. A component whose announcements depend on CSS
    // the consumer may not have installed is not headless.
    render(
      <Field label="Email" errorText="Enter an email address." invalid>
        <Input />
      </Field>,
    );
    expect(errorText()).not.toHaveAttribute('hidden');
  });
});

describe('Textarea', () => {
  it('renders a textarea with the same wiring as an input', () => {
    render(
      <Field label="Notes" description="Optional." id="notes">
        <Textarea rows={4} />
      </Field>,
    );

    const area = control() as HTMLTextAreaElement;
    expect(area.tagName).toBe('TEXTAREA');
    expect(area).toHaveAttribute('id', 'notes-control');
    expect(area).toHaveAttribute('rows', '4');
    expect(area).toHaveAccessibleName('Notes');
    expect(area).toHaveAccessibleDescription('Optional.');
  });

  it('leaves the value to the consumer', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Notes">
        <Textarea />
      </Field>,
    );

    await user.type(control(), 'hello');
    expect(control()).toHaveValue('hello');
  });
});

describe('Field — controlled value', () => {
  /**
   * The mirror of the Vue adapter's `v-model` tests.
   *
   * React needs no declaration for this — `value` and `onChange` are ordinary
   * props and reach the element through the attribute spread — but the pair has
   * to be asserted on both sides, or "it works in React" is the reason nobody
   * notices it is broken in Vue. Which is exactly what happened.
   */
  const Controlled = ({ as = 'input' }: { as?: 'input' | 'textarea' }) => {
    const [value, setValue] = useState('');
    const Control = as === 'input' ? Input : Textarea;
    return (
      <>
        <Field label="Email">
          <Control
            value={value}
            onChange={(event: { target: { value: string } }) => setValue(event.target.value)}
          />
        </Field>
        <output data-value>{value}</output>
      </>
    );
  };

  it('updates the bound state as the user types into an Input', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(control(), 'hi');

    expect(document.querySelector('[data-value]')).toHaveTextContent('hi');
    expect(control()).toHaveValue('hi');
  });

  it('updates the bound state as the user types into a Textarea', async () => {
    const user = userEvent.setup();
    render(<Controlled as="textarea" />);

    await user.type(control(), 'hi');

    expect(document.querySelector('[data-value]')).toHaveTextContent('hi');
  });
});

describe('Field — misuse', () => {
  it('warns in development when no control was rendered', async () => {
    // The one dangling idref no design change rules out: the label's `for` is
    // emitted unconditionally because core cannot see the children.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Field label="Email" id="email" />);

    await flushTasks();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain('no control');
    error.mockRestore();
  });

  it('says nothing when a control is present', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );

    await flushTasks();

    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('throws when an Input is rendered outside a Field', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Input />)).toThrow(/inside a Field/);
    error.mockRestore();
  });
});

describe('Field — accessibility', () => {
  it('has no axe violations, valid', async () => {
    const { container } = render(
      <Field label="Email" description="We only use this to sign you in.">
        <Input type="email" />
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations, invalid', async () => {
    const { container } = render(
      <Field label="Email" description="Help." errorText="Enter an email address." invalid>
        <Input type="email" />
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations for a textarea', async () => {
    const { container } = render(
      <Field label="Notes">
        <Textarea />
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
