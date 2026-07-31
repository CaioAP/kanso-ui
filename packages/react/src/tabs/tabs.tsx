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
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from 'react';
import { normalizeProps, type ReactPropTypes } from '../normalize-props';

/**
 * Tabs is the first compound component: four elements sharing one state, with
 * arbitrary consumer markup in between. A single component taking an `items`
 * array would avoid the context below, and would also make it impossible to put
 * anything of your own inside a panel — which is the whole point of tabs.
 *
 * The api is recreated on every render of `Tabs.Root` and handed down whole.
 * There is no memoisation: `connectTabs` is pure and cheap, and a stale api in
 * context is a much worse failure than an extra render.
 */
const TabsContext = createContext<TabsApi<ReactPropTypes> | null>(null);

function useTabsContext(part: string): TabsApi<ReactPropTypes> {
  const api = useContext(TabsContext);
  if (api === null) {
    // Loudly, at the point of the mistake. Without this the failure is a
    // TypeError deep inside a prop getter, which says nothing useful.
    throw new Error(`[kanso] Tabs.${part} must be rendered inside Tabs.Root.`);
  }
  return api;
}

type RootAttributes = Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange'>;

export interface TabsRootProps extends RootAttributes {
  /** Controlled value. Present ⇒ the consumer owns which tab is selected. */
  value?: string;
  /**
   * Uncontrolled initial value. With neither this nor `value`, no tab is
   * selected and the list has no tab stop — see `docs/03` §2 decision 6.
   */
  defaultValue?: string;
  /** Fired in both modes, after the reducer has accepted the change. */
  onValueChange?: (value: string) => void;
  /** Which arrow keys move between tabs. Default `'horizontal'`. */
  orientation?: Orientation;
  /** Whether focus selects. Default `'automatic'`. */
  activationMode?: TabsActivationMode;
  /** Whether the arrows wrap past the ends. Default `true`. */
  loop?: boolean;
  children?: ReactNode;
}

export function TabsRoot({
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation,
  activationMode,
  loop,
  id: providedId,
  children,
  ...rootAttributes
}: TabsRootProps) {
  // React owns id generation. A counter in core would differ between the server
  // render and the client render — see CLAUDE.md rule 3.
  const reactId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  // Derived on every render rather than held in a reducer. Every field except
  // `value` is a prop, and a prop stored in state goes stale the moment the
  // consumer changes it. `initialTabsState` is pure, so this is free.
  const state = initialTabsState({
    id: providedId ?? reactId,
    value,
    orientation,
    activationMode,
    loop,
  });

  // Controlled-mode mirroring lives here, not in core: core holds state and
  // reports transitions, adapters decide who owns the value. See docs/01 §9.
  const send = (event: TabsEvent) => {
    const next = tabsReducer(state, event);
    // Reference equality means the reducer refused it — here, a select of the
    // tab already selected. Nothing to report.
    if (next === state) return;
    if (!isControlled) setUncontrolledValue(next.value);
    if (next.value !== undefined) onValueChange?.(next.value);
  };

  const api = connectTabs(state, send, normalizeProps);

  return (
    <TabsContext.Provider value={api}>
      <div {...rootAttributes} {...api.rootProps}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

export function TabsList({ children, ...attributes }: TabsListProps) {
  const api = useTabsContext('List');
  return (
    <div {...attributes} {...api.listProps}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends Omit<ComponentPropsWithRef<'button'>, 'value'> {
  /** Identifies the tab. Must match the `value` of exactly one `Tabs.Content`. */
  value: string;
  children?: ReactNode;
}

export function TabsTrigger({ value, children, ...attributes }: TabsTriggerProps) {
  const api = useTabsContext('Trigger');
  return (
    <button {...attributes} {...api.getTriggerProps({ value })}>
      {children}
    </button>
  );
}

export interface TabsContentProps extends Omit<ComponentPropsWithRef<'div'>, 'value'> {
  /** Identifies the panel. Must match the `value` of exactly one `Tabs.Trigger`. */
  value: string;
  children?: ReactNode;
}

/**
 * Always rendered, `hidden` when unselected — never conditionally mounted.
 * Unmounting it would leave `aria-controls` on its trigger pointing at nothing,
 * which no automated check reports. To defer expensive work, put the condition
 * inside: `<Tabs.Content value="x">{isSelected && <Heavy />}</Tabs.Content>`.
 */
export function TabsContent({ value, children, ...attributes }: TabsContentProps) {
  const api = useTabsContext('Content');
  return (
    <div {...attributes} {...api.getContentProps({ value })}>
      {children}
    </div>
  );
}

/** Namespace form, which is how the docs show it: `<Tabs.Root>`, `<Tabs.List>`… */
export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};
