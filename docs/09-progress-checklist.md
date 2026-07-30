# 09 — Progress checklist

Living status doc. **Update it as items land** — it is the fastest way for a new
session to learn where things stand.

**Status: Phase 0 done.** CI is green on `main`, the docs site is deployed, and
`pnpm build` produces valid packages. No components exist yet — that is Phase 1,
which starts with Switch and must not start with a second component.

One thing does **not** work yet and blocks Phase 1's publish step: the
`NPM_TOKEN` is unusable in CI. Details under "Human tasks" below.

**Repo:** `/home/caio/Projects/kanso-ui` · **npm scope:** `@caioalfonso` (confirmed free)
**Docs site:** https://kanso-ui.pages.dev · **GitHub:** `github.com/CaioAP/kanso-ui`

**Toolchain as installed:** Node 24.14.0 · pnpm 10.30.3 · TypeScript 5.9.3 ·
Vitest 3.2.7 · Biome 2.5.6 · tsup 8.5.1 · Astro 7.1.5 · Starlight 0.41.5

---

## Phase 0 — Foundations

### Workspace
- [x] pnpm workspace, Node 24 + pnpm 10 pinned via `packageManager`
- [x] `packages/core` skeleton
- [x] `packages/vue` skeleton
- [x] `packages/react` skeleton
- [x] `packages/styles` skeleton
- [x] `exports` maps, `peerDependencies`, `publishConfig.access: public`
- [x] TypeScript strict — one flat program with `paths`, not project references
      (rationale in `docs/05` §2)
- [x] Biome config
- [x] tsup config per package (`styles` copies CSS instead — no bundler)
- [x] Vitest `test.projects`, one project per package
- [x] Testing Library (Vue + React) + `vitest-axe`
- [x] changesets initialised, `fixed` for lockstep versioning

### CI/CD
- [x] `ci.yml` written — lint, typecheck, core-purity, contrast, test, build,
      core-purity again over `dist`, package-lint, docs build
- [x] `release.yml` written — changesets publish, gated on a `RELEASE_ENABLED`
      repository variable until Phase 1
- [x] **CI observed green on a real run** — PR #1 (45s) and the merge to `main`
      (42s). Every step executed.
- [x] `release.yml` observed running. It **failed, and finding out why was the
      point.** The changesets action attempted to publish `0.0.0` to npm on an
      ordinary merge, because its publish step runs whenever no changesets are
      pending and the packages were absent from the registry. Only a 2FA prompt
      on the token stopped it. A working token would have burned `0.0.0`
      permanently — npm never allows reusing a version. Job is now gated; see
      `docs/05` §8.
- [x] `main` protected — `verify` required and strict, no force-push, no
      deletion, conversation resolution required, admins not enforced (solo
      maintainer)
- [x] **Core-purity check verified to actually fail on a planted violation** —
      probe used a type-only `import type ... from 'vue'`, a bare `import 'react'`
      and a dynamic `import('react-dom')`; all three were caught, exit 1
- [x] Contrast check likewise verified against a planted regression, exit 1, and
      against a planted disagreement between the two dark blocks

### Foundational code
- [x] `core/src/types.ts` — `PropTypes`, `NormalizeProps`, `Dict`
- [x] `core/src/normalize.ts` — `createNormalizer`
- [x] `core/src/dom/attrs.ts` — `dataAttr`, `ariaAttr`
- [x] `normalizeProps` (React) + unit tests
- [x] `normalizeProps` (Vue) + unit tests
- 21 tests passing across 4 projects.

**One spec correction landed here.** `docs/01` §4 defined the neutral event form
as `onKeydown` and claimed the React adapter camel-cased it — but its own snippet
uppercased an already-uppercase character, so the transform was a no-op, and
`keydown → KeyDown` is not derivable by rule anyway. Vue meanwhile needs the
*lowercase* form, because it hyphenates the tail and `onKeyDown` binds a
listener for a `key-down` event that never fires. Resolved by making the neutral
form React's camelCase and having Vue lowercase it. `docs/01` §4 updated.

### Design tokens
- [x] **Contrast-verified every token pair and corrected the values**
- [x] `pnpm contrast` added as a repeatable CI gate — it parses `tokens.css`
      rather than duplicating the values, and self-checks its OKLCh → sRGB
      converter against known anchors before reporting

Measured with `scripts/contrast.mjs` (OKLCh → sRGB → 8-bit → WCAG luminance).

**Light**

| Pair | Ratio | Required | Pass |
|---|---|---|---|
| `fg` / `bg` | 16.82:1 | 4.5 | ✅ |
| `fg` / `surface` | 15.85:1 | 4.5 | ✅ |
| `fg-muted` / `bg` | 7.26:1 | 4.5 | ✅ |
| `fg-muted` / `surface` | 6.84:1 | 4.5 | ✅ |
| `fg-faint` / `bg` | 3.84:1 | 3.0 (large text only) | ✅ |
| `on-accent` / `accent` | 5.42:1 | 4.5 | ✅ |
| `on-accent` / `accent-hover` | 7.03:1 | 4.5 | ✅ |
| `on-danger` / `danger` | 5.85:1 | 4.5 | ✅ |
| `accent` / `bg` | 5.42:1 | 3.0 (SC 1.4.11) | ✅ |
| `accent` / `surface` | 5.11:1 | 3.0 | ✅ |
| `danger` / `bg` | 5.87:1 | 3.0 | ✅ |
| `line-strong` / `bg` | 3.27:1 | 3.0 | ✅ |
| `line-strong` / `surface` | 3.09:1 | 3.0 | ✅ |

**Dark**

| Pair | Ratio | Required | Pass |
|---|---|---|---|
| `fg` / `bg` | 15.28:1 | 4.5 | ✅ |
| `fg` / `surface` | 14.45:1 | 4.5 | ✅ |
| `fg-muted` / `bg` | 7.52:1 | 4.5 | ✅ |
| `fg-muted` / `surface` | 7.12:1 | 4.5 | ✅ |
| `fg-faint` / `bg` | 4.37:1 | 3.0 (large text only) | ✅ |
| `on-accent` / `accent` | 7.27:1 | 4.5 | ✅ |
| `on-accent` / `accent-hover` | 9.06:1 | 4.5 | ✅ |
| `on-danger` / `danger` | 6.26:1 | 4.5 | ✅ |
| `accent` / `bg` | 7.02:1 | 3.0 (SC 1.4.11) | ✅ |
| `accent` / `surface` | 6.64:1 | 3.0 | ✅ |
| `danger` / `bg` | 6.05:1 | 3.0 | ✅ |
| `line-strong` / `bg` | 3.26:1 | 3.0 | ✅ |
| `line-strong` / `surface` | 3.09:1 | 3.0 | ✅ |

**Correction made:** `--kanso-line-strong` was 78% (light) / 42% (dark), giving
1.95:1 and 2.22:1 — both below the 3:1 a border needs when it indicates state.
Now 64% / 51%. `--kanso-line` stays decorative and deliberately below 3:1; see
`docs/02` §3 for the rule separating the two.

`fg-faint` clears 3:1 but not 4.5:1 in either theme. That is intended — it is a
large-text-only token, and the docs must say so rather than letting someone set
body copy in it.

**`surface-sunk` is defined but not yet in any measured pair**, because no
component uses it. A switch track or an input background is exactly where it
will land; add the pair to `scripts/contrast.mjs` in the same commit that first
uses the token.

The dark palette is written twice in `tokens.css` — once under
`prefers-color-scheme`, once under `[data-theme='dark']` — because plain CSS
cannot share a block across a media query. `pnpm contrast` asserts the two copies
are identical, so the duplication cannot silently diverge.

### Docs site
- [x] Starlight scaffolded with `@astrojs/vue` **and** `@astrojs/react`
- [x] Both islands verified to build and hydrate on one page
      (`/embed/islands`, a Phase 0 scaffold check replaced in Phase 1)
- [x] Deployed to Cloudflare Pages (Pages flow, no adapter) —
      https://kanso-ui.pages.dev. Verified live: all three routes return 200 and
      `/embed/islands` serves both the Vue and the React bundle.

### Human tasks (block Phase 1 publish)
- [x] npm account created and authenticated. All four `@caioalfonso/kanso-*`
      names confirmed unpublished and free.
- [ ] `NPM_TOKEN` needs replacing. The current one prompts for a one-time
      password, which no CI job can answer (`npm error code EOTP`). npm has
      retired the "automation" token type — the equivalent is a **granular
      access token** with **Bypass 2FA** checked. See `docs/05` §9.
- [ ] Set the `RELEASE_ENABLED` repository variable to `true` — **only** when
      Phase 1 is ready to publish `0.0.1`.
- [x] GitHub repo created and pushed — `github.com/CaioAP/kanso-ui`
- [x] `main` protected, `verify` required to merge
- [x] Cloudflare Pages project created — `kanso-ui.pages.dev`

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
- [ ] Move CI publishing to npm **trusted publishing** (OIDC) once `0.0.1` is
      out. 2FA-bypassing tokens are being deprecated for direct publishing, and
      trusted publishing needs no stored credential — but it is configured per
      package on npmjs.com, so the package must exist first. `id-token: write` is
      already granted in `release.yml`.
- [ ] `docs/01` §8 and `docs/03` §1 disagree on Switch: §8's `connect` has no
      hidden `<input type="checkbox">`, but §1 requires one for form
      participation, and `switchAnatomy` lists only `root · control · thumb ·
      label`. Resolve at the top of Phase 1 — likely a `hiddenInput` part.
- [ ] `vitest-axe` has no stable release; pinned to `1.0.0-pre.5`, which is what
      works with Vitest 3. If it goes stale, `jest-axe` is the fallback
      (`docs/04` §5 already permits it).
- [ ] All four packages ship `files: ["dist"]`, so no README and no LICENSE land
      in the tarball and the npm page would be blank. Fix before Phase 1's
      `0.0.1` publish — a per-package README is the npm landing page.
- [ ] Docs site domain — `kanso-ui.pages.dev` by default, custom domain undecided
- [ ] Whether `ComponentPreview` reflects live knob state in the shown source, or
      shows a static example (decide when building it in Phase 1)
