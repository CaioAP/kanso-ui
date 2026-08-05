import {
  connectField,
  type FieldApi,
  fieldShowsDescription,
  fieldShowsErrorText,
  initialFieldState,
  scheduleFieldControlCheck,
} from '@caioalfonso/kanso-core';
import {
  type ComputedRef,
  computed,
  defineComponent,
  h,
  type InjectionKey,
  inject,
  onBeforeUnmount,
  onMounted,
  type PropType,
  provide,
  ref,
  useId,
} from 'vue';
import { normalizeProps, type VuePropTypes } from '../normalize-props';

/**
 * Mirror of packages/react/src/field/field.tsx.
 *
 * Field renders the label, the description and the error itself, and learns
 * that they exist from its **slots** — which Vue knows during render, on the
 * server as well as in the browser. A child registering from its own mount hook
 * would leave the control's `aria-describedby` out of the server HTML and add
 * it when JavaScript arrived. `docs/03` §5 decision 1.
 *
 * The slot names are the part names: `#label`, `#description`, `#error-text`.
 * One string per part, used for the slot and for `data-part`.
 *
 * As with Tabs, Dialog and Menu, what is provided is a `computed`, never a
 * snapshot of the api.
 */

interface FieldContext {
  api: ComputedRef<FieldApi<VuePropTypes>>;
}

const FieldContextKey: InjectionKey<FieldContext> = Symbol('kanso-field');

function useFieldContext(part: string): FieldContext {
  const context = inject(FieldContextKey, null);
  if (context === null) {
    // Loudly, at the point of the mistake. Without this the failure is a
    // TypeError deep inside a prop getter, which says nothing useful.
    throw new Error(`[kanso] ${part} must be rendered inside a Field.`);
  }
  return context;
}

export const Field = defineComponent({
  name: 'KansoField',

  props: {
    /** Sets `aria-invalid` and reveals the `#error-text` slot. */
    invalid: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    /** The native attribute, which also switches on constraint validation. */
    required: { type: Boolean, default: false },
    id: { type: String, default: undefined },
  },

  // Applied by hand below, so that core's props win over a consumer's. Left on,
  // Vue merges fallthrough attrs *over* the render's props, which would let a
  // stray `id` displace the one every other part points at.
  inheritAttrs: false,

  setup(props, { attrs, slots }) {
    // Vue owns id generation (3.5+). A counter in core would differ between the
    // server render and the client render — see CLAUDE.md rule 3.
    const vueId = useId();
    if (vueId === undefined) {
      throw new Error('[kanso] Field needs Vue 3.5+ for useId(), or an explicit `id` prop.');
    }

    const rootRef = ref<HTMLElement | null>(null);

    // Derived, not stored. Every field of it is a prop or a slot, and either
    // copied into state goes stale the moment the consumer changes it.
    const state = computed(() =>
      initialFieldState({
        id: props.id ?? vueId,
        invalid: props.invalid,
        disabled: props.disabled,
        readOnly: props.readOnly,
        required: props.required,
        hasLabel: slots.label !== undefined,
        hasDescription: slots.description !== undefined,
        hasErrorText: slots['error-text'] !== undefined,
      }),
    );

    const api = computed(() => connectField(state.value, normalizeProps));
    provide(FieldContextKey, { api });

    // The one runtime check this component has: the label's `for` is emitted
    // unconditionally, so a Field with no control inside it is a dangling idref
    // that only the DOM can reveal. Development-only; `docs/03` §5 decision 7.
    let cancelCheck: (() => void) | undefined;

    onMounted(() => {
      const root = rootRef.value;
      if (root === null) return;
      cancelCheck = scheduleFieldControlCheck(root, state.value.ids.control);
    });

    onBeforeUnmount(() => {
      cancelCheck?.();
      cancelCheck = undefined;
    });

    return () => {
      const current = state.value;
      const bag = api.value;

      return h('div', { ...attrs, ...bag.rootProps, ref: rootRef }, [
        current.hasLabel ? h('label', bag.labelProps, slots.label?.()) : null,
        slots.default?.(),
        // One message region, never two stacked: the error replaces the
        // description rather than joining it, and core owns that ordering so
        // this adapter and React's cannot disagree about it.
        fieldShowsDescription(current)
          ? h('div', bag.descriptionProps, slots.description?.())
          : null,
        // Rendered whenever an error message was supplied, and holding it only
        // while invalid. A live region announces changes to a region that is
        // already in the document; mounting the region together with its first
        // message is how you get an announcement that fires in some screen
        // readers and not others. Not `v-show` or `display: none` either — the
        // stylesheet is optional, and announcements must not depend on it.
        current.hasErrorText
          ? h(
              'div',
              bag.errorTextProps,
              fieldShowsErrorText(current) ? slots['error-text']?.() : undefined,
            )
          : null,
      ]);
    };
  },
});

/**
 * `v-model` support, which has to be declared rather than inherited.
 *
 * `v-model` on a component compiles to a `modelValue` prop and an
 * `update:modelValue` listener. A component that declares neither receives both
 * as *fallthrough attrs*, and spreading those onto a native `<input>` writes a
 * junk `modelValue` attribute and registers a listener for an event no DOM
 * element ever fires — so the binding is silently inert, and the failure looks
 * like "typing does nothing" rather than like an error.
 *
 * This is reactivity binding, which is the adapter's half of the contract
 * (`docs/01` §1). Core still touches no value: `connectField` emits neither
 * `value` nor an input handler, and a test asserts that.
 */
const modelProps = {
  modelValue: { type: String as PropType<string | undefined>, default: undefined },
} as const;

const modelEmits = {
  'update:modelValue': (value: string) => typeof value === 'string',
} as const;

/**
 * Bind the value and compose the input handler.
 *
 * `value` is only bound when the consumer is actually using `v-model`, so an
 * uncontrolled `<Input />` stays uncontrolled. The consumer's own `onInput` is
 * called as well as the emit rather than instead of it — the same composition
 * Button does for `onClick`, and for the same reason.
 */
function modelBindings(
  props: { modelValue: string | undefined },
  attrs: Record<string, unknown>,
  emit: (event: 'update:modelValue', value: string) => void,
): Record<string, unknown> {
  const consumerOnInput = attrs.onInput as ((event: Event) => void) | undefined;

  return {
    ...(props.modelValue === undefined ? {} : { value: props.modelValue }),
    onInput: (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      emit('update:modelValue', target.value);
      consumerOnInput?.(event);
    },
  };
}

/**
 * The id, the state attributes and the whole of `aria-describedby` come from
 * the enclosing `Field`. A consumer's own `aria-describedby` is composed with
 * the field's rather than dropped — core props are applied last, so without
 * this it would be.
 */
export const Input = defineComponent({
  name: 'KansoInput',
  props: modelProps,
  emits: modelEmits,
  inheritAttrs: false,

  setup(props, { attrs, emit }) {
    const { api } = useFieldContext('Input');
    return () => {
      const { 'aria-describedby': describedBy, onInput: _consumerOnInput, ...rest } = attrs;
      return h('input', {
        ...rest,
        ...api.value.getInputProps({
          describedBy: typeof describedBy === 'string' ? describedBy : undefined,
        }),
        // After core's props, because these are the two things core deliberately
        // does not emit. If that ever changes, the core test that asserts it
        // will fail before this silently wins.
        ...modelBindings(props, attrs, emit),
      });
    };
  },
});

/** Identical wiring to `Input`, on the element that has `rows` and no `type`. */
export const Textarea = defineComponent({
  name: 'KansoTextarea',
  props: modelProps,
  emits: modelEmits,
  inheritAttrs: false,

  setup(props, { attrs, emit }) {
    const { api } = useFieldContext('Textarea');
    return () => {
      const { 'aria-describedby': describedBy, onInput: _consumerOnInput, ...rest } = attrs;
      return h('textarea', {
        ...rest,
        ...api.value.getTextareaProps({
          describedBy: typeof describedBy === 'string' ? describedBy : undefined,
        }),
        ...modelBindings(props, attrs, emit),
      });
    };
  },
});
