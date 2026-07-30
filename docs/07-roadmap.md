# 07 — Roadmap

## How to use this document

**Start here in every new session.** Check `docs/09-progress-checklist.md` for what
is done, find the current phase below, and work its tasks in order.

Phases are sequential. Each has a **definition of done** that must be fully met
before the next begins — that discipline is what prevents the failure mode this
architecture is prone to.

## The stall risk, stated plainly

A shared-core multi-framework library is the most ambitious of the options
considered, and it was chosen deliberately with an open-ended timeline. Its
characteristic failure is **stalling at 60%**: lots of clever infrastructure, no
finished components, nothing publishable.

The roadmap is built to prevent exactly that:

- **Phase 1 ships one trivial component through every single layer** — core,
  both adapters, tests, styles, docs, npm, deploy, portfolio link. After Phase 1
  the entire pipeline is proven and every later component is a repeat of a known
  path.
- **Breadth only after depth.** No second component until the first is fully done.
- **Publish early.** `0.0.1` on npm in Phase 1. A published package is a completed
  thing; an unpublished monorepo is a hobby.

If forced to cut scope: Phases 0–3 (Switch, Tabs, Dialog, published, documented,
deployed, linked) is a **complete, credible project**. Menu, Inputs, Button and Card
are additive. Cut from the end, never leave the middle unfinished.

---

## Phase 0 — Foundations ✅

Rails only. Nothing user-visible.

- [x] `pnpm init`, `pnpm-workspace.yaml`, pin Node 24 + pnpm 10 via `packageManager`
- [x] Four package skeletons: `core`, `vue`, `react`, `styles` — correct
      `package.json`, `exports`, `peerDependencies`, `publishConfig.access: public`
- [x] Root `tsconfig`, strict — one flat program with `paths`, **not** project
      references (`docs/05` §2 explains why)
- [x] `biome.json` (mirror the portfolio repo's settings)
- [x] tsup config per package; `styles` copies CSS instead
- [x] `vitest.config.ts` with `test.projects`, one project per package —
      `vitest.workspace.ts` is deprecated in Vitest 3.2
- [x] Testing Library + `vitest-axe` wired for both frameworks
- [x] changesets initialised, `fixed` so all four packages version in lockstep
- [x] `.github/workflows/ci.yml` — lint, typecheck, core-purity, contrast, test,
      build, package-lint, docs build
- [x] `.github/workflows/release.yml` — changesets publish
- [x] `LICENSE` (MIT), `README.md`, `.gitignore`, `.nvmrc`
- [x] Starlight site scaffolded in `docs/`, both Vue and React integrations
      registered, both islands verified to build on one page
- [x] Docs site deployed to Cloudflare Pages — https://kanso-ui.pages.dev
- [x] **Verify the token contrast ratios in `docs/02` §3** and correct the values.
      Measured numbers recorded in `docs/09`; `pnpm contrast` is now a CI gate.
- [x] `core/src/types.ts` — `PropTypes`, `NormalizeProps`, `Dict`
- [x] `core/src/dom/attrs.ts` — `dataAttr`, `ariaAttr`
- [x] `normalizeProps` in both adapters, **with unit tests**

**Human tasks (block Phase 1's publish step):**
- [x] `npm adduser` → the `@caioalfonso` scope is free, all four names unpublished
- [ ] Replace `NPM_TOKEN` — the current one prompts for a one-time password,
      which no CI job can answer. npm retired the "automation" type; use a
      granular access token with **Bypass 2FA** checked (`docs/05` §9)
- [ ] Set the `RELEASE_ENABLED` repository variable, but **only** when Phase 1 is
      ready to publish `0.0.1` (`docs/05` §8 explains the guard)
- [x] Create the GitHub repo, push — `github.com/CaioAP/kanso-ui`
- [x] Set `main` protected, requiring the `verify` check
- [x] Create the Cloudflare Pages project (Pages flow — **not** Workers)

**Done when:** CI is green on an empty repo, the docs site is deployed, and
`pnpm build` produces valid (if empty) packages.

**Status:** every gate passes locally (`lint`, `typecheck`, `core-purity`,
`contrast`, `test`, `build`, `package-lint`, docs build) and
`pnpm install --frozen-lockfile` succeeds, which is what CI runs first.

**Met.** CI ran green on PR #1 and on the merge to `main`, and the docs site is
deployed and serving both framework islands.

Pushing also caught a bug no local gate could have: `release.yml` tried to
publish `0.0.0` to npm on an ordinary merge, and was stopped only by a 2FA
prompt. The job is now gated behind `RELEASE_ENABLED`. See `docs/05` §8 — this is
the concrete argument for why "the pipeline works on my machine" is not the
definition of done.

No changeset yet — the packages are unpublished at `0.0.0`, so the first
changeset belongs to Phase 1's `0.0.1` publish.

---

## Phase 1 — Switch: the vertical slice 🔑

**The most important phase.** Not about Switch — about proving every layer connects.
Resist adding a second component here, however easy it looks.

- [x] `core/src/switch/` — types, anatomy, state, connect (`docs/01` §8 has the code)
- [x] Core unit tests: every transition, every guard
- [x] Vue adapter + React adapter
- [x] Adapter tests both frameworks: render, click, `Space`, `Enter`, controlled,
      uncontrolled, disabled, readOnly, axe
- [x] **SSR test both frameworks**, asserting no hydration warning — locks the id trap
- [x] `packages/styles/src/switch.css`, `data-part`/`data-state` selectors only
- [x] Docs page using the full template (`docs/06` §5)
- [x] `ComponentPreview` built: framework toggle, knobs, Shiki source, copy
- [x] `/embed/switch` route
- [x] Playwright + axe on the docs site
- [ ] Changeset → **publish `0.0.1` to npm**
- [ ] Verify from outside: fresh dir, `npm i @caioalfonso/kanso-react`, import,
      render. This catches `exports` bugs the monorepo hides.
- [ ] Portfolio: create the Sanity `project` document (`docs/08`)
- [ ] Portfolio: playground entry iframing `/embed/switch`

**Done when:** a stranger can install it, use it, and read docs for it — and it is
linked from the portfolio. Every later component is now mechanical.

---

## Phase 2 — Tabs

First component with real keyboard work. Introduces roving tabindex.

- [ ] `core/src/dom/roving-focus.ts` + its own unit tests
- [ ] Core: types, anatomy, state, connect; horizontal + vertical; loop; automatic
      and manual activation
- [ ] Both adapters
- [ ] Tests: every key in the `docs/03` table, both orientations, both activation
      modes, axe, SSR
- [ ] Styles, docs page, `/embed/tabs`, changeset
- [ ] Dogfood: rebuild `ComponentPreview`'s framework toggle on real Tabs

**Done when:** the full keyboard table passes in both frameworks, and the docs page
explains the `activationMode` tradeoff.

---

## Phase 3 — Dialog

First hard one. Most of the work is DOM utilities that Menu will reuse.

- [ ] `core/src/dom/focus-trap.ts`, `scroll-lock.ts`, `dismissable.ts`, each tested
- [ ] Core: open/close state, focus lifecycle, `modal` vs non-modal
- [ ] Both adapters, including portal/teleport rendering
- [ ] Tests: `Escape`, outside click, controlled/uncontrolled, `initialFocus`,
      `finalFocus`, axe open **and** closed, SSR
- [ ] **Playwright**: trap holds under repeated `Tab`, focus restores on close,
      body does not scroll, no layout shift, `inert` works
- [ ] Styles, docs page, `/embed/dialog`, changeset
- [ ] Bump to `0.1.0` — three components, API taking shape

**Done when:** focus behaviour is verified in a real browser, not just jsdom.

---

## Phase 4 — Menu

Hardest, and cheapest now: every utility it needs exists.

- [ ] `core/src/dom/typeahead.ts` + tests
- [ ] Core: composes focus-trap, dismissable, roving-focus, typeahead
- [ ] Both adapters
- [ ] Tests: the entire key table including typeahead cycling and `Tab`-closes-and-
      moves-on; disabled items stay focusable; axe; SSR
- [ ] Simple CSS anchoring with a viewport-collision fallback — **no Floating UI**
- [ ] Styles, docs page, `/embed/menu`, changeset

**Done when:** the full APG menu-button key map passes in both frameworks.

---

## Phase 5 — Inputs, Button, Card

Three at once because Button and Card are nearly free.

- [ ] **Inputs:** `Field` + `Input` + `Textarea`; correct **composed**
      `aria-describedby`; `aria-invalid`; `aria-live` error text
- [ ] Tests specifically for describedby composition: description only, error only,
      both, neither
- [ ] **Button:** variants, sizes, `loading` → `aria-busy` while staying focusable,
      44px hit area
- [ ] **Card:** layout only; docs must teach the pseudo-element whole-card link
      pattern and warn against nested interactives
- [ ] Styles, docs pages, embed routes, changesets

**Done when:** all seven components are done by the `docs/00` §8 definition.

---

## Phase 5.1 — Docs polish

Runs alongside Phase 5.

- [ ] Starlight themed to the kanso tokens (`docs/06` §9)
- [ ] Write the **Accessibility guide** properly — the highest-value page
- [ ] Theming guide with the portfolio-retheme worked example
- [ ] SSR guide
- [ ] Architecture page with the `docs/01` diagram
- [ ] Lighthouse ≥ 95 on all four categories, measured and recorded
- [ ] Custom domain if wanted

---

## Phase 6 — 1.0.0

- [ ] API review: naming consistency, prop parity across components, no leaked
      internals in the public types
- [ ] Bundle-size check per component entry; verify tree-shaking actually works
- [ ] `CONTRIBUTING.md`, issue/PR templates
- [ ] README polish — the npm landing page
- [ ] **`1.0.0`** — the semver promise
- [ ] Portfolio: update the project document with the real outcome line
- [ ] Blog post: *"One accessible core, two frameworks"* — the architecture story

---

## Deliberately deferred (v2+)

Write these down so they stop competing for attention now:

- More components — Checkbox, Radio, Select, Combobox, Tooltip, Accordion
- More adapters — Svelte, Solid (the architecture allows it; that is the point)
- `asChild` / polymorphic rendering
- Floating UI positioning
- Visual regression testing
- Animation presets
- Figma kit
