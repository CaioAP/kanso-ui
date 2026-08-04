---
title: Architecture
description: One framework-agnostic core, two thin adapters — what lives where, and what the indirection costs.
---

Every behaviour in kanso-ui — state transitions, keyboard handling, ARIA
attributes, focus management, id wiring — is written once, in plain TypeScript,
in `@caioalfonso/kanso-core`. The Vue and React packages bind reactivity and
render. That is the whole design.

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
┌──────────────────┐      ┌────────────────────┐
│ kanso-vue        │      │ kanso-react        │
│ reactivity       │      │ reactivity         │
│ + render         │      │ + render           │
│ normalizeProps   │      │ normalizeProps     │
└──────────────────┘      └────────────────────┘
```

**Core owns** the state shape, the transitions, the ARIA attributes, the
keyboard map, focus management, id derivation and the `data-*` attributes.

**Adapters own** holding state in the framework's reactive primitive, calling
`connect`, translating the neutral prop bag into framework-native props,
rendering elements, and exposing an idiomatic component API.

Nothing else. An adapter containing an `if (event.key === 'ArrowDown')` is a
bug in this library, not a shortcut.

## The three things core exports per component

```ts
// 1. Types
export interface SwitchState { /* … */ }
export type SwitchEvent =
  | { type: 'TOGGLE' }
  | { type: 'SET_CHECKED'; value: boolean }

// 2. A pure reducer
export function switchReducer(
  state: SwitchState,
  event: SwitchEvent,
): SwitchState

// 3. connect() — state in, prop bags out
export function connectSwitch<T extends PropTypes>(
  state: SwitchState,
  send: (event: SwitchEvent) => void,
  normalize: NormalizeProps<T>,
): SwitchApi<T>
```

The reducer is `(state, event) => state` with no DOM access, no side effects
and no timers, which is what makes it worth testing exhaustively — state
transition bugs are where accessibility bugs actually live.

`connect` is pure too. It runs on every render and returns prop objects, so
there is no memoisation requirement pushed onto you.

Side effects — focus moves, scroll locking, listeners on `document` — are
separate, explicitly-invoked functions in `core/src/dom/`, each returning its
own teardown. Adapters call them from `useEffect` or `onMounted`.

Not every component needs them. `Field` has no reducer and no listeners;
`Button` and `Card` have no DOM module at all. A thin component that pretends
otherwise is harder to read, not more consistent.

## `normalizeProps` — the piece that makes one core serve two frameworks

Core emits a neutral bag:

```ts
{
  'data-part': 'control',
  role: 'switch',
  'aria-checked': true,
  onClick: handler,
  onKeyDown: handler,
}
```

Each adapter translates it. The differences are small and every failure mode is
silent — the attribute simply never reaches the DOM.

| Neutral | React | Vue |
|---|---|---|
| `class` | `className` | `class` |
| `for` | `htmlFor` | `for` |
| `onKeyDown` | unchanged | `onKeydown` |
| `onClick` | unchanged | `onClick` |

**The neutral event form is React's camelCase**, and the asymmetry is forced
rather than arbitrary. Deriving `KeyDown` from `keydown` needs a word list; no
rule produces that capital `D`. Going the other way is one `toLowerCase()`. So
core emits the form that converts mechanically, and Vue carries the conversion.

If you write an adapter of your own, this is the single most dangerous
function in it. The [SSR guide](/guides/ssr/) explains why lowercasing a
handler name too far produces a component that works on mount and is inert
after hydration.

## What the indirection costs

A single one-off component is more code this way than writing it directly in
one framework. The pattern pays off at the second framework and at every
component after the first, because the expensive part — the accessibility — is
written once instead of twice and cannot drift between them.

If you only ever ship React, a React-only library is a reasonable choice and
this one is not obviously better. If you ship both, or expect to, the
duplication you avoid is exactly the part you least want duplicated.

## Package layout

| Package | Depends on |
|---|---|
| `@caioalfonso/kanso-core` | nothing |
| `@caioalfonso/kanso-vue` | core; peer `vue` |
| `@caioalfonso/kanso-react` | core; peer `react` |
| `@caioalfonso/kanso-styles` | nothing — pure CSS |

`vue` and `react` are **peer** dependencies, never direct ones, so you never
end up with a second copy of the framework.

Each package ships per-component subpath exports as well as a barrel, so
importing `Switch` does not drag in Dialog's focus trap:

```ts
import { Switch } from '@caioalfonso/kanso-react/switch';
```

The rule that core imports no framework is checked mechanically in CI, and a
type-only `import type … from 'vue'` counts as a violation — it signals the
design has leaked even where the bytes do not.
