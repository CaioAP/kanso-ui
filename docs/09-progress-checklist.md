# 09 — Progress checklist

Living status doc. **Update it as items land** — it is the fastest way for a new
session to learn where things stand.

**Status: Phases 5, 5.1, 5.2 and 6 done — all seven v1 components exist, the
site is themed and documented, and `0.0.1` is on npm.** Switch, Tabs, Dialog, Menu,
Field (with Input and Textarea), Button and Card are in core, Vue and React,
with 894 unit tests and 207 browser tests green, docs pages, four guides, and
seven embed routes live. Lighthouse is 100 across all four categories.

The component list from `docs/00` is complete. What remains before `1.0.0` is
Phase 6 (API review, bundle size, the semver promise).

**`0.0.1` is published.** All four `@caioalfonso/kanso-*` packages went to npm on
2026-08-04, by hand from a local authenticated session — the sequence `docs/05`
§9 calls for, so that trusted publishing can be configured against packages that
exist. The `RELEASE_ENABLED` guard has since been removed and publishing moved to
OIDC (see *Open questions* below), but **the release workflow has still never
completed a publish** — that is the next thing to close, not a leftover.

The next release is `0.0.2`, not `0.0.1`: eight changesets are pending, and the
first CI release consumes all of them.

**Every pending changeset is a `patch`, deliberately.** `docs/07` originally
reserved `0.1.0` for the end of Phase 3; the maintainer has since said `0.1.0`
is theirs to call, so the `0.0.x` line continues and the Phase 3 changeset was
changed from `minor` to `patch` to match. Worth knowing about changesets while
this holds: unreleased changesets **collapse into one bump**, so however many
patches accumulate, the next release is `0.0.2` and the one after it `0.0.3`.
The version only moves when a release actually runs.

Phase 1 found four real defects that the layer below it could not see. They are
recorded in detail under Phase 1 because the pattern generalises: each was
silent, each passed the tests that existed at the time, and each was caught by
adding a *different kind* of test rather than more of the same kind.

**Repo:** `/home/caio/Projects/kanso-ui` · **npm scope:** `@caioalfonso` (confirmed free)
**Docs site:** https://kansoui.caioalfonso.dev · **GitHub:** `github.com/CaioAP/kanso-ui`

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
- [x] `NPM_TOKEN` replaced with a granular access token carrying **Bypass 2FA**
      (npm retired the "automation" type). Set 2026-07-30.
- [x] ~~Set the `RELEASE_ENABLED` repository variable to `true`, which publishes
      `0.0.1` on the next merge to `main`.~~ **Overtaken by events, and
      deliberately.** `0.0.1` was published by hand on 2026-08-04 instead, which
      is what `docs/05` §9 asks for: trusted publishing is configured per package
      on npmjs.com and needs the package to exist first, so the first release
      cannot come from the credential-free path. `RELEASE_ENABLED` remains unset
      and the guard remains in place — see the open questions below for what
      replaces it.
- [x] GitHub repo created and pushed — `github.com/CaioAP/kanso-ui`
- [x] `main` protected, `verify` required to merge
- [x] Cloudflare Pages project created — `kanso-ui.pages.dev`

---

## Phase 1 — Switch (vertical slice) 🔑
- [x] Core: types, anatomy, state, connect
- [x] Core unit tests — every transition and guard (39)
- [x] Vue adapter — `defineComponent` + `h()`, not an SFC (esbuild cannot
      compile `.vue`; rationale in `docs/01` §8)
- [x] React adapter
- [x] Tests both frameworks: render, click, Space, Enter, controlled, uncontrolled,
      disabled, readOnly, forms, axe — 68, deliberately mirrored so a behaviour
      present in one adapter and missing in the other fails
- [x] SSR test both frameworks, no hydration warning — spying on `console.error`,
      because a mismatch is a logged warning and a test that only checks "did not
      throw" passes vacuously
- [x] `packages/styles/src/switch.css` + a clipped `hidden-input` primitive
- [x] Docs page (full template)
- [x] `ComponentPreview`: framework toggle, knobs, source, copy
- [x] `/embed/switch`
- [x] Playwright + axe on the docs site — 21 tests, wired into CI
- [x] Changeset written
- [x] **Published `0.0.1`** — 2026-08-04, by hand from a local authenticated
      session rather than through CI, per `docs/05` §9. `RELEASE_ENABLED` was
      never set; the release workflow has still never run end to end.
- [x] External install verified from a clean directory — first against real
      `pnpm pack` tarballs, then **against the registry itself** once `0.0.1`
      was out. The registry round-trip, previously the one unproven thing, now
      checks out: `npm install` into a project outside the workspace resolved
      the adapters' `"@caioalfonso/kanso-core": "^0.0.1"` from npm, which is the
      published proof that pnpm rewrote `workspace:^` on the way out. Root and
      `./switch` subpaths import, both frameworks server-render with
      `role="switch"` and the right `aria-checked`, the published core carries no
      framework import, the five exports cut in Phase 6 are absent from the
      published surface, `switchIds` and `tabsTriggerId` are still there, and the
      declarations typecheck under `nodenext` + `strict` with
      `skipLibCheck: false` — so the library's own `.d.ts` is checked, not just
      the call site. All 21 entries re-verified isolated when bundled from
      `node_modules` rather than from local `dist`.
- [ ] Portfolio: Sanity `project` document
- [ ] Portfolio: playground entry + iframe embed

### Defects Phase 1 found

Each of these passed every test that existed when it was written.

1. **Vue event names were wrong in a way only hydration exposes.** The Phase 0
   normalizer lowercased handler names entirely (`onKeyDown` → `onkeydown`). Vue
   only treats a prop as an event when it matches `/^on[^a-z]/`, so `onkeydown`
   fell through to `el.onkeydown` as a DOM property — which *works* on a fresh
   mount. Hydration only patches props Vue recognises as events, so a
   server-rendered Switch hydrated with no click handler and was inert. Correct
   fold is `on` + capital + lowercase tail (`onKeydown`). `docs/01` §4.
2. **`readOnly` on the hidden input silently disabled `required`.** A checkbox
   carrying `readonly` is barred from constraint validation — Chrome reports
   `willValidate === false` — so `required` stopped blocking submission. Replaced
   with a no-op `onChange`. Caught by Playwright; unreachable from jsdom.
3. **The switch track failed WCAG 2.2 SC 2.5.8 target size** at 36×20 where
   24×24 is the floor. Now 44×24. Invisible without layout.
4. **`--kanso-line-strong` was below 3:1 against `--kanso-surface-sunk`** (2.87:1
   in light). The token claimed ≥ 3:1 but had only ever been measured against
   `bg` and `surface`. Corrected 64% → 62%; now clears every surface it can sit
   on. Surfaced by adding the switch's colour pairs to `scripts/contrast.mjs`.

### Measured, this phase
- 141 unit tests (core 39 + adapters 68 + SSR 12 + normalizers 13 + attrs 6, in
  4 Vitest projects), 21 Playwright tests, all green
- 30 colour pairs measured across both themes, all passing
- SSR gate verified by planting `Math.random()` in `switchIds` — both frameworks'
  suites failed, 4 tests, then restored
- `publint` + `attw` green on the new `./switch` subpath in all three JS packages

---

## Phase 2 — Tabs
- [x] `core/src/dom/roving-focus.ts` + tests (21). Pure index arithmetic plus one
      DOM read, and deliberately **no** tabindex bookkeeping: `connect()` already
      emits `tabIndex` from state, so a manager that wrote the attribute too
      would be a second source of truth for it
- [x] Core: types, anatomy, state, connect — 59 unit tests
- [x] Vue adapter + React adapter, compound (`Root`/`List`/`Trigger`/`Content`)
- [x] Full keyboard table tested, both orientations, both activation modes —
      42 tests per adapter, mirrored assertion for assertion
- [x] axe + SSR both frameworks
- [x] Styles · docs page · `/embed/tabs` · changeset (patch — `0.1.0` is
      reserved for Phase 3, where three components make the number mean something)
- [x] `ComponentPreview` framework toggle rebuilt on the library's own roving
      focus — from `@caioalfonso/kanso-core` directly, not from an adapter.
      Mounting the toggle as a Vue or React island would have made the choice
      between the two lopsided and added a third hydration boundary above the two
      playground islands; driving the core from a plain script says the stronger
      thing anyway. The hand-rolled modulo arithmetic and key mapping are gone,
      `Home` and `End` now work as a side effect of using the real implementation,
      and only attribute application is left in the script

### Decisions taken before writing code

`docs/03` §2 now carries six, with the reasoning. The load-bearing ones:

- **Panels are always mounted, `hidden` when unselected.** Unmounting them leaves
  `aria-controls` dangling on every unselected trigger, and axe reports an
  unresolvable `aria-controls` as *incomplete*, not as a violation — so nothing
  in CI would have caught it. This also corrected the spec's stated rationale for
  `activationMode: 'manual'`: it is not about expensive rendering, it is that
  automatic activation fires `onValueChange` once per tab arrowed past.
- **No `focusedValue` in state.** The tab stop follows the selection, matching the
  APG reference implementation. Storing a second focus pointer would mean core
  tracking blur, which it has no business doing.
- **Tab values are `encodeURIComponent`-encoded into ids.** A value with a space
  makes `aria-controls="t-content-my tab"` parse as two broken idrefs. Encoding
  is injective, so two values can never collide on one id — which a
  `replace(/\s/g, '-')` does not guarantee.
- **No per-tab `disabled`, no `indicator` part in v1.** Both were scoped out
  deliberately; `docs/03` §2 records why and what they would cost.

### Defects Phase 2 found

1. **`ComponentPreview`'s framework toggle was rewriting the component's own
   tabs.** Its inline script queried `[role="tab"]` across the whole preview, so
   on a page whose subject *is* a tablist it swept up the component's triggers:
   their `aria-selected` and `tabindex` were overwritten on every framework
   toggle, and their arrow keys were hijacked. Invisible for as long as no
   component had tabs. Now scoped to `[data-framework]`.
2. **The Playwright suite raced island hydration.** Previews mount with
   `client:visible` and the React one starts inside a hidden panel, so it
   hydrates only when the toggle reveals it. Server-rendered markup is fully
   present and fully inert until then, so a keypress could land on markup with no
   handler while the assertion waited five seconds for a change that had already
   failed to happen. Both specs now wait for Astro to drop `ssr` from
   `<astro-island>`. This was latent in the Switch suite too.
3. **Long lines in a docs code block failed axe.** `scrollable-region-focusable`:
   an Expressive Code `<pre>` that overflows horizontally is a scrollable region
   with no keyboard access. It surfaced as a *flaky* failure, because the
   overflow measurement depends on when the scan runs. Fixed at the source by
   keeping example lines short, on the Switch page as well.

### Measured, this phase
- 319 unit tests across 4 Vitest projects (was 141), 45 Playwright tests (was 21)
- The Vue provide/inject trap verified by planting the defect: providing the api
  object instead of the `computed` fails 7 tests, including hydration
- No new colour pair — Tabs reuses pairs already in `scripts/contrast.mjs`, and
  the pair list now says so explicitly rather than leaving it looking forgotten

---

## Phase 3 — Dialog
- [x] `focusable.ts` · `focus-trap.ts` · `scroll-lock.ts` · `dismissable.ts` +
      tests (50). `focusable.ts` is not in the roadmap's list and is in
      `docs/01` §6 — the trap, Dialog's initial focus and Phase 4's Menu all
      need it, so it is its own module rather than a private helper
- [x] Core: types, anatomy, state, connect, and one `dialog.dom.ts` entry point
      — 51 unit tests. The four utilities are composed *there*, not in the
      adapters, because the order is the behaviour: focus moves after the trap
      is armed and is restored after it lets go
- [x] Both adapters, compound, portalled to `<body>` after mount
- [x] Tests: Escape, outside click, initialFocus, finalFocus, axe open **and**
      closed, SSR — 37 per adapter, mirrored assertion for assertion, plus 7
      SSR/hydration tests each
- [x] **Playwright**: trap holds, focus restores, no body scroll, no layout
      shift, `inert` — 34 browser tests, both frameworks
- [x] Styles · docs page · `/embed/dialog` · changeset (**minor** — `0.1.0`)
- [x] Bumped to `0.1.0` by the changeset; the version lands when a release runs

### Decisions taken before writing code

`docs/03` §3 now carries eleven, with the reasoning. The load-bearing ones:

- **Not the native `<dialog>`.** `showModal()` gives a menu nothing, and Phase 4
  needs these utilities anyway; `modal={false}` gets no help from the platform
  at all, so a native implementation would need the manual path *as well*. The
  part of `<dialog>` worth having — `inert` on the background — is used
  directly.
- **Portalled after mount**, so the dialog is absent from the server-rendered
  HTML, `defaultOpen` included. React's `createPortal` is unsupported by
  `react-dom/server` and Vue's teleport output is collected separately from the
  page HTML; content that must be in the initial response does not want to be a
  dialog.
- **`Title` and `Description` register themselves**, and each idref is emitted
  only once its part is mounted — the third occurrence of the dangling-idref
  defect class in this repo, after Switch's `aria-labelledby` and Tabs'
  `aria-controls`. Worth naming as a rule: *an idref is a promise about the DOM,
  and only the thing that renders can keep it.*
- **Outside-press is `pointerdown`**, so selecting text inside and releasing
  outside does not close the dialog and throw the selection away.
- **`Escape` and outside-press are stack-aware**, and the scroll lock is
  refcounted, so a dialog inside a dialog behaves.

### Defects Phase 3 found

0. **Nested dialogs froze `Tab`.** Both traps listen on the document in the
   capture phase and the outer one runs first; with an inner dialog open, the
   outer trap's own content is inside the subtree the inner trap just marked
   `inert`, so it found nothing focusable, concluded there was nowhere to go,
   and cancelled the press. Nothing in the suite covered nesting *behaviour* —
   the nesting test that existed only inspected `inert` attributes. Fixed with a
   module-level trap stack mirroring `dismissable.ts`; `docs/03` §3 decision 12
   records it. Worth noting that the claim "nesting works" was already written
   in three places before anything tested it.

1. **Focus restoration worked by keyboard and silently failed by mouse.**
   Dismissing with a press restored focus to the trigger, and then the browser's
   own default action for that press moved focus to `<body>` — after our
   teardown had run. Invisible to every jsdom test and to every keyboard path.
   Fixed with `blockOutsidePress` on the dismissable layer, which cancels the
   default for a modal layer only: a press on the page behind a *non-modal*
   dialog should still focus what it hit.
2. **The name check ran a render too early.** `Dialog.Title` registers from its
   own mount hook, which schedules a re-render of the root, so at the moment the
   content's mount hook ran the `aria-labelledby` attribute was not on the
   element yet — and every correctly-titled dialog logged "no accessible name".
   14 warnings across a passing suite. Core now owns the delay
   (`scheduleDialogNameCheck`) rather than each adapter guessing at it.
3. **`ComponentPreview` titled every example `Switch.vue`.** Hardcoded in
   Phase 1, when there was only one component to be wrong about; the Tabs page
   has been announcing its example as Switch's ever since. Now derived from the
   preview's `label`.

Two more were mine rather than the library's, and are recorded because the shape
repeats: a test file that wiped `document.body` broke Testing Library's own
cleanup for a *portalled* component (24 failures, none about the component), and
a refcounted scroll lock leaked across tests whenever an assertion failed before
its teardown.

### Measured, this phase
- 508 unit tests across 4 Vitest projects (was 319), 79 Playwright tests (was 45)
- Verified by planting the defect, as in Phases 1 and 2: scoping the trap's
  boundary to the dialog itself leaves every unit test green and fails the
  browser suite in both frameworks. That exercise also exposed a weak assertion
  — the first `inert` check passed for the wrong reason, because the centred
  dialog was covering the element it probed. It now asks the browser to focus
  the background element and checks whether that took
- One new colour pair (`fg` on `surface-sunk`, the hovered trigger and close
  button); the scrim is translucent and the dialog's hairline border is
  decorative, so neither is measurable and `scripts/contrast.mjs` says so

---

## Phase 4 — Menu
- [x] `typeahead.ts` + tests (20). Split like `roving-focus.ts`: a pure matcher,
      plus a per-instance buffer with its own teardown. A module-level buffer
      would be shared by every menu on the page and its timer would outlive the
      component that started it
- [x] Core: types, anatomy, state, connect, `menu.dom.ts` — 71 unit tests. More
      behaviour sits in `menu.dom.ts` than in `connect` for this component, and
      deliberately: the arrows, typeahead and `Tab` all need either the live
      item collection or a buffer that survives between keystrokes
- [x] Vue + React adapters, compound, **not portalled**
- [x] Full APG key map tested in both, incl. typeahead cycling and
      Tab-closes-and-moves-on — 33 tests per adapter, mirrored, plus 7 SSR each
- [x] Disabled items remain focusable, and typeahead lands on them like the
      arrows do
- [x] CSS anchoring + collision fallback (no Floating UI). Measured once at
      open; `data-placement` is read by the stylesheet, and nothing listens for
      `resize` or `scroll`
- [x] Styles · docs page · `/embed/menu` · changeset (patch)

### Two spec corrections, made before any code

- **Menu does not use `focus-trap`.** `docs/01` §6, `docs/03` §4 and `docs/07`
  all said it did. They cannot be right: the keyboard table says `Tab` closes
  the menu and lets focus move on, which is the opposite of a trap. `docs/03` §4
  decision 1 records it; §3 decision 12 was corrected too, since it claimed
  Menu-inside-Dialog needed the trap stack when it needs the dismissable one.
- **The trigger carries no `aria-controls`.** The content is unmounted while
  closed, so the idref would dangle — the fourth time this repo has made that
  call, after Switch, Tabs and Dialog.

Seven more decisions are in `docs/03` §4. The one with the widest consequences
is **not portalling**: a portalled menu is a *sibling* of an open dialog's
content, so the dialog's trap sees focus as "outside" and pulls it out of the
menu. Rendering in flow keeps focus genuinely inside the dialog, and both
adapter suites now test a menu inside a dialog — the case `docs/03` §3
decision 5 claimed as proof of the layer stack and nothing had exercised.

### Defects Phase 4 found

1. **A scrollable menu failed axe.** `scrollable-region-focusable`, serious: the
   content has `max-height` and `overflow: auto`, and its items are all
   `tabindex="-1"`, so axe — and Safari — see a scroll region with no keyboard
   access. The content is now `tabindex="0"`. It costs nothing, because every
   `Tab` inside the menu closes it, so that stop is never stepped onto.
2. **An axe scan raced the entry animation.** `color-contrast`, serious, on the
   embed route — and only in the *serial* run. axe computes contrast from
   composited colours, so a scan landing mid-fade measured a half-transparent
   group label against the page. Both the Menu and Dialog suites now await
   `getAnimations()` before scanning. Third time a docs-site defect has
   presented as flakiness rather than as a failure.
3. **Placement oscillated between opens.** `measureMenuPlacement` read the
   menu's *current* rect, so each answer depended on the previous one: a menu
   that flipped above found room below next time, flipped back, and landed
   somewhere different on alternate presses of the same button. Now measured
   from the trigger plus the menu's size, which is placement-independent. Found
   by review rather than by a test — every test opened the menu once.
4. **The first typeahead e2e test was wrong about its own feature.** It pressed
   "r" then "d" and expected two separate jumps; consecutive keys are *one
   query*, so it searched for "rd" and matched nothing. The test now waits past
   the reset window between distinct queries, which is what a user does.

### Measured, this phase
- 682 unit tests across 4 Vitest projects (was 511), 114 Playwright tests (was 79)
- Verified by planting the defect: adding `preventDefault()` to the `Tab` branch
  — the one-line change that turns this into a trap — fails both adapter suites
  and the browser suite in both frameworks
- `typeahead.clear()` was removed before merge: nothing called it, and an
  exported method with no caller is a claim about behaviour the library never
  exercises
- One new colour pair (`fg-faint` on `surface`, the disabled item). WCAG exempts
  inactive controls from the contrast minimum; holding them to 3:1 anyway is the
  difference between "unavailable" and "unreadable"

---

## Phase 5 — Inputs · Button · Card
- [x] `Field` + `Input` + `Textarea` — core is a `connect` and one dev-time
      check, with **no reducer and no events**. Every input is a prop the
      consumer owns, so `connectField(state, normalize)` takes two arguments and
      says so
- [x] `aria-describedby` composition tested: description only / error only /
      both / neither — and the fifth case the roadmap did not name, the
      consumer's own `aria-describedby`, composed rather than dropped
- [x] Button: variants, sizes, `loading` → `aria-busy` and still focusable, 44px
      target at every size
- [x] Card: layout + docs teaching the whole-card link pattern *and* its cost
- [x] Styles · docs pages · embed routes · changesets (three, all `patch`)

### The decision that shaped Field

`docs/03` §5 now carries eight decisions. One of them decides the component:

**Presence is a prop, not a registration — because a field is always
server-rendered.** Dialog learns that a `Dialog.Title` exists by having the
title register with the root from its own mount hook. Field cannot copy that. A
closed dialog is absent from the server HTML, so registration has nothing to be
late for; a field is always in the HTML and always wired, so a registration
means the server sends a control with **no `aria-describedby`** and the
association appears only when JavaScript does. A form that works without
JavaScript would ship without its description.

So `Field` takes `label` / `description` / `errorText` as node props in React
and as the `#label` / `#description` / `#error-text` slots in Vue, and renders
those parts itself. Reading context downward during render is synchronous and
server-safe; only writing upward is not. The cost is that the part order is
fixed — which is the order they should be in.

The SSR tests assert the attribute is in the **HTML string**, not merely present
after hydration. "Hydrates without warnings" would have passed on the broken
design: a registration produces a post-hydration update, not a mismatch.

The others worth carrying forward:

- **`aria-describedby` composes the consumer's own ids.** Every adapter applies
  core's props last so core wins, which means a hand-written `aria-describedby`
  on an `Input` is otherwise dropped silently — the exact defect class this
  component exists to prevent. The control's prop getter takes it and appends.
- **With nothing to describe the attribute is absent, not `""`.** The naive test
  (`toBe('')`) passes on the broken version, so the assertion is on absence.
- **The error element is rendered before it has a message.** A live region
  announces *changes* to a region already in the document; mounting the region
  together with its first message announces in some screen readers and not
  others. Not `display: none` either — the stylesheet is optional, and an
  announcement must never depend on it.
- **`required` is native, and the stylesheet keys off `data-invalid`.** These
  two are connected: native `required` on an empty control matches `:invalid`
  from page load, so a stylesheet written against the pseudo-class marks every
  required field as broken before the user types.

### Button and Card, and what "thin core" means

Neither has a reducer, and the signatures say so — `connectButton(state,
normalize)`, `connectCard(normalize)`. Inventing an event union to keep the
three-argument shape would claim behaviour the components do not have.

Two things still had to live in core, and both are the reason "no core module"
was the wrong instruction:

1. **Button's activation guard.** The consumer's `onClick` is passed *into*
   `connectButton`, because every adapter renders `{...consumerAttrs}
   {...api.props}` so core wins — a core-supplied `onClick` would otherwise
   delete the consumer's, and a button whose handler never fires renders
   perfectly and passes an axe scan.
2. **Card's attributes.** `docs/03` §7 said "no core module" and is corrected.
   Left to two hand-written adapters, one of them eventually writes
   `data-part="content"`, and nothing fails until a stylesheet meets it.

Also settled: `loading` sets `aria-busy` **only**, not `aria-disabled` — "busy"
is a truer description of a button working on your last press than
"unavailable"; the label is faded with `opacity` because `visibility: hidden`
and `display: none` take the accessible name with them; and 44px is a floor at
every size, so `sm` is narrower and lighter rather than shorter.

### The contract changed

`PropTypes` and `NormalizeProps` gained a fifth entry, `textarea`. A textarea is
not an input — it has `rows`, no `type`, and a different props interface in
React — and routing it through `element` would have type-checked by being loose.
`docs/01` §3's listing was updated in the same commit.

`ButtonState` is also the library's first *generic* state type. React types a
button's `onClick` as taking a full `MouseEvent`, and under `strictFunctionTypes`
that is not assignable to a handler taking the two methods core actually calls.
The type parameter lets the React adapter narrow it and hand the handler
straight through, with no cast in either adapter.

### Verified by planting the defect

Two plants, one line each, and both failed in **core and in both adapters**:

1. `'aria-describedby': fieldDescribedBy(state)` — dropping `options.describedBy`
   — failed 2 core tests and the "composed with the field's, not replaced by it"
   test in each adapter.
2. Removing `onClick?.(event)` from Button's composed handler — failed 2 core
   tests and "calls the consumer's handler" in each adapter.

### Defects Phase 5 found

1. **`readOnly` reaches Vue's DOM as a property on the client and as the literal
   attribute `readOnly="true"` from the server renderer.** Vue chooses between a
   property and an attribute with `key in el`, and `readOnly` *is* a property of
   an `<input>`; meanwhile the server renderer's boolean-attribute list is
   lowercase, so it never takes the boolean path. The same shape of client/server
   divergence the event-name folding exists to prevent. Fixed by giving Vue's
   normalizer a `propMap` (`readOnly` → `readonly`), mirroring React's
   `class`/`for` map, and asserted in the SSR suite.
2. **`v-model` on the Vue `Input` was inert, and the only artefact that showed
   it was the one nothing runs.** `v-model` compiles to a `modelValue` prop and
   an `update:modelValue` listener; a component that declares neither receives
   both as *fallthrough attrs* and spreads them onto the native element, where
   `modelValue` becomes a junk attribute and the listener waits for an event no
   DOM element fires. Typing did nothing, silently.

   The interesting part is why the suite could not see it. Example files are
   only ever read as `?raw` text for the copyable source block, so Astro never
   compiles them and `tsc` never reads them; the playground has no value
   binding; and the one Vue test that touched a value used an unbound
   `Textarea`. **The single artefact a visitor copies was the single artefact
   nothing executed.** Fixed by declaring the prop and the emit in both Vue
   controls — reactivity binding is the adapter's half of the contract, and core
   still touches no value — and by adding the binding tests to both frameworks,
   because "it works in React" is exactly how nobody notices it is broken in Vue.
3. **`scrollable-region-focusable` on the Card page, again.** A code block whose
   longest line overflowed horizontally is a scrollable region with no keyboard
   access. Third appearance of the Phase 2 finding, and it surfaced only in the
   React panel — the failure is width-dependent, which is why it looks flaky.
   Fixed at the source by shortening the example.

### Measured, this phase
- 886 unit tests across 4 Vitest projects (was 682), 171 Playwright tests
  (was 114)
- Three new colour pairs, all measured in both themes: `danger` as *text* at
  4.5:1 on `bg` and on `surface` (the existing row only held it to 3:1 as a
  border), and the invalid border on a surface. `pnpm contrast` passes
- One pair deliberately **not** measured, and the list says so: a disabled
  button is a native `disabled` at reduced opacity, and WCAG exempts inactive
  controls from the minimum

---

## Phase 5.1 — Docs polish
- [x] Starlight themed to kanso tokens — `docs/src/styles/starlight.css`
- [x] **Accessibility guide** written properly
- [x] Theming guide + portfolio-retheme worked example
- [x] SSR guide
- [x] Architecture page
- [x] Lighthouse measured and recorded (below)
- [ ] Custom domain (optional) — still undecided

### Lighthouse

Measured against `pnpm --filter docs build` + `astro preview`, not the dev
server, with Lighthouse 12 headless. Recorded, **not gated** — the roadmap asks
for numbers, and a CI Lighthouse job is a flaky gate for a static site whose
real a11y guard is the axe suite.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 |
| `/getting-started/introduction/` | 100 | 100 | 100 | 100 |
| `/guides/accessibility/` | 100 | 100 | 100 | 100 |
| `/guides/theming/` | 100 | 100 | 100 | 100 |
| `/components/switch/` | 100 | 100 | 100 | 100 |
| `/components/menu/` | 100 | 100 | 100 | 100 |

The first run scored **96 on best practices** on every page, for one reason:
Starlight points at `/favicon.svg` by default and there was no such file, so
every page logged a 404. A missing favicon is a trivial defect that only a tool
looking at the console reports — which is the argument for measuring rather than
assuming. `docs/public/favicon.svg` now exists.

**Lighthouse's accessibility score is not axe**, and a 100 there is worth less
than the 200 browser assertions. It scans a subset of rules on the initial
render; it cannot open a dialog, press an arrow key or tab through a trap.
Recorded as a floor, read as a floor.

### Starlight theming — the part that would have failed silently

`--sl-color-*` is remapped onto `--kanso-*` from a **single bare `:root`
block**, which looks wrong and is not. Starlight declares its palette twice —
a bare `:root` holding its *dark* theme, and `:root[data-theme='light']` — so a
bare-`:root` mapping should lose in light mode on specificity. It does not,
because every Starlight rule sits in `@layer starlight.*` and the theme file is
unlayered, and unlayered CSS beats layered CSS at any specificity. The kanso
tokens then do the theme switching themselves, off the same `data-theme`
attribute Starlight already sets.

The failure mode if that ever changes is the dangerous kind: **light mode keeps
looking right and dark mode silently reverts to Starlight's stock blue-grey.**
So `tests/e2e/theme.spec.ts` resolves every mapped variable in *both* themes and
asserts the two themes produce different colours — the second assertion matters,
because the first passes vacuously if `data-theme` stops switching anything.

Verified by planting the defect, as in every phase since Phase 1: wrapping the
theme file in `@layer starlight.base` leaves the build green and fails 5 of the
7 theme tests, in both themes.

Two deliberate omissions, recorded so they are not read as oversights:

- **`fg-faint` is mapped to nothing.** It is a large-text-only token at
  3.84:1 / 4.37:1, and the sidebar and breadcrumbs are exactly where it would
  be tempting and exactly where it would put the chrome below AA.
- **Starlight's orange / green / red / purple ramps keep their defaults.** They
  carry meaning rather than brand, they ship as contrast-tuned pairs, and
  collapsing them onto kanso's single `danger` token would add four colour
  pairs to `pnpm contrast` for chrome this library does not own.

No new colour pair was needed: every pair the mapping produces — `fg` and
`fg-muted` on `bg`, `surface` and `surface-sunk`; `accent` on `bg`;
`on-accent` on `accent`; `line-strong` on `bg` and `surface` — is already
measured.

### Defects Phase 5.1 found

1. **The site announced Phase 0 to every visitor.** The introduction page said
   "the packages are scaffolded but export no components yet" with all seven
   components built, tested and documented. Live, on the deployed site, for the
   length of four phases. The correction had to avoid the opposite falsehood:
   nothing is on npm, so "install it" would have been just as wrong.
2. **Every code block was unreachable by keyboard on a narrow viewport.**
   Expressive Code renders `<pre>` with `overflow-x: auto` and no `tabindex`,
   so any block wider than its column is a scrollable region with no keyboard
   access — `scrollable-region-focusable`, serious, a real WCAG 2.1.1 failure.

   This is the **fourth** appearance of the same finding (Switch page, Menu
   embed, Card page, now everywhere), and the first three were each fixed by
   shortening the example. That is why it kept coming back: whether a block
   overflows depends on the viewport, so shortening works at 1280px and cannot
   work at 360px, where every realistic sample overflows. Fixed structurally
   instead, and the test now measures at 360px rather than hoping a default
   viewport catches it.

   **It took two plugins for one attribute**, and the reason is worth writing
   down. Starlight runs Expressive Code through two configuration paths that do
   not share a config object: the `<Code>` component reads `ec.config.mjs` and
   only that file — passing the same options inline in `astro.config.mjs` fails
   the build, because that path serialises its config to JSON and a plugin is a
   function — while markdown and MDX code fences go through the integration,
   which never sees `ec.config.mjs`. Either plugin alone leaves half the site's
   code blocks unreachable.

   Two smaller traps on the way: hast property names are camelCase, so
   `properties.tabindex` is dropped on serialisation and the block builds
   looking exactly like one that worked; and the rehype plugin has to stay on
   Astro 7's **deprecated** `markdown.rehypePlugins`, because Starlight
   registers Expressive Code by pushing onto `processor.options.rehypePlugins`
   and a plugin passed to `unified()` would therefore run *before* it — against
   the original `<pre><code>` that Expressive Code throws away.
3. **A missing favicon cost 4 points of best practices on every page.** See
   above.

One doc correction landed here too: `docs/02` §3 still listed
`--kanso-line-strong` at `64%` light, where Phase 1 moved it to `62%` after
measuring it against `surface-sunk`. `tokens.css` was right; the listing was
stale.

---

## Phase 6 — 1.0.0
- [x] API review — naming, prop parity, no leaked internals
- [x] Bundle size per entry; tree-shaking verified
- [x] `CONTRIBUTING.md`, issue/PR templates
- [x] README polished for the npm landing page
- [ ] **`1.0.0` published**
- [ ] Portfolio project document updated with the real outcome line
- [ ] Blog post written

### What the API review changed

The criterion was `docs/00`'s non-goal — Vue and React only — so the public
surface is what the two shipped adapters need plus what the docs teach, not a
speculative adapter-authoring API. Every name in `core`'s entry points was
traced to its callers. Five had exactly one, and it was never an adapter:

| Removed | Only caller |
|---|---|
| `assertDialogName` | `scheduleDialogNameCheck`, same file |
| `assertFieldControl` | `scheduleFieldControlCheck`, same file |
| `fieldDescribedBy` | `connectField` |
| `measureMenuPlacement` | `activateMenu`, same file |
| `getDismissableLayerCount` | `dismissable.test.ts` — test introspection |

Kept despite no adapter importing them: `switchIds` and its siblings, and
`tabsTriggerId` / `tabsContentId`. The server-rendering guide teaches the
derivation, and pointing `aria-controls` at a panel from outside the component
needs them.

**Not a defect:** Vue exports fewer `type XProps` than React. That is idiom, not
parity — the parity rule in `CLAUDE.md` is about behaviour, and Vue consumers
recover prop types through the component type itself.

### Defects Phase 6 found

1. **The tree-shaking check's first marker was wrong, and reported a leak that
   was not there.** Anatomy part names looked like the natural marker — they are
   the styling contract, so they cannot be renamed silently. But Card's parts are
   `header` / `body` / `footer`, and Vue's Dialog teleports with `to: "body"`, so
   every build reported Card leaking into Dialog. The marker now carries its own
   scope: `"data-scope":"card"`, verified byte-identical in core, react and vue
   output. A marker that is a common English word measures nothing.

2. **The first budgets could not fail.** Menu's was 4000 B against a measured
   2265 B — 76% slack. Budgets are now ~12% over measured, which is the point:
   a threshold nothing can cross is decoration.

Verified by planting the defect, as since Phase 1: a cross-import from Switch
into Menu made `pnpm bundle-size` report both the leak and the size regression
and exit 1; reverting restored it to clean.

---

## Phase 5.2 — Preview chrome and alignment

Five defects reported against the live site on 2026-08-04, from screenshots.
**Four of them are one bug.** They are listed separately because that is how
they present, and grouped in the fix because that is what they are.

- [x] Starlight's markdown margins stop leaking into previews
  - [x] 1 — Switch label sits below the track instead of centred on it
  - [x] 2 — Tabs preview misaligned the same way
  - [x] 3 — Field error message pushed too far below the control
  - [x] 4 — Preview-bar buttons at inconsistent heights
- [x] 5 — Framework switcher moves into the code-frame file tabs
- [x] E2E specs updated for the renamed tabs, full suite green
- [x] `docs/06` §6 and `ComponentPreview.astro`'s header comment updated
- [x] Three regression tests added, each verified by planting the defect
- [x] 6 — Field shows one message below the control: the error replaces the
      description (asked for after the first five landed)

### Defects 1–4 are one rule

`@astrojs/starlight/style/markdown.css` line 4:

```css
.sl-markdown-content
  :not(a, strong, em, del, span, input, code, br)
  + :not(a, strong, em, del, span, input, code, br, :where(.not-content *)) {
  margin-top: 1rem;
}
```

Every component page is markdown, so `ComponentPreview` renders *inside*
`.sl-markdown-content`, and every element in it that has a preceding sibling
gets 16px of top margin it never asked for. Measured on the live site with
`getComputedStyle`:

| Element | `margin-top` | Why |
|---|---|---|
| Switch `[data-part='control']` | `0px` | first child |
| Switch `[data-part='label']` | **`16px`** | follows the control |
| Preview tab "Vue" | `0px` | first child |
| Preview tab "React" | **`16px`** | follows "Vue" |
| "Dark preview" | **`16px`** | follows the tablist |
| Knobs `<fieldset>` | `0px` | first child |
| Second knob `<label>` | **`16px`** | follows the first |

That table is the whole bug. It explains the switch label dropping below its
track (`align-items: center` on a child carrying a 16px top margin is not
centred), the tabs preview, the field error's extra gap on top of the field's
own `--kanso-space-2`, and the preview bar's ragged heights — the *first* tab
has no margin and every sibling after it does.

**The fix is `class="not-content"` on the preview root**, Starlight's own escape
hatch, confirmed present in the installed version as `:where(.not-content *)` —
descendants only, so `.preview` itself stays in the markdown flow and keeps its
`margin-block`.

**The fix does not belong in `packages/styles`.** A `margin: 0` reset in
`switch.css` would ship defensive CSS against one consumer's markdown renderer
into the library, and would need a changeset for a bug the library does not
have. The `/embed/*` routes are standalone `.astro` pages outside
`.sl-markdown-content` and never had this defect — which is itself the proof
that the cause is the host page, not the component.

### Defect 5 — the switcher

The preview bar carries a Vue/React tablist *and* the source block below it
carries an Expressive Code frame title (`Switch.vue`). Two pieces of chrome
naming the same thing. The title bar becomes the switcher: `Switch.vue` and
`Switch.tsx` as file tabs, driving both the live panel and the source, and the
preview bar keeps only the theme toggle.

What must survive the move, because it is the thesis demonstrated: `role=
"tablist"`, `aria-selected`, roving tabindex, and the `getRovingMove` /
`getRovingIndex` wiring driven from `@caioalfonso/kanso-core`. One tab owns two
regions, which `aria-controls` supports as a space-separated idref list.

**Noted tradeoff:** the switcher ends up *below* the preview it controls.
That is the arrangement asked for, and it is a real cost — flipping to React
changes a live component that may be above the fold. Recorded here rather than
silently rejected.

The tab labels are the filenames, so they are also the accessible names — the
seven e2e specs now select `Switch.tsx` rather than `React`. Expressive Code
still renders a `<figcaption class="header">`, but it is empty and
`display: none` without a `title`, so nothing stacks under the tabs, and its
copy button is untouched.

### What locks it

Three Playwright tests, each **verified by planting the defect** — the first two
by removing `not-content` and rebuilding, the third by restoring the `font`
shorthand:

| Test | Fixed | Defect planted |
|---|---|---|
| `is exempt from Starlight markdown margins` | `[]` | 18 elements with a non-zero `margin-top` |
| `centres the label on the track rather than below it` | < 1px | 8px off-centre |
| `the file tabs are set in the same face as the code below them` | `ui-monospace` | `monospace` — the prose fallback |

The first exists because `not-content` is invisible, does nothing locally, and
is exactly the kind of attribute a later tidy-up deletes. The second is the
user-visible symptom, asserted directly rather than through the class that
happens to fix it today.

`the framework toggle swaps panels and source together` was widened at the same
time: a tab named `Switch.tsx` that moves the live panel but leaves the source
showing Vue is lying about its own name, and the old test could not see it.

The third test earned its place immediately. The tabs were first written with
`font: var(--sl-font-mono, inherit)` — the `font` shorthand requires a size and
a family, and `--sl-font-mono` is a family list that Starlight leaves unset
unless a theme fills it in, so the declaration was dropped and the filenames
rendered in the prose face above a mono code block. Biome does not validate
Astro's scoped CSS that deeply and no test looked at the computed face. The rule
is now `font-family: var(--sl-font-mono, var(--sl-font-system-mono, monospace))`
— Starlight's own resolution order, through public properties rather than its
private `--__sl-font-mono`. The test compares against `pre > code`, not `pre`:
Expressive Code puts `--ec-codeFontFml` on the inner element and the `pre` keeps
the UA stylesheet's bare `monospace`. Only the first family is compared, because
`--__sl-font-mono` appends its own fallback list a second time.

Full suite green: **200 → 203 browser tests**, axe included.

### Defect 6 — one message below the control

Reported after the first five landed: the invalid message should *replace* the
description, not stack under it. A Field has one region of text below its
control, whatever that text turns out to be.

The first library change of this session, so unlike defects 1–5 it needs a
changeset. Spec written first, per `docs/01` §12 — `docs/03` §5 **decision 9**,
which also corrects decisions 1–3 where they implied both parts show at once.

The discriminating detail, and the reason this is not a two-line render change:
**`aria-describedby` had to move in the same edit.** `fieldDescribedBy` pushed
the description id whenever `hasDescription`, in a different file from the render
condition. Stop rendering the description without touching it and the control
describes itself with an element that is no longer in the document — the
dangling-idref class this component exists to prevent, invisible to everyone but
a screen-reader user. So both halves now read one resolver:

```ts
fieldMessage(state): 'error-text' | 'description' | undefined
```

`fieldShowsErrorText` is derived from it rather than restating its condition, so
it and the new `fieldShowsDescription` cannot both answer yes. A third kind of
message goes into that ordered list and nowhere else.

The **error** element is the one that stays mounted. That is forced, not chosen:
decision 3 requires the live region to be in the document before its content
changes, so the description is the part that can be unmounted.

Measured consequence, fixed in the same pass: an empty live region is
zero-height but still earns its share of the root's flex `gap`, so a valid field
carried **8px of dead space** below its message (root bottom 662.1, last text
bottom 654.1). Cancelled with `margin-block-start: calc(-1 * var(--kanso-space-2))`
on `:empty`. Not `display: none` — that would take the region out of the
accessibility tree and put it back in the same commit as its first message,
which is the announcement failure decision 3 exists to avoid.

**Noted tradeoff, recorded rather than glossed:** a description often carries
the rule the error is complaining about, and it now disappears while the user is
correcting it. `docs/03` §5 decision 9 says so, and so does the docs page.

Suite: **886 → 894 unit tests**, **203 → 207 browser tests**. The eight unit
tests that asserted the old both-at-once behaviour were rewritten rather than
deleted, and each now asserts the *absence* of the description id — "the error
id is present" passes on the broken version.

Both halves verified by planting the defect, as since Phase 1:

| Planted | Caught by |
|---|---|
| `fieldShowsDescription = state.hasDescription` | 7 tests: core's paired assertion, both adapters' part-order and describedby tests, **and both SSR suites** |
| the `:empty` margin rule deleted from `field.css` | the layout-gap test, both frameworks |

The SSR pair is the one worth noting: it means the server HTML changes shape
with the field's state, which is exactly what decision 1 requires and what a
render-time-only fix would have quietly broken.

### Defect 7 — the install instructions were an a11y defect

Reported as a docs-shape complaint: seven component pages each carried a
near-identical `## Installation` section. Five repeated the same `npm i` block;
Button and Card had a truncated version that omitted it entirely, so the
duplication was not even consistent. Consolidated into one page,
`getting-started/installation`, with npm/pnpm/yarn/bun in a synced Starlight
`<Tabs>` block and a per-component entry-point table. Component pages keep a
slim `## Import` — the entry points, which are the thing you actually copy while
reading that page — plus a link.

**What the consolidation exposed is the real find.** Every one of those seven
sections said:

```ts
import '@caioalfonso/kanso-styles/tokens';
import '@caioalfonso/kanso-styles/switch';
```

`base.css` holds the `:focus-visible` ring, the reduced-motion opt-out, and the
clipping that keeps `hidden-input` out of sight. No component sheet `@import`s
it. So the documented install produced a control with **no visible focus
indicator** — WCAG 2.4.7, in an accessibility library, in the instructions
themselves — and a stray visible checkbox on any form component with `name`.

It survived because the docs site imports the barrel (`astro.config.mjs`
`customCss: ['@caioalfonso/kanso-styles']` → `index.css`, which does `@import
'./base.css'`). Every preview on the site got `base` for free, so the previews
proved nothing about the instructions above them. Fixed in all seven pages, the
theming guide, `docs/02` §2, and `packages/styles/README.md` — the last of those
is published, hence the changeset on a docs-shaped change.

Also corrected here: `getting-started/introduction` still carried a
`:::caution[Not on npm yet]`, three commits after `0.0.1` shipped.

**One hypothesis tested and discarded**, recorded because the reasoning was
sound and the result was not: fences nested in `<Tabs>`/`<TabItem>` looked like
they would sit under an `mdxJsxFlowElement`, which `rehypeFocusableCodeBlocks`
skips (`if (child.type !== 'element') continue`). Widening the walk was written,
then measured against a build with the *original* walk — all 12 blocks already
carried `tabindex="0"`. The plugin was reverted unchanged. The test written for
it was kept, since the existing 360px measurement only ever sees the visible tab
panel: 7 of this page's 12 blocks are inside `<Tabs>` and 6 are hidden at any
moment, reporting zero scroll width and never being flagged.

Suite: **213 browser tests**, +6. `pnpm lint`, `pnpm typecheck` and
`pnpm --filter docs build` clean.

---

## Open questions / decisions pending
- [x] ~~Move CI publishing to npm **trusted publishing** (OIDC).~~ **Done
      2026-08-04, in the order the ordering constraint required:** `0.0.1`
      published by hand → trusted publishing configured for all four packages →
      `NPM_TOKEN` secret deleted → the token removed from `release.yml`'s env →
      the `RELEASE_ENABLED` guard removed. Secrets and variables both list empty
      now. CI holds no npm credential at all; `id-token: write` mints a
      short-lived one per run.

      The guard came out last on purpose. It existed to stop an unintended
      publish of an unclaimed version, and removing it while CI still held a
      working token is the single arrangement that could have done exactly that.
      It is safe to remove now for the reason `docs/05` §8 always gave: npm
      rejects republishing a version that exists, so `0.0.1` cannot be retaken.

      **One dependency worth remembering.** `changeset publish` shells out to
      pnpm, not npm, so this rests on pnpm's OIDC support — present in 10.x
      (pinned here at 10.30.3), regressed in 11.0.8
      ([pnpm/pnpm#11513](https://github.com/pnpm/pnpm/issues/11513)). Check that
      issue before bumping pnpm's major. The failure mode is safe either way: a
      broken exchange fails the publish rather than publishing the wrong thing.
- [ ] **The release pipeline has still never run end to end.** Every step above
      is configured but unexercised — the first merge to `main` with pending
      changesets will open a Version Packages PR, and merging *that* is the run
      that finally proves it. Seven changesets are pending, so the first CI
      release is `0.0.2`. Watch that run.
- [x] ~~`docs/01` §8 and `docs/03` §1 disagree on Switch's hidden input.~~
      Resolved at the top of Phase 1: `docs/03` won, `docs/01` §8 was amended,
      and `hidden-input` is now a named part. §8 also carried two other defects,
      both corrected there — an unconditional `aria-labelledby` that would dangle
      when only `aria-label` is given, and a `focusVisible` state field that
      cannot distinguish keyboard from pointer (CSS `:focus-visible` can).
- [ ] `vitest-axe` has no stable release; pinned to `1.0.0-pre.5`, which is what
      works with Vitest 3. If it goes stale, `jest-axe` is the fallback
      (`docs/04` §5 already permits it).
- [x] ~~All four packages ship `files: ["dist"]`, so the npm page would be
      blank.~~ Each package now has its own README and LICENSE; npm includes
      both regardless of `files`.
- [x] ~~Docs site domain undecided.~~ **Resolved 2026-08-06:**
      `kansoui.caioalfonso.dev`, a subdomain of the personal domain, registered
      through Cloudflare Registrar so the zone already sits in the same account
      as the Pages project.

      **Deliberately temporary.** A library whose docs live under the author's
      personal domain reads as a personal project, which is the impression
      `docs/00` §2 exists to avoid. A dedicated domain is the intended end
      state; the subdomain is what gets the site off `*.pages.dev` today at no
      extra cost. When the dedicated domain arrives, the four published package
      READMEs move again and that costs another release, so expect the churn
      rather than being surprised by it.

      The `*.pages.dev` URL keeps serving after a custom domain is attached, so
      nothing breaks during the switch. It does mean two hosts serve the same
      content, which is why `site:` in `docs/astro.config.mjs` matters: it is
      what emits the canonical URLs and the sitemap.
- [x] ~~Whether `ComponentPreview` reflects live knob state in the shown
      source.~~ It shows the real example file, read at build time with `?raw`
      so it cannot drift. Reflecting knob state would mean generating source,
      which is exactly how a "copy this" block starts lying.
- [x] ~~`ComponentPreview`'s framework toggle is a hand-rolled tablist.~~ It now
      drives `getRovingMove` / `getRovingIndex` from core. Not rebuilt on the Vue
      or React `Tabs` deliberately — see the Phase 2 entry above. Worth revisiting
      only if the toggle ever needs behaviour the core utilities do not cover.
- [x] ~~`docs/06` §4's information architecture names seven pages that do not
      exist: Installation, Quick start, Styling, and the three Reference pages
      (Design tokens, Data attributes, Changelog). Decide in Phase 6 whether
      they belong in `1.0.0`.~~ **Decided in Phase 6: not blocking `1.0.0`.**
      Five of the seven are already covered by pages that exist — installation
      is on each component page, styling and design tokens are the Theming
      guide, data attributes are each component's anatomy table. Quick start
      and Changelog are the two genuine gaps, and both are better written
      *after* a publish: a quick start that cannot be copy-pasted because the
      package is not on npm teaches nothing, and a changelog before the first
      release has no entries. `docs/06` §4 is the document that is out of date,
      not the site. Revisit once `0.0.1` is out.
- [ ] `astro.config.mjs` uses Astro 7's deprecated `markdown.rehypePlugins`,
      deliberately — it is the only registration that runs *after* Starlight's
      Expressive Code. Revisit when Astro removes the field, and verify the
      ordering with a build rather than by reading the config.
- [ ] The `/e2e/switch-form` fixture page ships publicly (noindex, unlinked). It
      exists because constraint validation needs a real form with a real
      stylesheet. Acceptable, but worth revisiting if fixtures multiply.
