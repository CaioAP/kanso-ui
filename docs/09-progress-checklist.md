# 09 — Progress checklist

Living status doc. **Update it as items land** — it is the fastest way for a new
session to learn where things stand.

**Status: Phase 0 not started.** The repository contains planning documents only.
No code exists yet.

**Repo:** `/home/caio/Projects/kanso-ui` · **npm scope:** `@caioalfonso` (unconfirmed)
**Docs site:** not deployed · **GitHub:** not created

---

## Phase 0 — Foundations

### Workspace
- [ ] pnpm workspace, Node 24 + pnpm 10 pinned via `packageManager`
- [ ] `packages/core` skeleton
- [ ] `packages/vue` skeleton
- [ ] `packages/react` skeleton
- [ ] `packages/styles` skeleton
- [ ] `exports` maps, `peerDependencies`, `publishConfig.access: public`
- [ ] TypeScript strict, project references
- [ ] Biome config
- [ ] tsup config per package
- [ ] Vitest workspace, one project per package
- [ ] Testing Library (Vue + React) + `vitest-axe`
- [ ] changesets initialised

### CI/CD
- [ ] `ci.yml` — lint, typecheck, core-purity, test, build, package-lint, docs build
- [ ] `release.yml` — changesets publish
- [ ] Core-purity check verified to actually fail on a planted violation

### Foundational code
- [ ] `core/src/types.ts` — `PropTypes`, `NormalizeProps`, `Dict`
- [ ] `core/src/dom/attrs.ts` — `dataAttr`, `ariaAttr`
- [ ] `normalizeProps` (React) + unit tests
- [ ] `normalizeProps` (Vue) + unit tests

### Design tokens
- [ ] **Contrast-verify every token pair in `docs/02` §3 and correct the values**
- [ ] Record measured ratios below (replace this line when done):

  | Pair | Ratio | Required | Pass |
  |---|---|---|---|
  | _not yet measured_ | | | |

### Docs site
- [ ] Starlight scaffolded with `@astrojs/vue` **and** `@astrojs/react`
- [ ] Deployed to Cloudflare Pages (Pages flow, no adapter)

### Human tasks (block Phase 1 publish)
- [ ] `npm adduser`, 2FA on, **confirm the `@caioalfonso` scope is available**
- [ ] npm automation token → `NPM_TOKEN` GitHub secret
- [ ] GitHub repo created, pushed, `main` protected
- [ ] Cloudflare Pages project created (**Pages**, not Workers)

---

## Phase 1 — Switch (vertical slice) 🔑
- [ ] Core: types, anatomy, state, connect
- [ ] Core unit tests — every transition and guard
- [ ] Vue adapter
- [ ] React adapter
- [ ] Tests both frameworks: render, click, Space, Enter, controlled, uncontrolled,
      disabled, readOnly, axe
- [ ] SSR test both frameworks, no hydration warning
- [ ] `packages/styles/src/switch.css`
- [ ] Docs page (full template)
- [ ] `ComponentPreview`: framework toggle, knobs, Shiki source, copy
- [ ] `/embed/switch`
- [ ] Playwright + axe on the docs site
- [ ] Changeset → **published `0.0.1`**
- [ ] External install verified from a clean directory
- [ ] Portfolio: Sanity `project` document
- [ ] Portfolio: playground entry + iframe embed

---

## Phase 2 — Tabs
- [ ] `core/src/dom/roving-focus.ts` + tests
- [ ] Core + both adapters
- [ ] Full keyboard table tested, both orientations, both activation modes
- [ ] axe + SSR
- [ ] Styles · docs page · `/embed/tabs` · changeset
- [ ] `ComponentPreview` framework toggle rebuilt on real Tabs

---

## Phase 3 — Dialog
- [ ] `focus-trap.ts` · `scroll-lock.ts` · `dismissable.ts` + tests
- [ ] Core + both adapters (portal / teleport)
- [ ] Tests: Escape, outside click, initialFocus, finalFocus, axe open **and** closed, SSR
- [ ] **Playwright**: trap holds, focus restores, no body scroll, no layout shift, `inert`
- [ ] Styles · docs page · `/embed/dialog` · changeset
- [ ] Bumped to `0.1.0`

---

## Phase 4 — Menu
- [ ] `typeahead.ts` + tests
- [ ] Core + both adapters
- [ ] Full APG key map tested, incl. typeahead cycling and Tab-closes-and-moves-on
- [ ] Disabled items remain focusable
- [ ] CSS anchoring + collision fallback (no Floating UI)
- [ ] Styles · docs page · `/embed/menu` · changeset

---

## Phase 5 — Inputs · Button · Card
- [ ] `Field` + `Input` + `Textarea`
- [ ] `aria-describedby` composition tested: description only / error only / both / neither
- [ ] Button: variants, sizes, `loading` → `aria-busy` and still focusable, 44px target
- [ ] Card: layout + docs teaching the whole-card link pattern
- [ ] Styles · docs pages · embed routes · changesets

---

## Phase 5.1 — Docs polish
- [ ] Starlight themed to kanso tokens
- [ ] **Accessibility guide** written properly
- [ ] Theming guide + portfolio-retheme worked example
- [ ] SSR guide
- [ ] Architecture page
- [ ] Lighthouse ≥ 95 × 4, measured and recorded here
- [ ] Custom domain (optional)

---

## Phase 6 — 1.0.0
- [ ] API review — naming, prop parity, no leaked internals
- [ ] Bundle size per entry; tree-shaking verified
- [ ] `CONTRIBUTING.md`, issue/PR templates
- [ ] README polished for the npm landing page
- [ ] **`1.0.0` published**
- [ ] Portfolio project document updated with the real outcome line
- [ ] Blog post written

---

## Open questions / decisions pending
- [ ] npm scope `@caioalfonso` availability — unverified, confirm at `npm adduser`
- [ ] Docs site domain — `kanso-ui.pages.dev` by default, custom domain undecided
- [ ] Whether `ComponentPreview` reflects live knob state in the shown source, or
      shows a static example (decide when building it in Phase 1)
