# 01 — Architecture

The single most important document in this repo. If you read one thing before
writing code, read this.

## 1. The shape of the idea

```
                  ┌─────────────────────────────┐
                  │   @caioalfonso/kanso-core   │
                  │  plain TypeScript, no deps  │
                  │                             │
                  │  types · reducer · connect  │
                  │      · DOM utilities        │
                  └──────────────┬──────────────┘
                                 │  neutral prop bags
                  ┌──────────────┴──────────────┐
                  ▼                             ▼
      ┌───────────────────────┐     ┌───────────────────────┐
      │ @caioalfonso/kanso-vue│     │@caioalfonso/kanso-react│
      │  reactivity + render  │     │  reactivity + render  │
      │   normalizeProps      │     │   normalizeProps      │
      └───────────────────────┘     └───────────────────────┘
```

Core owns: state shape, state transitions, ARIA attributes, keyboard handling,
focus management, id wiring, data attributes.

Adapters own: holding state in the framework's reactive primitive, calling
`connect`, translating the neutral prop bag to framework-native props, rendering
elements, and exposing an idiomatic component API.

**Nothing else.** An adapter containing an `if (event.key === 'ArrowDown')` is a
bug — that belongs in core.

## 2. Why this pattern, and its precedent

This is the model used by **Zag.js** (Chakra) and, in spirit, **Ariakit** and
**Downshift**. It is not experimental. The prior art matters: when stuck on a
detail, those codebases are a legitimate reference for how a problem was solved.

The alternative — writing components twice, once per framework — was explicitly
rejected. It duplicates the hard part (a11y) and guarantees the two
implementations drift.

The cost is honest and worth stating: **a layer of indirection**. A one-off
component is more code this way. The pattern pays off at the second framework and
at every subsequent component, because the expensive part is written once.

## 3. Core contracts

Three types define the whole boundary. They live in `packages/core/src/types.ts`.

```ts
/** The neutral prop shape core emits. Deliberately loose — adapters narrow it. */
export interface PropTypes<T = any> {
  element: T
  button: T
  input: T
  label: T
}

/** Each adapter supplies one of these to translate neutral props to native ones. */
export interface NormalizeProps<T extends PropTypes> {
  element: (props: Dict) => T['element']
  button: (props: Dict) => T['button']
  input: (props: Dict) => T['input']
  label: (props: Dict) => T['label']
}

export type Dict = Record<string, any>
```

Per component, core exports exactly three things:

```ts
// 1. Types — public props, internal state, events
export interface SwitchState { ... }
export type SwitchEvent = ...

// 2. A pure reducer
export function switchReducer(state: SwitchState, event: SwitchEvent): SwitchState

// 3. A connect function producing prop bags
export function connectSwitch<T extends PropTypes>(
  state: SwitchState,
  send: (event: SwitchEvent) => void,
  normalize: NormalizeProps<T>,
): SwitchApi<T>
```

### The reducer is pure

`(state, event) => state`. No DOM access, no side effects, no timers. This makes
core trivially unit-testable — the most valuable property of the whole design,
because state transition bugs are where a11y bugs actually live.

Side effects (focus moves, scroll lock, listeners on `document`) are **not** in the
reducer. They are separate, explicitly-invoked DOM utilities that adapters call in
their lifecycle hooks, driven by state changes. See §6.

### `connect` is pure too

Given a state and a dispatcher, it returns prop objects. Called on every render.
Cheap — no allocation-heavy work, no memoisation requirements pushed onto consumers.

## 4. `normalizeProps` — the piece that makes one core serve two frameworks

Core emits a neutral prop bag:

```ts
{
  'data-part': 'control',
  role: 'switch',
  'aria-checked': true,
  class: undefined,
  onClick: handler,
  onKeyDown: handler,
}
```

Each adapter translates. The differences are small but real, and getting them
wrong **fails silently** — the attribute simply never reaches the DOM.

| Neutral | React | Vue |
|---|---|---|
| `class` | `className` | `class` |
| `for` | `htmlFor` | `for` |
| `onKeyDown` | same | `onkeydown` |
| `onClick` | same | `onclick` |
| `style` (object) | object | object |
| `defaultValue` | same | n/a — Vue uses `value` |

**The neutral event form is React's camelCase**, and the asymmetry is forced,
not arbitrary. `keydown` → `KeyDown` needs a word list — no rule derives the
capital `D`. `KeyDown` → `keydown` is one `toLowerCase()`. So core emits the
form that can be mechanically converted, and Vue carries the conversion.

React is then just a rename map:

```ts
// packages/react/src/normalize-props.ts
const propMap: Record<string, string> = { class: 'className', for: 'htmlFor' }

export const normalizeProps = createNormalizer<ReactPropTypes>((props: Dict) => {
  const out: Dict = {}
  for (const key in props) {
    const value = props[key]
    if (value === undefined) continue
    out[propMap[key] ?? key] = value
  }
  return out
})
```

Vue keeps `class` / `for` as written, drops `undefined` so its emitted attribute
set matches React's exactly, and lowercases handler names:

```ts
// packages/vue/src/normalize-props.ts — the event branch
if (key.startsWith('on') && key.length > 2 && !key.includes(':')) {
  out[`on${key.slice(2).toLowerCase()}`] = value
  continue
}
```

The lowercasing is load-bearing. Vue derives the DOM event name by running the
part after `on` through `hyphenate`, so `onKeyDown` binds a listener for
`key-down` — an event no browser fires, with no warning anywhere. `onUpdate:modelValue`
is exempted: the colon marks it a component event, and lowercasing breaks `v-model`.

> Write `normalizeProps` once in Phase 0 and test it directly, including an
> assertion that the props actually land on a rendered element. Every component
> depends on it, so a bug here is a bug everywhere — and both failure modes are
> silent.

## 5. IDs — the SSR trap

**Core must never generate ids.** Not with a counter, not with `Math.random`, not
with `crypto.randomUUID`. All three produce different values on server and client
and cause hydration mismatches.

Ids are **passed into** core:

```ts
export interface SwitchProps {
  /** Base id. Adapters supply this from the framework's stable id primitive. */
  id: string
  ...
}

// core derives deterministic part ids from the base
export const switchIds = (id: string) => ({
  root:    `kanso-switch-${id}`,
  control: `kanso-switch-${id}-control`,
  label:   `kanso-switch-${id}-label`,
})
```

Adapters source the base id from the framework:

- **React** — `useId()` (available since React 18)
- **Vue 3.5+** — `useId()` (requires an app-level id prefix for SSR; document it)

Both are SSR-stable by design. A `id` prop always overrides, for consumers who need
to control it.

Phase 1 adds a server-render test in both frameworks specifically to lock this in.

## 6. Side effects and DOM utilities

Effects live in `packages/core/src/dom/`, as plain functions with explicit
teardown. Adapters invoke them from `useEffect` / `onMounted` + `onUnmounted`.

```
core/src/dom/
├─ focus-trap.ts       trapFocus(container): () => void
├─ focusable.ts        getFocusableElements(container): HTMLElement[]
├─ scroll-lock.ts      lockScroll(): () => void
├─ dismissable.ts      onOutsideClick / onEscape helpers
├─ roving-focus.ts     roving tabindex manager (Tabs, Menu)
├─ typeahead.ts        type-to-select buffer (Menu)
└─ attrs.ts            dataAttr(), ariaAttr() helpers
```

Every one of these returns its own cleanup function. No global registry, no
implicit teardown.

`attrs.ts` is small but used everywhere:

```ts
/** Emit the attribute only when true — `data-disabled=""` vs absent. */
export const dataAttr = (cond: boolean | undefined) => (cond ? '' : undefined)
export const ariaAttr = (cond: boolean | undefined) => (cond ? true : undefined)
```

### Composition, not inheritance

`Menu` reuses `focus-trap`, `dismissable`, `roving-focus` and `typeahead`. `Dialog`
reuses `focus-trap`, `scroll-lock`, `dismissable`. That reuse is precisely why the
build order in `docs/07` is Switch → Tabs → Dialog → Menu: each phase builds a
utility the next one needs.

## 7. Per-component file layout

```
packages/core/src/switch/
├─ switch.types.ts     public props, state shape, event union
├─ switch.anatomy.ts   part names, exported for docs + styles
├─ switch.state.ts     initial state + pure reducer
├─ switch.connect.ts   connect() → prop bags
├─ switch.dom.ts       (only if the component needs DOM effects)
└─ index.ts            barrel
```

`anatomy.ts` is not ceremony — it is a single source of truth consumed by the
docs site (to render the anatomy table) and by the stylesheet (to know which
`data-part` values exist).

```ts
export const switchAnatomy = ['root', 'control', 'thumb', 'label'] as const
export type SwitchPart = (typeof switchAnatomy)[number]
```

## 8. A worked example — Switch, end to end

Enough detail to implement Phase 1 without further design decisions.

```ts
// switch.types.ts
export interface SwitchState {
  checked: boolean
  disabled: boolean
  readOnly: boolean
  focusVisible: boolean
  ids: ReturnType<typeof switchIds>
}

export type SwitchEvent =
  | { type: 'TOGGLE' }
  | { type: 'SET_CHECKED'; value: boolean }
  | { type: 'FOCUS'; visible: boolean }
  | { type: 'BLUR' }
```

```ts
// switch.state.ts
export function switchReducer(state: SwitchState, event: SwitchEvent): SwitchState {
  switch (event.type) {
    case 'TOGGLE':
      if (state.disabled || state.readOnly) return state
      return { ...state, checked: !state.checked }
    case 'SET_CHECKED':
      return state.checked === event.value ? state : { ...state, checked: event.value }
    case 'FOCUS':
      return { ...state, focusVisible: event.visible }
    case 'BLUR':
      return { ...state, focusVisible: false }
    default:
      return state
  }
}
```

```ts
// switch.connect.ts
export function connectSwitch<T extends PropTypes>(
  state: SwitchState,
  send: (e: SwitchEvent) => void,
  normalize: NormalizeProps<T>,
) {
  const { checked, disabled, readOnly, ids } = state

  return {
    checked,
    disabled,
    setChecked: (value: boolean) => send({ type: 'SET_CHECKED', value }),

    rootProps: normalize.element({
      // Root-only marker. The stylesheet scopes itself with `[data-kanso] [data-part=…]`,
      // so this must be present on the root and absent everywhere else.
      'data-kanso': '',
      'data-scope': 'switch',
      'data-part': 'root',
      'data-state': checked ? 'checked' : 'unchecked',
      'data-disabled': dataAttr(disabled),
    }),

    controlProps: normalize.button({
      'data-part': 'control',
      'data-state': checked ? 'checked' : 'unchecked',
      'data-disabled': dataAttr(disabled),
      id: ids.control,
      type: 'button',
      role: 'switch',
      'aria-checked': checked,
      'aria-labelledby': ids.label,
      'aria-readonly': ariaAttr(readOnly),
      disabled,
      onClick: () => send({ type: 'TOGGLE' }),
      onFocus: () => send({ type: 'FOCUS', visible: true }),
      onBlur: () => send({ type: 'BLUR' }),
    }),

    thumbProps: normalize.element({
      'data-part': 'thumb',
      'data-state': checked ? 'checked' : 'unchecked',
    }),

    labelProps: normalize.label({
      'data-part': 'label',
      id: ids.label,
      'data-disabled': dataAttr(disabled),
    }),
  }
}
```

Note what is **absent**: no `keydown` handler. A native `<button>` already fires
`click` on Space and Enter. Reaching for `role="switch"` on a `<div>` and
hand-rolling keyboard support is the classic mistake — use the native element and
inherit its behaviour. Apply this instinct to every component.

### React adapter

```tsx
export function Switch({ checked, defaultChecked, onCheckedChange, ...props }: SwitchProps) {
  const reactId = useId()
  const [state, send] = useReducer(switchReducer, undefined, () =>
    initialSwitchState({ id: props.id ?? reactId, checked: defaultChecked ?? false, ...props }),
  )
  // controlled mode: mirror the prop into state
  ...
  const api = connectSwitch(state, send, normalizeProps)
  return (
    <span {...api.rootProps}>
      <button {...api.controlProps}><span {...api.thumbProps} /></button>
      <label {...api.labelProps}>{props.label}</label>
    </span>
  )
}
```

### Vue adapter

```vue
<script setup lang="ts">
const vueId = useId()
const state = ref(initialSwitchState({ id: props.id ?? vueId, ... }))
const send = (e: SwitchEvent) => { state.value = switchReducer(state.value, e) }
const api = computed(() => connectSwitch(state.value, send, normalizeProps))
</script>

<template>
  <span v-bind="api.rootProps">
    <button v-bind="api.controlProps"><span v-bind="api.thumbProps" /></button>
    <label v-bind="api.labelProps">{{ label }}</label>
  </span>
</template>
```

The symmetry is the point. Both files are ~20 lines and contain no behaviour.

## 9. Controlled vs uncontrolled

Every stateful component supports both, with a consistent convention:

- `value` / `checked` / `open` — controlled. Present ⇒ the consumer owns state.
- `defaultValue` / `defaultChecked` / `defaultOpen` — uncontrolled initial value.
- `onValueChange` / `onCheckedChange` / `onOpenChange` — always fired, both modes.

Core stays ignorant of the distinction: it holds state and reports transitions.
Adapters implement the controlled-mode mirroring, since that is framework-idiomatic
(React: sync in render/effect; Vue: `watch` the prop). This is the one place a
small amount of per-framework logic is legitimate — document it where it appears.

Vue additionally supports `v-model` via `modelValue` / `update:modelValue`, mapped
onto the same core events.

## 10. Package layout and entry points

Tree-shaking matters — importing `Switch` must not drag in `Dialog`'s focus trap.

Each package exposes per-component subpath exports **and** a barrel:

```jsonc
{
  "name": "@caioalfonso/kanso-react",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".":          { "types": "./dist/index.d.ts",  "import": "./dist/index.js" },
    "./switch":   { "types": "./dist/switch.d.ts", "import": "./dist/switch.js" },
    "./dialog":   { "types": "./dist/dialog.d.ts", "import": "./dist/dialog.js" }
  },
  "peerDependencies": { "react": "^19", "react-dom": "^19" },
  "dependencies": { "@caioalfonso/kanso-core": "workspace:^" }
}
```

`sideEffects: false` is what lets bundlers drop unused components from the barrel
import. Verify it — do not assume it.

`workspace:^` is rewritten to a real version range by changesets at publish time.

## 11. Dependency rules, enforced

| Package | May depend on |
|---|---|
| `core` | **nothing** (zero runtime deps, zero framework imports) |
| `vue` | `core`; peer `vue` |
| `react` | `core`; peer `react`, `react-dom` |
| `styles` | nothing (pure CSS) |
| `docs` | all of the above |

CI enforces the core rule mechanically — see `docs/05` §6. A type-only import of
`vue` in core still counts as a violation, because it signals the design has
leaked even if the bytes do not.

## 12. Adding a new component (the repeatable path)

Once Phase 1 is done, every component follows the same nine steps. This is what
makes the pattern pay off:

1. Read the WAI-ARIA APG pattern. Write the keyboard table into `docs/03` **first**.
2. `packages/core/src/<name>/` — types, anatomy, state, connect.
3. Core unit tests for every reducer transition.
4. Any new DOM utility in `core/src/dom/`, with its own tests.
5. Vue adapter + React adapter.
6. Adapter tests in both: render, interaction, full keyboard map, axe, SSR.
7. Stylesheet part in `packages/styles`, `data-part` selectors only.
8. Docs page + `/embed/<name>` route.
9. Changeset, then tick `docs/09-progress-checklist.md`.
