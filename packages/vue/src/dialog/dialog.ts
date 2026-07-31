import {
  activateDialog,
  connectDialog,
  type DialogApi,
  type DialogEvent,
  type DialogRole,
  type DialogState,
  dialogReducer,
  initialDialogState,
  scheduleDialogNameCheck,
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
  Teleport,
  useId,
} from 'vue';
import { normalizeProps, type VuePropTypes } from '../normalize-props';

/**
 * Dialog is the first component that is mostly *effects* rather than props, and
 * the adapter's job is correspondingly narrow: teleport, hold three
 * registration counters, and call `activateDialog` once when the content
 * appears. Everything about focus, dismissal, scrolling and inertness lives in
 * core — `docs/03` §3 and CLAUDE.md rule 2.
 *
 * As with Tabs, what is provided is a `computed`, never a snapshot of the api:
 * providing the object itself works on first render and then silently stops
 * updating, and Vue reports no error for it.
 */

type DialogPartName = 'title' | 'description' | 'ariaLabel';

interface DialogContext {
  api: ComputedRef<DialogApi<VuePropTypes>>;
  state: ComputedRef<DialogState>;
  mounted: Ref<boolean>;
  close: () => void;
  register: (part: DialogPartName) => () => void;
  triggerRef: Ref<HTMLElement | null>;
  getInitialFocus: () => (() => HTMLElement | null) | undefined;
  getFinalFocus: () => (() => HTMLElement | null) | undefined;
}

const DialogContextKey: InjectionKey<DialogContext> = Symbol('kanso-dialog');

function useDialogContext(part: string): DialogContext {
  const context = inject(DialogContextKey, null);
  if (context === null) {
    throw new Error(`[kanso] Dialog${part} must be rendered inside DialogRoot.`);
  }
  return context;
}

/**
 * Renders no element of its own — it returns its slot directly. The trigger
 * stays in the page and the rest is teleported to `<body>`, so there is no
 * position in the tree a wrapper could occupy without being wrong for one.
 */
export const DialogRoot = defineComponent({
  name: 'KansoDialogRoot',

  props: {
    /** `v-model:open` binding. */
    open: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Uncontrolled initial value. */
    defaultOpen: { type: Boolean, default: false },
    /** Modal traps focus and locks scrolling. Non-modal does neither. */
    modal: { type: Boolean, default: true },
    /** `alertdialog` for an interruption that needs a response. */
    role: { type: String as PropType<DialogRole>, default: 'dialog' },
    closeOnEscape: { type: Boolean, default: true },
    closeOnInteractOutside: { type: Boolean, default: true },
    /** Where focus goes on open. Defaults to the first focusable element. */
    initialFocus: {
      type: Function as PropType<(() => HTMLElement | null) | undefined>,
      default: undefined,
    },
    /** Where focus goes on close. Defaults to whatever had it when the dialog opened. */
    finalFocus: {
      type: Function as PropType<(() => HTMLElement | null) | undefined>,
      default: undefined,
    },
    id: { type: String as PropType<string | undefined>, default: undefined },
  },

  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
    openChange: (open: boolean) => typeof open === 'boolean',
  },

  setup(props, { emit, slots }) {
    // Vue owns id generation (3.5+). A counter in core would differ between the
    // server render and the client render — see CLAUDE.md rule 3.
    const vueId = useId();
    if (vueId === undefined) {
      throw new Error('[kanso] Dialog needs Vue 3.5+ for useId(), or an explicit `id` prop.');
    }

    const uncontrolledOpen = ref(props.defaultOpen);
    const triggerRef = ref<HTMLElement | null>(null);

    // Counted rather than flagged, so that two `DialogDescription` parts in one
    // dialog — a consumer mistake — cannot corrupt the count permanently.
    const parts = ref({ title: 0, description: 0, ariaLabel: 0 });

    const register = (part: DialogPartName) => {
      parts.value = { ...parts.value, [part]: parts.value[part] + 1 };
      return () => {
        parts.value = { ...parts.value, [part]: parts.value[part] - 1 };
      };
    };

    // A `<Teleport>` is renderable on the server, but its output is collected
    // separately from the main HTML string rather than emitted in place, so
    // hydrating it needs machinery this adapter should not carry. Gating on
    // mount keeps the server render empty and the client render whole.
    // `docs/03` §3 decision 2.
    const mounted = ref(false);
    onMounted(() => {
      mounted.value = true;
    });

    const isControlled = (): boolean => props.open !== undefined;
    const open = computed(() => props.open ?? uncontrolledOpen.value);

    // Derived, not stored. Every field except `open` is a prop or a
    // registration, and either copied into state goes stale when it changes.
    const state = computed(() =>
      initialDialogState({
        id: props.id ?? vueId,
        open: open.value,
        modal: props.modal,
        role: props.role,
        closeOnEscape: props.closeOnEscape,
        closeOnInteractOutside: props.closeOnInteractOutside,
        hasTitle: parts.value.title > 0,
        hasDescription: parts.value.description > 0,
        hasAriaLabel: parts.value.ariaLabel > 0,
      }),
    );

    // Controlled-mode mirroring lives here, not in core. See docs/01 §9.
    const send = (event: DialogEvent): void => {
      const current = state.value;
      const next = dialogReducer(current, event);
      // Reference equality means the reducer refused it — closing an already
      // closed dialog, which Escape and a press outside can both ask for in the
      // same frame.
      if (next === current) return;
      if (!isControlled()) uncontrolledOpen.value = next.open;
      emit('update:open', next.open);
      emit('openChange', next.open);
    };

    const api = computed(() => connectDialog(state.value, send, normalizeProps));

    provide(DialogContextKey, {
      api,
      state,
      mounted,
      close: () => send({ type: 'CLOSE' }),
      register,
      triggerRef,
      getInitialFocus: () => props.initialFocus,
      getFinalFocus: () => props.finalFocus,
    });

    return () => slots.default?.();
  },
});

export const DialogTrigger = defineComponent({
  name: 'KansoDialogTrigger',
  // Applied by hand below, so that core's props win over a consumer's. Left on,
  // Vue merges fallthrough attrs *over* the render's props, which would let a
  // stray `id` or `aria-expanded` displace the one the component depends on.
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api, triggerRef } = useDialogContext('Trigger');
    return () =>
      h('button', { ref: triggerRef, ...attrs, ...api.value.triggerProps }, slots.default?.());
  },
});

/**
 * The teleport, and the only part that decides whether anything renders at all.
 *
 * Teleporting to `<body>` is what stops an ancestor's `overflow: hidden`,
 * `transform` or `z-index` from clipping or mis-stacking the dialog — the most
 * common reason a modal looks broken in a real application.
 */
export const DialogPositioner = defineComponent({
  name: 'KansoDialogPositioner',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api, mounted } = useDialogContext('Positioner');

    return () => {
      if (!api.value.open || !mounted.value) return null;
      return h(Teleport, { to: 'body' }, [
        h('div', { ...attrs, ...api.value.positionerProps }, slots.default?.()),
      ]);
    };
  },
});

/**
 * Paint. It carries no handler: a press on it dismisses because it is outside
 * the content, which is the same path that covers the positioner's own padding.
 * Rendered inside the positioner rather than beside it — a separately
 * teleported backdrop is a sibling of the content, so the focus trap marks it
 * `inert` and it stops receiving presses entirely. `docs/03` §3 decision 11.
 */
export const DialogBackdrop = defineComponent({
  name: 'KansoDialogBackdrop',
  inheritAttrs: false,

  setup(_props, { attrs }) {
    const { api } = useDialogContext('Backdrop');
    return () => h('div', { ...attrs, ...api.value.backdropProps });
  },
});

export const DialogContent = defineComponent({
  name: 'KansoDialogContent',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api, state, close, register, triggerRef, getInitialFocus, getFinalFocus } =
      useDialogContext('Content');

    const contentRef = ref<HTMLElement | null>(null);
    let releaseAriaLabel: (() => void) | undefined;
    let deactivate: (() => void) | undefined;
    let cancelNameCheck: (() => void) | undefined;

    onMounted(() => {
      const content = contentRef.value;
      if (content === null) return;

      // Registered from the mount hook rather than from `setup`, in both
      // adapters: writing to the root's state while the root is still
      // rendering is a recursive update, and Vue's own warning for it is the
      // kind that appears once in a consumer's console with no context.
      if (((attrs['aria-label'] as string | undefined) ?? '') !== '') {
        releaseAriaLabel = register('ariaLabel');
      }

      const { modal, closeOnEscape, closeOnInteractOutside } = state.value;
      deactivate = activateDialog({
        content,
        modal,
        closeOnEscape,
        closeOnInteractOutside,
        initialFocus: getInitialFocus(),
        finalFocus: getFinalFocus(),
        getTrigger: () => triggerRef.value,
        onClose: close,
      });

      // Not run inline: the title registers from its own mount hook, so
      // `aria-labelledby` is still a render behind at this point. Core owns the
      // delay — see `scheduleDialogNameCheck`.
      cancelNameCheck = scheduleDialogNameCheck(content);
    });

    onBeforeUnmount(() => {
      cancelNameCheck?.();
      cancelNameCheck = undefined;
      deactivate?.();
      deactivate = undefined;
      releaseAriaLabel?.();
      releaseAriaLabel = undefined;
    });

    return () =>
      h('div', { ref: contentRef, ...attrs, ...api.value.contentProps }, slots.default?.());
  },
});

/**
 * Registers itself so that `aria-labelledby` is emitted only once this exists.
 * Pointing the content at an id that was never rendered leaves the dialog with
 * no accessible name at all — worse than the unnamed one it would otherwise be.
 */
export const DialogTitle = defineComponent({
  name: 'KansoDialogTitle',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api, register } = useDialogContext('Title');
    let release: (() => void) | undefined;

    onMounted(() => {
      release = register('title');
    });
    onBeforeUnmount(() => release?.());

    return () => h('h2', { ...attrs, ...api.value.titleProps }, slots.default?.());
  },
});

export const DialogDescription = defineComponent({
  name: 'KansoDialogDescription',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api, register } = useDialogContext('Description');
    let release: (() => void) | undefined;

    onMounted(() => {
      release = register('description');
    });
    onBeforeUnmount(() => release?.());

    return () => h('p', { ...attrs, ...api.value.descriptionProps }, slots.default?.());
  },
});

export const DialogClose = defineComponent({
  name: 'KansoDialogClose',
  inheritAttrs: false,

  setup(_props, { attrs, slots }) {
    const { api } = useDialogContext('Close');
    return () => h('button', { ...attrs, ...api.value.closeProps }, slots.default?.());
  },
});

/** Namespace form, which is how the docs show it: `<Dialog.Root>`, `<Dialog.Trigger>`… */
export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Positioner: DialogPositioner,
  Backdrop: DialogBackdrop,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};
