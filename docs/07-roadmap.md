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
- [x] Verify from outside: fresh dir, install, import, render. Done against real
      `pnpm pack` tarballs rather than the registry, which catches the same
      `exports` and `dependencies` bugs without needing a publish first. Repeat
      against the registry once `0.0.1` is out.
- [ ] Portfolio: create the Sanity `project` document (`docs/08`)
- [ ] Portfolio: playground entry iframing `/embed/switch`

**Done when:** a stranger can install it, use it, and read docs for it — and it is
linked from the portfolio. Every later component is now mechanical.

---

## Phase 2 — Tabs

First component with real keyboard work. Introduces roving tabindex.

- [x] `core/src/dom/roving-focus.ts` + its own unit tests
- [x] Core: types, anatomy, state, connect; horizontal + vertical; loop; automatic
      and manual activation
- [x] Both adapters
- [x] Tests: every key in the `docs/03` table, both orientations, both activation
      modes, axe, SSR
- [x] Styles, docs page, `/embed/tabs`, changeset
- [x] Dogfood: rebuild `ComponentPreview`'s framework toggle on the library's own
      roving focus — from **core**, not from an adapter. See `docs/09`.

**Done when:** the full keyboard table passes in both frameworks, and the docs page
explains the `activationMode` tradeoff.

**Status:** both met. The six design questions `docs/03` §2 left open were settled
in writing before any code, per §12 step 1; the answers and their costs are
recorded there and summarised in `docs/09`. Tabs is also the first component whose
own docs page contains a second tablist, which is what exposed the
`ComponentPreview` defect listed in `docs/09`.

---

## Phase 3 — Dialog ✅

First hard one. Most of the work is DOM utilities that Menu will reuse.

- [x] `core/src/dom/focus-trap.ts`, `scroll-lock.ts`, `dismissable.ts`, each
      tested — plus `focusable.ts`, which `docs/01` §6 names and this list did not
- [x] Core: open/close state, focus lifecycle, `modal` vs non-modal
- [x] Both adapters, including portal/teleport rendering
- [x] Tests: `Escape`, outside click, controlled/uncontrolled, `initialFocus`,
      `finalFocus`, axe open **and** closed, SSR
- [x] **Playwright**: trap holds under repeated `Tab`, focus restores on close,
      body does not scroll, no layout shift, `inert` works
- [x] Styles, docs page, `/embed/dialog`, changeset
- [x] ~~Bump to `0.1.0` — three components, API taking shape.~~ **Superseded.**
      The changeset was written as a `minor` and then changed to a `patch`:
      `0.1.0` is now a decision the maintainer makes deliberately, not one a
      phase boundary makes for them. The `0.0.x` line continues until they say
      otherwise. Nothing else about this phase changes.

**Done when:** focus behaviour is verified in a real browser, not just jsdom.

**Status:** met. 508 unit tests and 79 browser tests are green, and the split
between them is the point of this phase rather than an accident: jsdom
implements neither `inert` nor a trustworthy focus model, so the vitest suites
assert the *mechanism* and Playwright asserts that focus cannot actually escape.

Verified by planting the defect, as in Phases 1 and 2. Scoping the trap's
boundary to the dialog itself — a plausible-looking one-word change — leaves
every unit test green and fails the browser suite in both frameworks. The same
exercise showed that the first `inert` assertion passed for the wrong reason
(the centred dialog was simply covering the element it probed), so it now asks
the browser to focus the background element and checks whether that took.

Three defects found, all recorded in `docs/09`. The most interesting is
browser-only: dismissing with the mouse restored focus to the trigger and the
browser's own default action then moved it to `<body>`, so focus restoration
worked by keyboard and silently failed by mouse.

---

## Phase 4 — Menu ✅

Hardest, and cheapest now: every utility it needs exists.

- [x] `core/src/dom/typeahead.ts` + tests
- [x] Core: composes dismissable, roving-focus, typeahead — **not** focus-trap,
      which would swallow the `Tab` that is meant to close the menu
- [x] Both adapters
- [x] Tests: the entire key table including typeahead cycling and `Tab`-closes-and-
      moves-on; disabled items stay focusable; axe; SSR
- [x] Simple CSS anchoring with a viewport-collision fallback — **no Floating UI**
- [x] Styles, docs page, `/embed/menu`, changeset

**Done when:** the full APG menu-button key map passes in both frameworks.

**Status:** met. 682 unit tests and 114 browser tests are green.

This phase spent its first hour correcting the specs rather than writing code.
Three documents — `docs/01` §6, `docs/03` §4 and this one — listed `focus-trap`
among Menu's ingredients, which cannot be true: the same table says `Tab` closes
the menu and lets focus **move on**, and a trap exists to stop exactly that. The
keyboard behaviour won. `docs/03` §4 decision 1 records it, and §3 decision 12
was corrected too, since it claimed Menu-inside-Dialog depended on the trap
stack when it depends on the dismissable one.

Verified by planting the defect: adding `preventDefault()` to the `Tab` branch —
the one-line change that turns this into a trap — fails both the adapter suites
and the browser suite in both frameworks.

---

## Phase 5 — Inputs, Button, Card ✅

Three at once because Button and Card are nearly free.

- [x] **Inputs:** `Field` + `Input` + `Textarea`; correct **composed**
      `aria-describedby`; `aria-invalid`; `aria-live` error text
- [x] Tests specifically for describedby composition: description only, error only,
      both, neither — plus a fifth the list did not name, the consumer's own
      `aria-describedby`, which every adapter would otherwise drop in silence
- [x] **Button:** variants, sizes, `loading` → `aria-busy` while staying focusable,
      44px hit area
- [x] **Card:** layout only; docs teach the pseudo-element whole-card link
      pattern, warn against nested interactives, and state what the pattern
      costs
- [x] Styles, docs pages, embed routes, changesets

**Done when:** all seven components are done by the `docs/00` §8 definition.

**Status:** met, for all seven. 886 unit tests and 171 browser tests are green.

The interesting work was Field, and it was decided by a constraint rather than
by taste. A `Field.Description` registering with its root from a mount hook —
the shape Dialog uses — cannot work here, because a field is *always* rendered:
the server would send a control with no `aria-describedby` and the association
would appear only when JavaScript did. So presence is a prop (React) or a slot
(Vue), known during render, and `Field` renders those parts itself. Both SSR
suites assert the attribute is in the HTML string, not merely present after
hydration. `docs/03` §5 decision 1.

Verified by planting the defect, as in every phase since Phase 1. Two plants,
both one line: dropping the consumer's ids from the `aria-describedby`
composition, and dropping the consumer's handler from Button's composed
`onClick`. Each failed in core *and* in both adapter suites.

The specs were corrected twice more before any code was written — `docs/03` §5
said `aria-required` where the native attribute is right, and §7 said Card has
"no core module" where it has a twenty-line `connect`. Both corrections are
recorded where they apply.

---

## Phase 5.1 — Docs polish ✅

Runs alongside Phase 5.

- [x] Starlight themed to the kanso tokens (`docs/06` §9)
- [x] Write the **Accessibility guide** properly — the highest-value page
- [x] Theming guide with the portfolio-retheme worked example
- [x] SSR guide
- [x] Architecture page with the `docs/01` diagram
- [x] Lighthouse ≥ 95 on all four categories, measured and recorded — **100 on
      all four, on all six pages measured**
- [ ] Custom domain if wanted — still undecided, and deliberately not blocking

**Done when:** the site teaches without the reader opening the source, and holds
the same a11y and performance bar as the library.

**Status:** met. 192 browser tests are green (was 171) and every gate passes.

Two things this phase found are worth carrying forward, because neither was on
the checklist and both were live on the deployed site:

1. **The introduction page still announced Phase 0** — "the packages are
   scaffolded but export no components yet" — with all seven components built.
   The replacement says what is true *and* what is still not: nothing is on npm.
   The failure mode to avoid was overcorrecting into "install it now".
2. **Every code block on the site was unreachable by keyboard below ~700px.**
   Expressive Code renders `<pre>` with `overflow-x: auto` and no `tabindex`, so
   a block that overflows is a scrollable region with no keyboard access — axe
   reports `scrollable-region-focusable`, serious. This repo had already found
   it three times and fixed it three times by shortening the example, which
   works at 1280px and cannot work at 360px. Fixed structurally instead. See
   `docs/09` for the two-plugins-for-one-attribute detail.

The IA in `docs/06` §4 names seven pages this phase's checklist does not:
Installation, Quick start, Styling, and the three Reference pages. They are not
built. That is a gap between two documents rather than an unfinished task —
decide in Phase 6 whether they belong in 1.0.0.

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
