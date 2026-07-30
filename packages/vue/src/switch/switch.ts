import {
  connectSwitch,
  initialSwitchState,
  type SwitchEvent,
  switchReducer,
} from '@caioalfonso/kanso-core';
import { computed, defineComponent, h, type PropType, ref, useId } from 'vue';
import { normalizeProps } from '../normalize-props';

/**
 * Switch, as a render function rather than an SFC.
 *
 * docs/01 §8 sketches this as `<script setup>`, but the package is bundled with
 * tsup, and esbuild cannot compile a `.vue` file. A render function needs no
 * compiler, so the published package stays a plain ESM build with working
 * `.d.ts` — worth more than the template sugar. The structure is identical.
 */
export const Switch = defineComponent({
  name: 'KansoSwitch',

  props: {
    /** `v-model` binding. */
    modelValue: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Controlled value, for parity with the React adapter. */
    checked: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Uncontrolled initial value. */
    defaultChecked: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    /** Focusable, but not toggleable. */
    readOnly: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    /** Set to make the switch submit with an enclosing form. */
    name: { type: String as PropType<string | undefined>, default: undefined },
    /** Submitted value when checked. Defaults to "on". */
    value: { type: String as PropType<string | undefined>, default: undefined },
    /** Visible label. Omit only if you pass `aria-label` or use the default slot. */
    label: { type: String as PropType<string | undefined>, default: undefined },
    id: { type: String as PropType<string | undefined>, default: undefined },
  },

  emits: {
    'update:modelValue': (checked: boolean) => typeof checked === 'boolean',
    checkedChange: (checked: boolean) => typeof checked === 'boolean',
  },

  // Fallthrough attrs are applied by hand below. Left on, Vue would put a
  // consumer's aria-label on the root — but role="switch" is on the button, so
  // the name has to go there.
  inheritAttrs: false,

  setup(props, { emit, attrs, slots }) {
    // Vue owns id generation (3.5+). A counter in core would differ between the
    // server render and the client render — see CLAUDE.md rule 3.
    const vueId = useId();
    if (vueId === undefined) {
      // useId returns undefined only outside a component instance, which cannot
      // happen inside setup(). Fail loudly rather than fabricate an id: a made-up
      // one collides between instances and shows up as a hydration mismatch.
      throw new Error('[kanso] Switch needs Vue 3.5+ for useId(), or an explicit `id` prop.');
    }

    const uncontrolledChecked = ref(props.defaultChecked);

    const isControlled = (): boolean =>
      props.checked !== undefined || props.modelValue !== undefined;

    const checked = computed(() => props.checked ?? props.modelValue ?? uncontrolledChecked.value);
    const hasLabel = computed(() => props.label !== undefined || slots.default !== undefined);

    // Derived, not stored. Every field except `checked` is a prop, and a prop
    // copied into state goes stale the moment the consumer changes it.
    const state = computed(() =>
      initialSwitchState({
        id: props.id ?? vueId,
        checked: checked.value,
        disabled: props.disabled,
        readOnly: props.readOnly,
        required: props.required,
        name: props.name,
        value: props.value,
        hasLabel: hasLabel.value,
      }),
    );

    // Controlled-mode mirroring lives here, not in core. See docs/01 §9.
    const send = (event: SwitchEvent): void => {
      const current = state.value;
      const next = switchReducer(current, event);
      // Reference equality means the reducer refused it — a disabled toggle, or
      // a set to the value already held. Nothing to report.
      if (next === current) return;
      if (!isControlled()) uncontrolledChecked.value = next.checked;
      emit('update:modelValue', next.checked);
      emit('checkedChange', next.checked);
    };

    return () => {
      const api = connectSwitch(state.value, send, normalizeProps);

      // The naming attrs are routed to the control, so they must not also be
      // spread onto the root — that would put the same name in two places.
      const {
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        ...rootAttributes
      } = attrs;

      const children = [
        h(
          'button',
          {
            ...api.controlProps,
            // The control carries role="switch", so its accessible name belongs
            // here. If a visible label is also rendered, ARIA's own precedence
            // applies and aria-labelledby wins.
            'aria-label': ariaLabel,
            'aria-labelledby': ariaLabelledBy ?? api.controlProps['aria-labelledby'],
          },
          h('span', api.thumbProps),
        ),
      ];

      if (hasLabel.value) {
        children.push(h('label', api.labelProps, slots.default ? slots.default() : props.label));
      }

      if (props.name) {
        children.push(h('input', api.hiddenInputProps));
      }

      return h('span', { ...rootAttributes, ...api.rootProps }, children);
    };
  },
});
