import { ariaAttr, dataAttr } from '../dom/attrs';
import type { Dict, NormalizeProps, PropTypes } from '../types';
import { fieldDescribedBy, fieldMessage } from './field.state';
import type { FieldControlOptions, FieldState } from './field.types';

export interface FieldApi<T extends PropTypes> {
  invalid: boolean;
  disabled: boolean;
  ids: FieldState['ids'];
  rootProps: T['element'];
  labelProps: T['label'];
  descriptionProps: T['element'];
  errorTextProps: T['element'];
  /** For `<input>`. Takes the consumer's `aria-describedby` so it can compose it. */
  getInputProps: (options?: FieldControlOptions) => T['input'];
  /** For `<textarea>`. Identical wiring, different element type — `docs/03` §5. */
  getTextareaProps: (options?: FieldControlOptions) => T['textarea'];
}

/**
 * Turn state into prop bags. Pure, and called on every render.
 *
 * Two arguments, not three: there is no `send`, because Field has no
 * transitions. `docs/03` §6 decision 1.
 *
 * Note what is absent: no `onChange`, no value handling of any kind. The
 * control's value belongs to the consumer and to the framework's own binding —
 * `v-model` or React's `value`/`onChange` — and a core that touched it would be
 * standing between the consumer and their form for no benefit.
 */
export function connectField<T extends PropTypes>(
  state: FieldState,
  normalize: NormalizeProps<T>,
): FieldApi<T> {
  const { invalid, disabled, readOnly, required, ids } = state;

  const stateAttrs = {
    'data-invalid': dataAttr(invalid),
    'data-disabled': dataAttr(disabled),
    'data-readonly': dataAttr(readOnly),
    'data-required': dataAttr(required),
  };

  // Built once and normalised twice, so `<input>` and `<textarea>` cannot drift
  // apart. Everything here is shared; nothing about the wiring differs between
  // the two elements.
  const controlAttrs = (options?: FieldControlOptions): Dict => ({
    ...stateAttrs,
    'data-part': 'control',
    id: ids.control,
    disabled,
    readOnly,
    // Native, not `aria-required`: the attribute maps to the same accessibility
    // property and also switches on constraint validation. `docs/03` §5
    // decision 5 records the trade — the browser's own submit bubble comes with
    // it, and `noValidate` on the form is the way out.
    required,
    'aria-invalid': ariaAttr(invalid),
    'aria-describedby': fieldDescribedBy(state, options?.describedBy),
  });

  return {
    invalid,
    disabled,
    ids,

    rootProps: normalize.element({
      // Root-only markers. The stylesheet scopes itself with
      // `[data-kanso] [data-part=…]`, so these must be on the root and nowhere else.
      'data-kanso': '',
      'data-scope': 'field',
      'data-part': 'root',
      ...stateAttrs,
      id: ids.root,
    }),

    labelProps: normalize.label({
      'data-part': 'label',
      ...stateAttrs,
      id: ids.label,
      // A real `for`/`id` association, not `aria-labelledby`: it gives the label
      // its click-to-focus behaviour as well as the accessible name, and no ARIA
      // attribute can do the first half.
      //
      // Emitted unconditionally, because core cannot see whether a control was
      // rendered. A `Field` with no control inside it is a dangling idref that
      // `field.dom.ts` warns about in development. `docs/03` §5 decision 7.
      for: ids.control,
    }),

    descriptionProps: normalize.element({
      'data-part': 'description',
      id: ids.description,
    }),

    errorTextProps: normalize.element({
      'data-part': 'error-text',
      // Present whether or not the field is invalid, because the element is too:
      // a live region announces *changes* to a region already in the document,
      // and mounting the region together with its first message is how you get
      // an announcement that fires in some screen readers and not others.
      // `docs/03` §5 decision 3.
      'aria-live': 'polite',
      // Read the message whole rather than only the changed words. Error text is
      // one sentence; hearing half of it is worse than hearing it twice.
      'aria-atomic': true,
      // `data-invalid` and nothing else — this element is not disabled or
      // readonly in any meaningful sense, and the stylesheet only needs to know
      // whether there is a message.
      'data-invalid': dataAttr(invalid),
      id: ids.errorText,
    }),

    getInputProps: (options) => normalize.input(controlAttrs(options)),
    getTextareaProps: (options) => normalize.textarea(controlAttrs(options)),
  };
}

/**
 * Whether the error element should currently hold its message.
 *
 * The element itself is rendered whenever the consumer supplied one — that
 * condition is a prop the adapter already has. This is the other half, and it
 * lives in core so the two adapters cannot disagree about when an error is
 * shown. It is deliberately not a field of the api: it answers a question about
 * rendering, not a prop bag.
 *
 * Derived from `fieldMessage` rather than restating its condition, so this and
 * `fieldShowsDescription` cannot both answer yes.
 */
export const fieldShowsErrorText = (state: FieldState): boolean =>
  fieldMessage(state) === 'error-text';

/**
 * Whether the description should be rendered at all.
 *
 * Unlike the error, the description is not a live region, so it is unmounted
 * rather than emptied — nothing announces from it and nothing is lost by
 * removing it. Which is also why the error is the one that stays mounted and
 * the description is the one that yields: `docs/03` §5 decision 3 requires the
 * live region to be in the document before its content changes.
 */
export const fieldShowsDescription = (state: FieldState): boolean =>
  fieldMessage(state) === 'description';
