import {
  connectField,
  type FieldApi,
  fieldShowsDescription,
  fieldShowsErrorText,
  initialFieldState,
  scheduleFieldControlCheck,
} from '@caioalfonso/kanso-core';
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
} from 'react';
import { normalizeProps, type ReactPropTypes } from '../normalize-props';

/**
 * Field renders the label, the description and the error itself, and takes them
 * as node props rather than as compound children.
 *
 * That is not an ergonomic preference — it is the only shape that survives a
 * server render. A `Field.Description` that registered with the root from its
 * own mount hook would leave the control's `aria-describedby` out of the HTML
 * and add it when JavaScript arrived, so a form that works without JavaScript
 * would ship without its description association. Presence has to be known
 * during render, and a prop is known during render. See `docs/03` §5 decision 1.
 *
 * Reading downward is fine, which is why `Input` and `Textarea` are still
 * separate components sharing a context: children reading context during render
 * is synchronous and server-safe. Only writing upward is not.
 */
interface FieldContextValue {
  api: FieldApi<ReactPropTypes>;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useFieldContext(part: string): FieldContextValue {
  const context = useContext(FieldContext);
  if (context === null) {
    // Loudly, at the point of the mistake. Without this the failure is a
    // TypeError deep inside a prop getter, which says nothing useful.
    throw new Error(`[kanso] ${part} must be rendered inside a Field.`);
  }
  return context;
}

type FieldAttributes = Omit<ComponentPropsWithRef<'div'>, 'children'>;

export interface FieldProps extends FieldAttributes {
  /** Visible label. Rendered as a real `<label for>`, not `aria-label`. */
  label?: ReactNode;
  /**
   * Optional help text. Associated while it is the message being shown — an
   * error replaces it, because a Field shows one region of text below the
   * control, never two.
   */
  description?: ReactNode;
  /** Optional error message. Shown, and associated, only while `invalid`. */
  errorText?: ReactNode;
  /** Sets `aria-invalid` and reveals `errorText`. */
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** The native attribute, which also switches on constraint validation. */
  required?: boolean;
  /** The control: an `Input`, a `Textarea`, or your own. */
  children?: ReactNode;
}

export function Field({
  label,
  description,
  errorText,
  invalid,
  disabled,
  readOnly,
  required,
  id: providedId,
  ref: consumerRef,
  children,
  ...rootAttributes
}: FieldProps) {
  // React owns id generation. A counter in core would differ between the server
  // render and the client render — see CLAUDE.md rule 3.
  const reactId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const present = (node: ReactNode): boolean => node !== undefined && node !== null;

  // Derived on every render rather than held in state. Every field of it is a
  // prop, and a prop stored in state goes stale the moment the consumer changes
  // it. `initialFieldState` is pure, so this is free.
  const state = initialFieldState({
    id: providedId ?? reactId,
    invalid,
    disabled,
    readOnly,
    required,
    hasLabel: present(label),
    hasDescription: present(description),
    hasErrorText: present(errorText),
  });

  const api = connectField(state, normalizeProps);
  const controlId = state.ids.control;

  // The one runtime check this component has: the label's `for` is emitted
  // unconditionally, so a Field with no control inside it is a dangling idref
  // that only the DOM can reveal. Development-only; see `docs/03` §5 decision 7.
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    return scheduleFieldControlCheck(root, controlId);
  }, [controlId]);

  // The component needs the root element for the check above, and the consumer
  // may want it too. Taking `ref` out of the spread and writing to both is the
  // same rule this component applies to `aria-describedby`: an internal need
  // composes with a consumer's, it does not quietly replace it.
  const setRoot = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof consumerRef === 'function') consumerRef(node);
    else if (consumerRef !== null && consumerRef !== undefined) consumerRef.current = node;
  };

  return (
    <FieldContext.Provider value={{ api }}>
      <div {...rootAttributes} {...api.rootProps} ref={setRoot}>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: htmlFor arrives in the
            spread, pointing at the control's id — the rule cannot see through
            it. The association is covered by the "clicking the label focuses
            the control" test. */}
        {state.hasLabel ? <label {...api.labelProps}>{label}</label> : null}
        {children}
        {/*
          One message region, never two stacked: the error replaces the
          description rather than joining it, and core owns that ordering so
          this adapter and Vue's cannot disagree about it.
        */}
        {fieldShowsDescription(state) ? <div {...api.descriptionProps}>{description}</div> : null}
        {/*
          Rendered whenever an error message was supplied, and holding it only
          while invalid. A live region announces changes to a region that is
          already in the document; mounting the region together with its first
          message is how you get an announcement that fires in some screen
          readers and not others. Not `display: none` either — the stylesheet is
          optional, and announcements must not depend on it.
        */}
        {state.hasErrorText ? (
          <div {...api.errorTextProps}>{fieldShowsErrorText(state) ? errorText : null}</div>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {}

/**
 * The id, the state attributes and the whole of `aria-describedby` come from
 * the enclosing `Field`. A consumer's own `aria-describedby` is composed with
 * the field's rather than dropped — core props are applied last, so without
 * this it would be.
 */
export function Input({ 'aria-describedby': describedBy, ...attributes }: InputProps) {
  const { api } = useFieldContext('Input');
  return <input {...attributes} {...api.getInputProps({ describedBy })} />;
}

export interface TextareaProps extends Omit<ComponentPropsWithRef<'textarea'>, 'id'> {}

/** Identical wiring to `Input`, on the element that has `rows` and no `type`. */
export function Textarea({ 'aria-describedby': describedBy, ...attributes }: TextareaProps) {
  const { api } = useFieldContext('Textarea');
  return <textarea {...attributes} {...api.getTextareaProps({ describedBy })} />;
}
