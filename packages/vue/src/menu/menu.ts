import {
  activateMenu,
  connectMenu,
  initialMenuState,
  type MenuApi,
  type MenuEvent,
  type MenuOpenFocus,
  type MenuPlacement,
  menuReducer,
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
  type Ref,
  ref,
  useId,
} from 'vue';
import { normalizeProps, type VuePropTypes } from '../normalize-props';

/**
 * Mirror of packages/react/src/menu/menu.tsx.
 *
 * Menu is the widest keyboard surface in the library and the thinnest adapter
 * so far: arrows, `Home`/`End`, typeahead, `Tab` and dismissal all live in
 * core's `activateMenu`. Not portalled — `docs/03` §4 decision 3 — so the root
 * is the positioning anchor, and a menu inside a dialog keeps focus genuinely
 * inside the dialog rather than in a sibling of it.
 *
 * As with Tabs and Dialog, what is provided is a `computed`, never a snapshot.
 */

interface MenuContext {
  api: ComputedRef<MenuApi<VuePropTypes>>;
  triggerRef: Ref<HTMLElement | null>;
  contentRef: Ref<HTMLElement | null>;
  loop: ComputedRef<boolean>;
  typeahead: ComputedRef<boolean>;
  openFocus: ComputedRef<MenuOpenFocus>;
  placement: ComputedRef<MenuPlacement>;
  close: () => void;
  setPlacement: (placement: MenuPlacement) => void;
}

const MenuContextKey: InjectionKey<MenuContext> = Symbol('kanso-menu');

/** Carries the label id from `MenuGroup` down to `MenuGroupLabel`. */
const MenuGroupKey: InjectionKey<string> = Symbol('kanso-menu-group');

function useMenuContext(part: string): MenuContext {
  const context = inject(MenuContextKey, null);
  if (context === null) {
    throw new Error(`[kanso] Menu${part} must be rendered inside MenuRoot.`);
  }
  return context;
}

export const MenuRoot = defineComponent({
  name: 'KansoMenuRoot',

  props: {
    /** `v-model:open` binding. */
    open: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Uncontrolled initial value. */
    defaultOpen: { type: Boolean, default: false },
    /** Whether the arrows wrap past the ends. */
    loop: { type: Boolean, default: true },
    /** Whether typing letters moves focus. */
    typeahead: { type: Boolean, default: true },
    id: { type: String as PropType<string | undefined>, default: undefined },
  },

  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
    openChange: (open: boolean) => typeof open === 'boolean',
    select: (value: string) => typeof value === 'string',
  },

  // Applied by hand below, so that core's props win over a consumer's.
  inheritAttrs: false,

  setup(props, { emit, attrs, slots }) {
    // Vue owns id generation (3.5+). A counter in core would differ between the
    // server render and the client render — see CLAUDE.md rule 3.
    const vueId = useId();
    if (vueId === undefined) {
      throw new Error('[kanso] Menu needs Vue 3.5+ for useId(), or an explicit `id` prop.');
    }

    const uncontrolledOpen = ref(props.defaultOpen);
    // Mirrored out of core's state because the content mounts *after* the event
    // that opened the menu, and the effect that moves focus runs later still.
    const openFocus = ref<MenuOpenFocus>('first');
    const placement = ref<MenuPlacement>('bottom-start');

    const triggerRef = ref<HTMLElement | null>(null);
    const contentRef = ref<HTMLElement | null>(null);

    const isControlled = (): boolean => props.open !== undefined;
    const open = computed(() => props.open ?? uncontrolledOpen.value);

    const state = computed(() =>
      initialMenuState({
        id: props.id ?? vueId,
        open: open.value,
        loop: props.loop,
        typeahead: props.typeahead,
        openFocus: openFocus.value,
        placement: placement.value,
      }),
    );

    // Controlled-mode mirroring lives here, not in core. See docs/01 §9.
    const send = (event: MenuEvent): void => {
      const current = state.value;
      const next = menuReducer(current, event);
      if (next === current) return;

      if (next.placement !== current.placement) placement.value = next.placement;
      if (next.openFocus !== current.openFocus) openFocus.value = next.openFocus;

      if (next.open !== current.open) {
        if (!isControlled()) uncontrolledOpen.value = next.open;
        emit('update:open', next.open);
        emit('openChange', next.open);
      }

      // The one thing that distinguishes SELECT from CLOSE.
      if (event.type === 'SELECT') emit('select', event.value);
    };

    const api = computed(() => connectMenu(state.value, send, normalizeProps));

    provide(MenuContextKey, {
      api,
      triggerRef,
      contentRef,
      loop: computed(() => state.value.loop),
      typeahead: computed(() => state.value.typeahead),
      openFocus: computed(() => state.value.openFocus),
      placement: computed(() => state.value.placement),
      close: () => send({ type: 'CLOSE' }),
      setPlacement: (value: MenuPlacement) => send({ type: 'SET_PLACEMENT', value }),
    });

    return () => h('div', { ...attrs, ...api.value.rootProps }, slots.default?.());
  },
});

export const MenuTrigger = defineComponent({
  name: 'KansoMenuTrigger',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api, triggerRef } = useMenuContext('Trigger');
    return () =>
      h('button', { ref: triggerRef, ...attrs, ...api.value.triggerProps }, slots.default?.());
  },
});

/**
 * Renders only while open, which is what unmounts the content — and why the
 * trigger carries no `aria-controls`.
 */
export const MenuPositioner = defineComponent({
  name: 'KansoMenuPositioner',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api } = useMenuContext('Positioner');

    return () => {
      if (!api.value.open) return null;
      return h('div', { ...attrs, ...api.value.positionerProps }, slots.default?.());
    };
  },
});

export const MenuContent = defineComponent({
  name: 'KansoMenuContent',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const {
      api,
      contentRef,
      triggerRef,
      loop,
      typeahead,
      openFocus,
      placement,
      close,
      setPlacement,
    } = useMenuContext('Content');

    let deactivate: (() => void) | undefined;

    onMounted(() => {
      const content = contentRef.value;
      if (content === null) return;

      deactivate = activateMenu({
        content,
        getTrigger: () => triggerRef.value,
        openFocus: openFocus.value,
        loop: loop.value,
        typeahead: typeahead.value,
        placement: placement.value,
        onClose: close,
        onPlacementChange: setPlacement,
      });
    });

    onBeforeUnmount(() => {
      deactivate?.();
      deactivate = undefined;
    });

    return () =>
      h('div', { ref: contentRef, ...attrs, ...api.value.contentProps }, slots.default?.());
  },
});

export const MenuItem = defineComponent({
  name: 'KansoMenuItem',

  props: {
    /** Reported to `select`. */
    value: { type: String, required: true },
    /** Stays focusable and stays in the ring — it simply does nothing. */
    disabled: { type: Boolean, default: false },
  },

  inheritAttrs: false,

  setup(props, { attrs, slots }) {
    const { api } = useMenuContext('Item');
    return () =>
      h(
        'button',
        { ...attrs, ...api.value.getItemProps({ value: props.value, disabled: props.disabled }) },
        slots.default?.(),
      );
  },
});

export const MenuSeparator = defineComponent({
  name: 'KansoMenuSeparator',
  inheritAttrs: false,

  setup(_props, { attrs }) {
    const { api } = useMenuContext('Separator');
    return () => h('div', { ...attrs, ...api.value.separatorProps });
  },
});

/**
 * Generates the id its label will carry, so `aria-labelledby` always resolves.
 * No registration is needed, unlike Dialog's title: the id is known before
 * either element renders.
 */
export const MenuGroup = defineComponent({
  name: 'KansoMenuGroup',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api } = useMenuContext('Group');
    const labelId = useId();
    if (labelId === undefined) {
      throw new Error('[kanso] Menu needs Vue 3.5+ for useId().');
    }

    provide(MenuGroupKey, labelId);

    return () => h('div', { ...attrs, ...api.value.getGroupProps({ labelId }) }, slots.default?.());
  },
});

export const MenuGroupLabel = defineComponent({
  name: 'KansoMenuGroupLabel',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api } = useMenuContext('GroupLabel');
    const labelId = inject(MenuGroupKey, null);
    if (labelId === null) {
      throw new Error('[kanso] MenuGroupLabel must be rendered inside MenuGroup.');
    }

    return () =>
      h('div', { ...attrs, ...api.value.getGroupLabelProps({ labelId }) }, slots.default?.());
  },
});

/** Namespace form, which is how the docs show it: `<Menu.Root>`, `<Menu.Trigger>`… */
export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Positioner: MenuPositioner,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
};
