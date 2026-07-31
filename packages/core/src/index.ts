export { ariaAttr, dataAttr } from './dom/attrs';
export {
  getRovingIndex,
  getRovingItems,
  getRovingMove,
  type Orientation,
  type RovingIndexOptions,
  type RovingMove,
} from './dom/roving-focus';
export { createNormalizer } from './normalize';
export {
  connectSwitch,
  initialSwitchState,
  type SwitchApi,
  type SwitchEvent,
  type SwitchIds,
  type SwitchPart,
  type SwitchSend,
  type SwitchState,
  type SwitchStateInit,
  switchAnatomy,
  switchIds,
  switchReducer,
} from './switch';
export {
  connectTabs,
  initialTabsState,
  type KeyboardEventLike,
  type TabsActivationMode,
  type TabsApi,
  type TabsContentProps,
  type TabsEvent,
  type TabsIds,
  type TabsPart,
  type TabsSend,
  type TabsState,
  type TabsStateInit,
  type TabsTriggerProps,
  tabsAnatomy,
  tabsContentId,
  tabsIds,
  tabsReducer,
  tabsTriggerId,
} from './tabs';
export type { Dict, NormalizeProps, PropTypes } from './types';
