# 00 — Project spec

## 1. What this is

**kanso-ui** is a headless, accessible component library for Vue 3 and React 19,
built on a single framework-agnostic behaviour core.

*Kanso* (簡素) — simplicity through the elimination of clutter. Not emptiness;
restraint in service of function. The library expresses this three ways:

1. **Architecturally** — behaviour is written once, not twice. No duplication.
2. **In API surface** — few props, no configuration sprawl, no options objects
   with twenty keys. If a prop can be derived, derive it.
3. **Visually** — the optional stylesheet is spare: minimal ornament, no shadows
   for decoration's sake, radius near zero, one accent colour.

## 2. Why it exists

It is a portfolio artifact for a frontend engineer whose stated position is
accessibility, performance, and design-systems craft. A component library is the
single most efficient proof of all three at once, because:

- Accessibility is verifiable — WAI-ARIA APG conformance is objective, not a claim.
- The core/adapter split proves architectural thinking beyond feature work.
- Shipping Vue *and* React from one core proves range in a way two separate demos
  cannot.

But it must be **real**, not a demo. It publishes to npm, it has honest docs, it
versions properly. A library nobody could actually install proves nothing.

## 3. Goals

- **G1** — Every component conforms to its WAI-ARIA Authoring Practices pattern:
  correct roles, states, properties, and full keyboard support.
- **G2** — One behaviour implementation shared by both frameworks. Zero logic
  duplication between the Vue and React adapters.
- **G3** — Installable and documented: `npm i` works, docs teach install/usage/
  theming/API, every component has a live example in both frameworks.
- **G4** — Deployed docs site that is itself a piece of design work.
- **G5** — Tested to a floor that would embarrass a careless contributor: unit
  tests on core, interaction + keyboard tests on adapters, axe everywhere,
  real-browser tests for focus behaviour.

## 4. Non-goals

Explicitly out of scope. Saying no here is what keeps the project shippable.

- **Not a full design system.** Seven components, done properly. No 40-component
  sprawl, no data grid, no date picker.
- **Not framework-exhaustive.** Vue and React only. No Svelte/Solid/Angular
  adapters, however cleanly the architecture would allow them. (Mention that it
  *would* allow them — that is the architectural point — but do not build them.)
- **No animation library.** Components expose state via `data-state`; consumers
  animate. Any built-in transition respects `prefers-reduced-motion`.
- **No form-library integration.** Inputs expose native-compatible props and get
  out of the way.
- **No i18n layer.** User-facing strings are consumer-supplied props. Core ships
  no copy except ARIA-required defaults, which are overridable.
- **No IE / legacy browser support.** Modern evergreen browsers.
- **No in-browser code REPL** in the docs.

## 5. Audience

1. **Primary — a hiring engineer or peer** evaluating the author's work. Reads the
   docs site and the source. Cares about the architecture and whether the a11y is
   real or decorative.
2. **Secondary — a developer who actually wants headless Vue components.** The Vue
   headless ecosystem is genuinely thinner than React's, which is a real gap this
   fills. Cares that install works and docs are honest.

Designing for (2) is what makes it credible to (1).

## 6. Success criteria

The project is a success when all of these are true:

- [ ] Four packages published to npm under `@caioalfonso/*`, at ≥ `1.0.0`.
- [ ] Seven components, each with core + Vue + React + tests + docs page.
- [ ] Docs site deployed, Lighthouse ≥ 95 on all four categories.
- [ ] Zero axe violations on every docs page and every component test.
- [ ] Keyboard interaction tests for every interactive component, asserting the
      full APG key map — not just "it renders".
- [ ] SSR-safe: server-render tests pass in both frameworks, no hydration warnings.
- [ ] `packages/core` has zero framework dependencies, enforced in CI.
- [ ] Linked from the portfolio as a `project` document, with a live embedded demo.

## 7. Quality floor (non-negotiable)

Mirrors the sibling portfolio repo's standards deliberately — same author, same bar.

- **TypeScript strict**, no `any` in public API surface, no `@ts-expect-error`
  without an adjacent comment explaining the invariant.
- **Biome clean** across the whole repo.
- **WCAG 2.2 AA** for the stylesheet and the docs site. Contrast measured, not assumed.
- **Every gate green in CI** before merge: typecheck → lint → test → a11y → build →
  package-lint (`publint`, `arethetypeswrong`) → docs build → Playwright.
- **Bundle discipline** — core stays small and tree-shakeable. Importing `Switch`
  must not pull in `Dialog`'s focus-trap code. Per-component entry points, `sideEffects: false`.
- **Semver honesty.** Breaking change ⇒ major. Pre-`1.0.0` while the API settles.

## 8. Definition of "component done"

A component is done when **all** of the following exist. Partial credit is not a
thing; an 80%-done component is a liability because it looks finished.

1. Core: types, state reducer, `connect`, any DOM utilities.
2. Vue adapter, React adapter — rendering and reactivity only.
3. Core unit tests (reducer transitions).
4. Adapter tests in both frameworks: render, interaction, **full keyboard map**, axe.
5. SSR render test in both frameworks.
6. Optional stylesheet part, using `data-part` / `data-state` selectors only.
7. Docs page: anatomy, props table, keyboard table, a11y notes, live Vue + React
   examples, prop knobs, copyable source.
8. `/embed/<component>` route for portfolio embedding.
9. A changeset.
10. `docs/09-progress-checklist.md` updated.
