# @caioalfonso/kanso-styles

## 0.0.2

### Patch Changes

- e598043: Add Tabs — the first compound component, and the first with real keyboard work.

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

- dadcc52: Add Button: three variants, three sizes, and a `loading` state that stays
  focusable and keeps its accessible name.

  `loading` is not `disabled`. It sets `aria-busy`, leaves the button in the tab
  order, and blocks activation — including form submission — through a handler
  composed in core. The consumer's `onClick` is passed _into_ `connectButton`
  rather than left in the props spread, because every adapter applies core's props
  last and would otherwise replace it; a button whose handler silently never fires
  renders perfectly and passes an axe scan.

  The label is a part of its own so the spinner can fade it with `opacity`.
  `visibility: hidden` and `display: none` both remove an element from the
  accessibility tree, and would take the button's name with them.

  Every size keeps a 44px minimum. `sm` is narrower and lighter, not shorter.

  Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.

- 7890cd6: Field now shows **one** message below its control, never two stacked: while
  `invalid` with an `errorText`, the error replaces the description rather than
  pushing it down.

  `aria-describedby` follows the same resolver, so it names only the message that
  is actually rendered. Previously a field with both parts described itself with
  `"…-description …-error"`; it is now `"…-error"` alone while invalid, and the
  description element is not in the document. Referencing an element that is no
  longer rendered would be a dangling idref — the defect class this component
  exists to prevent — so the render decision and the aria composition come from
  one function rather than two conditions that can drift.

  New in core: `fieldMessage(state)` → `'error-text' | 'description' | undefined`,
  and `fieldShowsDescription(state)`. `fieldShowsErrorText` is unchanged in
  behaviour and still exported; it is now derived from `fieldMessage`. A future
  third kind of message is inserted into that one ordered list.

  The error element still mounts whenever a message was supplied and stays empty
  until invalid — it is the live region, which is exactly why the description is
  the part that yields. Behaviour is identical in the server HTML, asserted in
  both SSR suites.

  The optional stylesheet gains one rule for the consequence of that: an empty
  live region is zero-height but still earns its share of the field's `gap`, so a
  valid field carried 8px of dead space under its message. Cancelled with a
  negative margin on `:empty`, not `display: none` — hiding it would take the
  region out of the accessibility tree and break the announcement it exists for.

  **Behaviour change for anyone relying on both being announced.** A description
  carrying the rule the error complains about ("8 characters or more") now
  disappears while the user is correcting it; put the constraint in the error
  message if your form needs it. Recorded in `docs/03` §5 decision 9.

  Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.

- e2e46b8: Add Menu: a menu button with the full APG keyboard map — arrows, `Home`/`End`,
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

- dadcc52: Add Card: a layout container with `header`, `body` and `footer`, an `as` prop,
  and the whole-card link pattern in the optional stylesheet.

  No state, no keyboard, no ARIA — but it does have a core module, which corrects
  `docs/03` §7. The instruction that line was protecting still holds (no state
  machine for a `<div>`); leaving the `data-part` attributes to two hand-written
  adapters is simply how they end up disagreeing, and nothing fails until a
  stylesheet meets one of them.

  The docs page teaches the pseudo-element whole-card link _and_ what it costs: a
  second interactive element inside the card becomes unreachable by pointer. Both
  halves are asserted in a real browser.

  Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.

- dadcc52: Add Field, Input and Textarea: the accessibility wiring around a form control,
  with `aria-describedby` **composed** rather than overwritten — including a
  consumer's own — in Vue 3 and React 19 from one core.

  The component's shape is decided by server rendering rather than by taste.
  `Field` takes its label, description and error as node props in React and as
  the `#label` / `#description` / `#error-text` slots in Vue, so presence is known
  during render. A compound child registering from its own mount hook would leave
  the control's `aria-describedby` out of the server HTML and add it once
  JavaScript arrived — a form that works without JavaScript would ship without its
  description association. Both SSR suites assert the attribute is in the HTML
  string itself.

  Also here:

  - the error element is rendered before it has a message, so its `aria-live`
    region is already in the document when the message arrives
  - `required` is the native attribute; no redundant `aria-required`
  - the stylesheet keys the invalid state off `data-invalid`, never `:invalid`,
    which matches every required empty control from page load
  - a development warning when a `Field` contains no control, since the label's
    `for` is emitted unconditionally

  `PropTypes` and `NormalizeProps` gain a `textarea` entry. A textarea is not an
  input: it has `rows`, no `type`, and its own props interface in React.

  Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.

- 1c3fdb6: Add Dialog: a modal or non-modal dialog with a real focus trap, a refcounted
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

- b2b14dc: Correct the stylesheet README's piecemeal import example.

  It listed `tokens` and one component sheet as if the pair were sufficient. It is
  not: `base.css` carries the `:focus-visible` ring, the reduced-motion opt-out
  and the clipping that keeps a form component's `hidden-input` mirror out of
  sight, and no component sheet `@import`s it. Following the old example gave you
  a control with no visible focus indicator and a stray checkbox on the page —
  which is a WCAG 2.4.7 failure produced by the install instructions themselves.

  No CSS changed; the barrel entry always pulled `base` in, which is why the docs
  site never showed the defect. README only, so the fix ships with the package it
  describes.

## 0.0.1

### Patch Changes

- 594e89d: First release: **Switch**, in Vue 3 and React 19, from one shared core.

  A binary on/off control built on a native `<button>`, so `Space` and `Enter`
  work without the library adding a keyboard handler. Supports controlled and
  uncontrolled use, `disabled`, `readOnly`, and form submission via `name` — which
  renders a visually-hidden checkbox that mirrors state, so the switch works
  inside a plain `<form>`.

  Also ships the optional stylesheet: a neutral OKLCH palette in light and dark,
  re-themeable entirely through CSS custom properties, with every colour pair
  measured against its WCAG requirement in CI.

  Components expose `data-part` / `data-state` attributes and no class names, so
  styling them yourself is straightforward and the library never fights your CSS.
