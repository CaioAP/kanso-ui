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
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { normalizeProps, type ReactPropTypes } from '../normalize-props';

/**
 * Menu is the widest keyboard surface in the library and the thinnest adapter
 * so far: arrows, `Home`/`End`, typeahead, `Tab` and dismissal all live in
 * core's `activateMenu`, because every one of them needs either the live item
 * collection or a buffer that survives between keystrokes.
 *
 * Not portalled, deliberately — `docs/03` §4 decision 3. The root element is
 * the positioning anchor, and rendering in flow is also what lets a menu work
 * inside a dialog: a portalled menu would be a *sibling* of the dialog content,
 * and the dialog's focus trap would pull focus out of it.
 */

interface MenuContextValue {
  api: MenuApi<ReactPropTypes>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  loop: boolean;
  typeahead: boolean;
  openFocus: MenuOpenFocus;
  placement: MenuPlacement;
  close: () => void;
  setPlacement: (placement: MenuPlacement) => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(part: string): MenuContextValue {
  const context = useContext(MenuContext);
  if (context === null) {
    throw new Error(`[kanso] Menu.${part} must be rendered inside Menu.Root.`);
  }
  return context;
}

/** Carries the label id from `Menu.Group` down to `Menu.GroupLabel`. */
const MenuGroupContext = createContext<string | null>(null);

export interface MenuRootProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect'> {
  /** Controlled value. Present ⇒ the consumer owns whether the menu is open. */
  open?: boolean;
  /** Uncontrolled initial value. */
  defaultOpen?: boolean;
  /** Fired in both modes, after the reducer has accepted the change. */
  onOpenChange?: (open: boolean) => void;
  /** Fired when an item is chosen, with that item's `value`. */
  onSelect?: (value: string) => void;
  /** Whether the arrows wrap past the ends. Default `true`. */
  loop?: boolean;
  /** Whether typing letters moves focus. Default `true`. */
  typeahead?: boolean;
  children?: ReactNode;
}

export function MenuRoot({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  onSelect,
  loop,
  typeahead,
  id: providedId,
  children,
  ...rootAttributes
}: MenuRootProps) {
  // React owns id generation. A counter in core would differ between the server
  // render and the client render — see CLAUDE.md rule 3.
  const reactId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
  // Mirrored out of core's state because the content mounts *after* the event
  // that opened the menu, and the effect that moves focus runs later still.
  const [openFocus, setOpenFocus] = useState<MenuOpenFocus>('first');
  const [placement, setPlacement] = useState<MenuPlacement>('bottom-start');

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // Derived on every render rather than held in a reducer: every field except
  // these three is a prop, and a prop copied into state goes stale.
  const state = initialMenuState({
    id: providedId ?? reactId,
    open,
    loop,
    typeahead,
    openFocus,
    placement,
  });

  // Controlled-mode mirroring lives here, not in core. See docs/01 §9.
  const send = (event: MenuEvent) => {
    const next = menuReducer(state, event);
    // Reference equality means the reducer refused it — closing an already
    // closed menu, which Escape and a press outside can both ask for.
    if (next === state) return;

    if (next.placement !== state.placement) setPlacement(next.placement);
    if (next.openFocus !== state.openFocus) setOpenFocus(next.openFocus);

    if (next.open !== state.open) {
      if (!isControlled) setUncontrolledOpen(next.open);
      onOpenChange?.(next.open);
    }

    // The one thing that distinguishes SELECT from CLOSE, and the reason they
    // are separate events at all.
    if (event.type === 'SELECT') onSelect?.(event.value);
  };

  const api = connectMenu(state, send, normalizeProps);

  // `send` closes over this render's state; the content's effect is armed once
  // per open. Reading the latest through refs is what keeps a dismissal from
  // dispatching against a state object several renders old.
  const closeRef = useRef<() => void>(() => {});
  closeRef.current = () => send({ type: 'CLOSE' });
  const close = useCallback(() => closeRef.current(), []);

  const placementRef = useRef<(placement: MenuPlacement) => void>(() => {});
  placementRef.current = (value: MenuPlacement) => send({ type: 'SET_PLACEMENT', value });
  const reportPlacement = useCallback((value: MenuPlacement) => placementRef.current(value), []);

  return (
    <MenuContext.Provider
      value={{
        api,
        triggerRef,
        contentRef,
        loop: state.loop,
        typeahead: state.typeahead,
        openFocus: state.openFocus,
        placement: state.placement,
        close,
        setPlacement: reportPlacement,
      }}
    >
      <div {...rootAttributes} {...api.rootProps}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export interface MenuTriggerProps extends ComponentPropsWithRef<'button'> {
  children?: ReactNode;
}

export function MenuTrigger({ children, ...attributes }: MenuTriggerProps) {
  const { api, triggerRef } = useMenuContext('Trigger');
  return (
    <button ref={triggerRef} {...attributes} {...api.triggerProps}>
      {children}
    </button>
  );
}

export interface MenuPositionerProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

/**
 * Renders only while open, which is what unmounts the content — and why the
 * trigger carries no `aria-controls`.
 */
export function MenuPositioner({ children, ...attributes }: MenuPositionerProps) {
  const { api } = useMenuContext('Positioner');
  if (!api.open) return null;

  return (
    <div {...attributes} {...api.positionerProps}>
      {children}
    </div>
  );
}

export interface MenuContentProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

export function MenuContent({ children, ...attributes }: MenuContentProps) {
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

  // Armed once per open — the content only exists while the menu is open, so
  // "once per mount" is "once per open". Re-running would re-move focus while
  // the user is navigating.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (content === null) return;

    return activateMenu({
      content,
      getTrigger: () => triggerRef.current,
      openFocus,
      loop,
      typeahead,
      placement,
      onClose: close,
      onPlacementChange: setPlacement,
    });
  }, []);

  return (
    <div ref={contentRef} {...attributes} {...api.contentProps}>
      {children}
    </div>
  );
}

export interface MenuItemProps extends Omit<ComponentPropsWithRef<'button'>, 'value' | 'disabled'> {
  /** Reported to `onSelect`. */
  value: string;
  /** Stays focusable and stays in the ring — it simply does nothing. */
  disabled?: boolean;
  children?: ReactNode;
}

export function MenuItem({ value, disabled, children, ...attributes }: MenuItemProps) {
  const { api } = useMenuContext('Item');
  return (
    <button {...attributes} {...api.getItemProps({ value, disabled })}>
      {children}
    </button>
  );
}

export type MenuSeparatorProps = ComponentPropsWithRef<'div'>;

export function MenuSeparator(attributes: MenuSeparatorProps) {
  const { api } = useMenuContext('Separator');
  return <div {...attributes} {...api.separatorProps} />;
}

export interface MenuGroupProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

/**
 * Generates the id its label will carry, so `aria-labelledby` always resolves.
 * Unlike Dialog's title, no registration is needed: a group without a label is
 * a consumer mistake this component cannot paper over, and the id is known
 * before either element renders.
 */
export function MenuGroup({ children, ...attributes }: MenuGroupProps) {
  const { api } = useMenuContext('Group');
  const labelId = useId();

  return (
    <MenuGroupContext.Provider value={labelId}>
      <div {...attributes} {...api.getGroupProps({ labelId })}>
        {children}
      </div>
    </MenuGroupContext.Provider>
  );
}

export interface MenuGroupLabelProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

export function MenuGroupLabel({ children, ...attributes }: MenuGroupLabelProps) {
  const { api } = useMenuContext('GroupLabel');
  const labelId = useContext(MenuGroupContext);
  if (labelId === null) {
    throw new Error('[kanso] Menu.GroupLabel must be rendered inside Menu.Group.');
  }

  return (
    <div {...attributes} {...api.getGroupLabelProps({ labelId })}>
      {children}
    </div>
  );
}

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
