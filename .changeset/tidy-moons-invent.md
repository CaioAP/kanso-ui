---
'@caioalfonso/kanso-core': minor
'@caioalfonso/kanso-react': minor
'@caioalfonso/kanso-vue': minor
'@caioalfonso/kanso-styles': minor
---

Add Dialog: a modal or non-modal dialog with a real focus trap, a refcounted
scroll lock and stack-aware dismissal, in Vue 3 and React 19 from one core.

`minor` rather than `patch`, unlike Phase 2: `docs/07` reserves `0.1.0` for the
point at which three components make the number mean something, and this is it.

Also new in core, and reused by Phase 4's Menu:

- `dom/focusable.ts` — `getFocusableElements`, `getFocusableEdges`
- `dom/focus-trap.ts` — `inert` on the background plus a `Tab` cycle
- `dom/scroll-lock.ts` — scrollbar-compensated, refcounted, restores what it found
- `dom/dismissable.ts` — `Escape` and outside-press, with a layer stack so only
  the topmost layer acts

One fix outside Dialog: `ComponentPreview` titled every example source
`Switch.vue` / `Switch.tsx` regardless of the component, so the Tabs page
announced its example as Switch's.
