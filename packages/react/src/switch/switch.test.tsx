import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Switch } from './switch';

const control = () => screen.getByRole('switch');
const root = () => document.querySelector('[data-part="root"]') as HTMLElement;
const hiddenInput = () =>
  document.querySelector('[data-part="hidden-input"]') as HTMLInputElement | null;

describe('Switch — rendering', () => {
  it('renders a switch with an accessible name from the label', () => {
    render(<Switch label="Notifications" />);
    expect(control()).toHaveAccessibleName('Notifications');
  });

  it('takes its accessible name from aria-label when no label is given', () => {
    render(<Switch aria-label="Notifications" />);
    expect(control()).toHaveAccessibleName('Notifications');
  });

  it('omits aria-labelledby when no label is rendered', () => {
    // A dangling idref leaves the control nameless — worse than no attribute.
    render(<Switch aria-label="Notifications" />);
    expect(control()).not.toHaveAttribute('aria-labelledby');
  });

  it('uses a native button, so Space and Enter come free', () => {
    render(<Switch label="Notifications" />);
    expect(control().tagName).toBe('BUTTON');
    expect(control()).toHaveAttribute('type', 'button');
  });

  it('marks the root and only the root with data-kanso', () => {
    render(<Switch label="Notifications" />);
    expect(document.querySelectorAll('[data-kanso]')).toHaveLength(1);
    expect(root()).toHaveAttribute('data-kanso');
  });

  it('passes className and arbitrary attributes through to the root', () => {
    render(<Switch label="Notifications" className="mine" data-testid="sw" />);
    expect(root()).toHaveClass('mine');
    expect(root()).toHaveAttribute('data-testid', 'sw');
  });

  it('puts a consumer id on the root verbatim and derives the rest', () => {
    render(<Switch label="Notifications" id="notify" />);
    expect(root()).toHaveAttribute('id', 'notify');
    expect(control()).toHaveAttribute('id', 'notify-control');
  });
});

describe('Switch — uncontrolled', () => {
  it('starts unchecked by default', () => {
    render(<Switch label="Notifications" />);
    expect(control()).toHaveAttribute('aria-checked', 'false');
    expect(root()).toHaveAttribute('data-state', 'unchecked');
  });

  it('honours defaultChecked', () => {
    render(<Switch label="Notifications" defaultChecked />);
    expect(control()).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles on click and reports the change', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" onCheckedChange={onCheckedChange} />);

    await userEvent.click(control());

    expect(control()).toHaveAttribute('aria-checked', 'true');
    expect(root()).toHaveAttribute('data-state', 'checked');
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('toggles back off', async () => {
    render(<Switch label="Notifications" defaultChecked />);
    await userEvent.click(control());
    expect(control()).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles when the label is clicked', async () => {
    render(<Switch label="Notifications" />);
    await userEvent.click(screen.getByText('Notifications'));
    expect(control()).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Switch — keyboard', () => {
  // axe cannot see a broken key handler. These are the tests that would catch
  // someone "helpfully" adding a keydown handler and double-toggling.
  it('is reachable by Tab', async () => {
    render(<Switch label="Notifications" />);
    await userEvent.tab();
    expect(control()).toHaveFocus();
  });

  it('toggles once on Space', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" onCheckedChange={onCheckedChange} />);

    await userEvent.tab();
    await userEvent.keyboard('[Space]');

    expect(control()).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('toggles once on Enter', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" onCheckedChange={onCheckedChange} />);

    await userEvent.tab();
    await userEvent.keyboard('[Enter]');

    expect(control()).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });
});

describe('Switch — controlled', () => {
  it('does not move on its own', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" checked={false} onCheckedChange={onCheckedChange} />);

    await userEvent.click(control());

    // The consumer owns the value; the click only reports intent.
    expect(control()).toHaveAttribute('aria-checked', 'false');
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('follows the prop when the consumer updates it', async () => {
    function Controlled() {
      const [checked, setChecked] = useState(false);
      return <Switch label="Notifications" checked={checked} onCheckedChange={setChecked} />;
    }
    render(<Controlled />);

    await userEvent.click(control());
    expect(control()).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects a prop change made without any interaction', () => {
    const { rerender } = render(<Switch label="Notifications" checked={false} />);
    rerender(<Switch label="Notifications" checked />);
    expect(control()).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Switch — disabled', () => {
  it('uses the native disabled attribute', () => {
    render(<Switch label="Notifications" disabled />);
    expect(control()).toBeDisabled();
    expect(root()).toHaveAttribute('data-disabled', '');
  });

  it('does not toggle or report', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" disabled onCheckedChange={onCheckedChange} />);

    await userEvent.click(control());

    expect(control()).toHaveAttribute('aria-checked', 'false');
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('omits data-disabled when enabled', () => {
    render(<Switch label="Notifications" />);
    expect(root()).not.toHaveAttribute('data-disabled');
  });
});

describe('Switch — readOnly', () => {
  it('stays focusable but does not toggle', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" readOnly onCheckedChange={onCheckedChange} />);

    await userEvent.tab();
    expect(control()).toHaveFocus();

    await userEvent.keyboard('[Space]');
    expect(control()).toHaveAttribute('aria-checked', 'false');
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('announces itself as read-only', () => {
    render(<Switch label="Notifications" readOnly />);
    expect(control()).toHaveAttribute('aria-readonly', 'true');
    expect(control()).not.toBeDisabled();
  });
});

describe('Switch — form participation', () => {
  it('renders no hidden input without a name', () => {
    render(<Switch label="Notifications" />);
    expect(hiddenInput()).toBeNull();
  });

  it('submits its value inside a plain form', async () => {
    let submitted: FormData | undefined;
    // Read inside the handler: `currentTarget` is only valid while the event
    // is being dispatched.
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitted = new FormData(event.currentTarget);
    });
    render(
      <form onSubmit={onSubmit}>
        <Switch label="Notifications" name="notify" defaultChecked />
        <button type="submit">Save</button>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(submitted?.get('notify')).toBe('on');
  });

  it('does not submit the form when toggled', async () => {
    // type="button" on the control. Without it, a button inside a form defaults
    // to type="submit" and every toggle would submit.
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Switch label="Notifications" name="notify" />
      </form>,
    );

    await userEvent.click(control());

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('drops out of the form data when unchecked', () => {
    render(
      <form>
        <Switch label="Notifications" name="notify" />
      </form>,
    );
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('notify')).toBeNull();
  });

  it('honours a custom value', () => {
    render(
      <form>
        <Switch label="Notifications" name="notify" value="email" defaultChecked />
      </form>,
    );
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('notify')).toBe('email');
  });

  it('keeps the hidden input out of the tab order and the a11y tree', () => {
    render(<Switch label="Notifications" name="notify" />);
    const input = hiddenInput();
    // Two focusable, two announced nodes would make one switch look like two.
    expect(input).toHaveAttribute('tabindex', '-1');
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('is never display:none, so required still blocks submission', () => {
    // A display:none control is skipped by constraint validation, which would
    // silently disable `required`. The stylesheet clips it instead.
    render(<Switch label="Notifications" name="notify" required />);
    const input = hiddenInput() as HTMLInputElement;
    expect(input).toHaveAttribute('required');
    expect(input).not.toHaveAttribute('hidden');
    expect(input.style.display).not.toBe('none');
  });

  it('does not warn about a checked input with no onChange', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Switch label="Notifications" name="notify" defaultChecked />);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('Switch — axe', () => {
  // A floor, not a ceiling: axe cannot see keyboard behaviour. See docs/04.
  it('has no violations, labelled', async () => {
    const { container } = render(<Switch label="Notifications" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations, aria-labelled with a form and every state on', async () => {
    const { container } = render(
      <form>
        <Switch aria-label="Notifications" name="notify" required defaultChecked />
        <Switch label="Sound" disabled />
        <Switch label="Vibrate" readOnly />
      </form>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
