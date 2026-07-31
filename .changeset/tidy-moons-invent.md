---
'@caioalfonso/kanso-core': patch
'@caioalfonso/kanso-react': patch
'@caioalfonso/kanso-vue': patch
'@caioalfonso/kanso-styles': patch
---

Add Dialog: a modal or non-modal dialog with a real focus trap, a refcounted
scroll lock and stack-aware dismissal, in Vue 3 and React 19 from one core.

`patch`, not the `minor` `docs/07` originally planned. `0.1.0` is now an
explicit decision the maintainer makes rather than one a phase boundary makes
for them, so the `0.0.x` line continues until then.

Also new in core, and reused by Phase 4's Menu:

- `dom/focusable.ts` — `getFocusableElements`, `getFocusableEdges`
- `dom/focus-trap.ts` — `inert` on the background plus a `Tab` cycle
- `dom/scroll-lock.ts` — scrollbar-compensated, refcounted, restores what it found
- `dom/dismissable.ts` — `Escape` and outside-press, with a layer stack so only
  the topmost layer acts

One fix outside Dialog: `ComponentPreview` titled every example source
`Switch.vue` / `Switch.tsx` regardless of the component, so the Tabs page
announced its example as Switch's.
