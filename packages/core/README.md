# @caioalfonso/kanso-core

The framework-agnostic behaviour core of [kanso-ui](https://github.com/CaioAP/kanso-ui).
State, keyboard handling, ARIA and focus management, in plain TypeScript with
**zero dependencies**.

You usually do not install this directly — install
[`@caioalfonso/kanso-react`](https://www.npmjs.com/package/@caioalfonso/kanso-react)
or [`@caioalfonso/kanso-vue`](https://www.npmjs.com/package/@caioalfonso/kanso-vue),
which depend on it. Install it directly only if you are writing an adapter for
another framework.

## How it works

Each component exports a pure reducer and a `connect()` that turns state into
neutral prop bags. An adapter supplies `normalizeProps`, which translates those
bags into whatever its framework spells them:

```ts
import { connectSwitch, initialSwitchState, switchReducer } from '@caioalfonso/kanso-core';

const state = initialSwitchState({ id, checked: false, hasLabel: true });
const api = connectSwitch(state, send, normalizeProps);
// api.rootProps, api.controlProps, api.thumbProps, api.labelProps, api.hiddenInputProps
```

Two rules this package holds to, and CI enforces:

- **It never imports a framework** — not `vue`, not `react`, not even as a
  type-only import.
- **It never generates an id.** Ids come in as arguments, because a counter or a
  random value differs between the server render and the client render and shows
  up as a hydration mismatch.

## Documentation

<https://kansoui.caioalfonso.dev>

ESM only. MIT licensed.
