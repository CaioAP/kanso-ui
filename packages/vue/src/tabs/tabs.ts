import {
  connectTabs,
  initialTabsState,
  type Orientation,
  type TabsActivationMode,
  type TabsApi,
  type TabsEvent,
  tabsReducer,
} from '@caioalfonso/kanso-core';
import {
  type ComputedRef,
  computed,
  defineComponent,
  h,
  type InjectionKey,
  inject,
  type PropType,
  provide,
  ref,
  useId,
} from 'vue';
import { normalizeProps, type VuePropTypes } from '../normalize-props';

/**
 * Tabs is the first compound component: four elements sharing one state, with
 * arbitrary consumer markup in between. A single component taking an `items`
 * array would avoid the injection below, and would also make it impossible to
 * put anything of your own inside a panel — which is the whole point of tabs.
 *
 * What is provided is a `computed`, never the api object itself. Providing a
 * snapshot works on first render and then silently stops updating: the children
 * would hold the api built from the state at mount, so selecting a tab would
 * change nothing they can see. Vue reports no error for this.
 */
type TabsContext = ComputedRef<TabsApi<VuePropTypes>>;

const TabsContextKey: InjectionKey<TabsContext> = Symbol('kanso-tabs');

function useTabsContext(part: string): TabsContext {
  const api = inject(TabsContextKey, null);
  if (api === null) {
    // Loudly, at the point of the mistake. Without this the failure is a
    // TypeError deep inside a prop getter, which says nothing useful.
    throw new Error(`[kanso] Tabs${part} must be rendered inside TabsRoot.`);
  }
  return api;
}

export const TabsRoot = defineComponent({
  name: 'KansoTabsRoot',

  props: {
    /** `v-model` binding. */
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    /** Controlled value, for parity with the React adapter. */
    value: { type: String as PropType<string | undefined>, default: undefined },
    /**
     * Uncontrolled initial value. With neither this nor `value`, no tab is
     * selected and the list has no tab stop — see `docs/03` §2 decision 6.
     */
    defaultValue: { type: String as PropType<string | undefined>, default: undefined },
    /** Which arrow keys move between tabs. */
    orientation: { type: String as PropType<Orientation>, default: 'horizontal' },
    /** Whether focus selects. */
    activationMode: { type: String as PropType<TabsActivationMode>, default: 'automatic' },
    /** Whether the arrows wrap past the ends. */
    loop: { type: Boolean, default: true },
    id: { type: String as PropType<string | undefined>, default: undefined },
  },

  emits: {
    'update:modelValue': (value: string) => typeof value === 'string',
    valueChange: (value: string) => typeof value === 'string',
  },

  // Applied by hand below, so that core's props win over a consumer's. Left on,
  // Vue merges fallthrough attrs *over* the render's props, which would let a
  // stray `id` or `role` displace the one the component depends on.
  inheritAttrs: false,

  setup(props, { emit, attrs, slots }) {
    // Vue owns id generation (3.5+). A counter in core would differ between the
    // server render and the client render — see CLAUDE.md rule 3.
    const vueId = useId();
    if (vueId === undefined) {
      throw new Error('[kanso] Tabs needs Vue 3.5+ for useId(), or an explicit `id` prop.');
    }

    const uncontrolledValue = ref(props.defaultValue);

    const isControlled = (): boolean => props.value !== undefined || props.modelValue !== undefined;

    const value = computed(() => props.value ?? props.modelValue ?? uncontrolledValue.value);

    // Derived, not stored. Every field except `value` is a prop, and a prop
    // copied into state goes stale the moment the consumer changes it.
    const state = computed(() =>
      initialTabsState({
        id: props.id ?? vueId,
        value: value.value,
        orientation: props.orientation,
        activationMode: props.activationMode,
        loop: props.loop,
      }),
    );

    // Controlled-mode mirroring lives here, not in core. See docs/01 §9.
    const send = (event: TabsEvent): void => {
      const current = state.value;
      const next = tabsReducer(current, event);
      // Reference equality means the reducer refused it — here, a select of the
      // tab already selected. Nothing to report.
      if (next === current) return;
      if (!isControlled()) uncontrolledValue.value = next.value;
      if (next.value === undefined) return;
      emit('update:modelValue', next.value);
      emit('valueChange', next.value);
    };

    const api = computed(() => connectTabs(state.value, send, normalizeProps));
    provide(TabsContextKey, api);

    return () => h('div', { ...attrs, ...api.value.rootProps }, slots.default?.());
  },
});

export const TabsList = defineComponent({
  name: 'KansoTabsList',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const api = useTabsContext('List');
    return () => h('div', { ...attrs, ...api.value.listProps }, slots.default?.());
  },
});

export const TabsTrigger = defineComponent({
  name: 'KansoTabsTrigger',

  props: {
    /** Identifies the tab. Must match the `value` of exactly one `TabsContent`. */
    value: { type: String, required: true },
  },

  inheritAttrs: false,

  setup(props, { attrs, slots }) {
    const api = useTabsContext('Trigger');
    return () =>
      h(
        'button',
        { ...attrs, ...api.value.getTriggerProps({ value: props.value }) },
        slots.default?.(),
      );
  },
});

/**
 * Always rendered, `hidden` when unselected — never conditionally mounted.
 * Unmounting it would leave `aria-controls` on its trigger pointing at nothing,
 * which no automated check reports. To defer expensive work, put the condition
 * inside the panel with `v-if`, not around it.
 */
export const TabsContent = defineComponent({
  name: 'KansoTabsContent',

  props: {
    /** Identifies the panel. Must match the `value` of exactly one `TabsTrigger`. */
    value: { type: String, required: true },
  },

  inheritAttrs: false,

  setup(props, { attrs, slots }) {
    const api = useTabsContext('Content');
    return () =>
      h(
        'div',
        { ...attrs, ...api.value.getContentProps({ value: props.value }) },
        slots.default?.(),
      );
  },
});

/** Namespace form, which is how the docs show it: `<Tabs.Root>`, `<Tabs.List>`… */
export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};
