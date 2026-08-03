---
title: Accessibility
description: What this library guarantees, how each claim is verified, and what remains your responsibility.
---

"Accessible" is either verified or it is marketing. This page says which parts
of it this library verifies, how, and — the part most libraries leave out —
which parts it cannot verify for you.

## What is guaranteed

For every interactive component:

- **The APG pattern is implemented as written.** Roles, states and properties
  follow the WAI-ARIA Authoring Practices pattern the component is named after,
  and each component page links its APG source.
- **The full keyboard map works, in both frameworks.** Every row of every
  component's keyboard table has its own assertion. Not a sample — every row.
- **Focus is managed deliberately.** Dialog traps focus while modal and
  restores it to the trigger on close. Menu does not trap, because `Tab` is
  meant to close it and let focus move on. Tabs and Menu use a roving tabindex,
  so a composite is one tab stop.
- **Ids are wired, never dangling.** An `aria-labelledby`, `aria-controls` or
  `aria-describedby` is emitted only when the element it names is actually
  rendered. A reference pointing at nothing is worse than no reference: screen
  readers announce nothing at all rather than falling back.
- **State is never colour-only.** Checked, selected, invalid and disabled each
  carry a second, non-colour cue.
- **Targets are at least 44 × 44px** (WCAG 2.2 SC 2.5.8), using padding or a
  pseudo-element where the visual is smaller.
- **Motion is guarded.** Everything animated is disabled under
  `prefers-reduced-motion: reduce`.
- **The shipped palette is measured.** Every colour pair in
  `@caioalfonso/kanso-styles` is verified against its WCAG requirement in both
  themes, by a script that runs in CI.

## How each claim is verified

Four layers, each catching what the layer below cannot.

| Layer | Tool | Catches |
|---|---|---|
| Core unit | Vitest | Wrong state transitions |
| Adapter | Vitest + Testing Library | Wrong ARIA, wrong keyboard |
| Static a11y | axe | Structural violations |
| Real browser | Playwright + axe | Focus, traps, scroll lock, contrast |

### axe is the floor, not the ceiling

**Automated scanning cannot detect a broken keyboard interaction.** A menu
whose `ArrowDown` handler is missing, a dialog whose focus trap leaks, a tablist
whose roving tabindex is inverted — every one of those passes axe with zero
violations. axe verifies *structure*. It cannot verify *behaviour*.

That is why the keyboard assertions are the actual work here, and why the
browser layer exists at all. jsdom implements neither `inert` nor a trustworthy
focus model, so the unit suites assert the *mechanism* and Playwright asserts
that focus genuinely cannot escape.

### The tests are mirrored across frameworks

A behaviour tested in Vue and not in React is a bug waiting to be found by a
user. The adapter suites are written assertion for assertion in both, so a
behaviour present in one adapter and missing in the other fails.

### Each gate was verified by breaking it

A test that has never failed has never been shown to work. Every phase of this
library's build planted a deliberate one-line defect and confirmed the suite
caught it — a focus trap scoped to the wrong boundary, a `preventDefault()` on
the `Tab` that turns a menu into a trap, an `aria-describedby` that drops the
consumer's own ids, a random value in the id derivation.

Some of those plants left every unit test green and failed only in the browser.
That result is the argument for the fourth layer.

## What is still your responsibility

This is the honest half of the page.

### Accessible names

The library wires the association; it cannot invent the text. A `Switch` with
no `label` and no `aria-label` is an unnamed control, and nothing here will
stop you shipping one.

Name your controls, and name them with the words a user would say out loud —
not "toggle 3".

### Contrast, if you retheme

Every colour pair is measured *for the palette the library ships*. Override a
token and you are outside that measurement. The [theming
guide](/guides/theming/) lists the pairs to re-check.

Two tokens carry rules rather than shades: `--kanso-line-strong` must stay at
3:1 or better against every surface it sits on, because a border that is the
only indicator of a state falls under SC 1.4.11; and `--kanso-fg-faint` is a
large-text token at roughly 4:1 — never set body copy in it.

### Content order and structure

Focus order follows DOM order. The library does not reorder anything, so a
visual layout that disagrees with the DOM produces a focus order that surprises
people. Headings, landmarks and the reading order of your page are yours.

### Which component you chose

A switch takes effect immediately; a checkbox is collected and applied on
submit. A menu is a list of actions, not a form control. Picking the wrong
pattern produces a component that is perfectly accessible and still wrong.
Each component page opens with when *not* to use it.

### Error messages that say something

`Field` renders the error region before it has a message — a live region has to
be in the document before it can announce a change to it — and associates it
correctly. Whether "Invalid input" tells anyone what to do is on you.

### Testing your own composition

The guarantees are per component. A dialog inside a dialog, a menu inside a
dialog and a field inside a form are all tested here; your particular
arrangement of them is not. If accessibility matters to your product — and if
you are reading this, it does — test the composition, and test it with a
keyboard first.

## What is deliberately not claimed

- **No conformance certificate.** This library implements the APG patterns and
  measures what can be measured. That is not the same as an audited WCAG
  conformance statement for your application.
- **No screen reader test matrix in v1.** The suites assert the ARIA the
  patterns specify; they do not assert what any particular screen reader and
  browser pair announces. Those combinations differ, and pretending otherwise
  would be the kind of blanket claim this page exists to avoid.
- **No visual regression testing yet.** Real value, real maintenance cost;
  revisited once the API is stable.

## Reporting an accessibility bug

An accessibility defect in this library is a defect in its central claim, and
it is treated that way. If you find one — a key that does nothing, focus that
escapes, an announcement that never comes — open an issue with the component,
the framework, the assistive technology if one was involved, and what you
expected to happen.
