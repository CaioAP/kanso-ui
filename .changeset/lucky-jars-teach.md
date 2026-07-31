---
'@caioalfonso/kanso-core': patch
'@caioalfonso/kanso-react': patch
'@caioalfonso/kanso-vue': patch
'@caioalfonso/kanso-styles': patch
---

Add Tabs — the first compound component, and the first with real keyboard work.

`Tabs.Root` / `Tabs.List` / `Tabs.Trigger` / `Tabs.Content` in both adapters,
over one core: roving tabindex, both orientations, both activation modes,
optional looping, and the full APG key map. Panels are always mounted and
`hidden` when unselected, so the `aria-controls` / `aria-labelledby` pair always
resolves — an unresolvable `aria-controls` is something axe reports as
incomplete rather than as a violation.

Core also gains `dom/roving-focus`, which Menu will reuse: pure index arithmetic
plus a DOM read, deliberately with no tabindex bookkeeping of its own, since
`connect()` already emits `tabIndex` from state.

A patch rather than a minor: `0.1.0` is reserved for the third component, where
the API surface is settled enough to mean something (`docs/07`, Phase 3).
