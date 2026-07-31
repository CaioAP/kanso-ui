---
'@caioalfonso/kanso-core': patch
'@caioalfonso/kanso-react': patch
'@caioalfonso/kanso-vue': patch
'@caioalfonso/kanso-styles': patch
---

Add Menu: a menu button with the full APG keyboard map — arrows, `Home`/`End`,
type-to-select, and a `Tab` that closes the menu and lets focus move on — in
Vue 3 and React 19 from one core.

New in core, and the last utility the v1 component list needs:

- `dom/typeahead.ts` — a pure matcher plus a per-instance buffer with its own
  teardown, split the way `roving-focus.ts` is

Two corrections to the specs, both made before the code was written: Menu does
**not** use `focus-trap` (a trap swallows the `Tab` that is meant to close it),
and its trigger carries no `aria-controls` (the content is unmounted while
closed). `docs/01`, `docs/03` and `docs/07` all said otherwise.

Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.
