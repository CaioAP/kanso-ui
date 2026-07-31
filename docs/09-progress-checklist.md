# 09 — Progress checklist

Living status doc. **Update it as items land** — it is the fastest way for a new
session to learn where things stand.

**Status: Phase 5 built — all seven v1 components exist. Nothing published yet.**
Switch, Tabs, Dialog, Menu, Field (with Input and Textarea), Button and Card are
in core, Vue and React, with 886 unit tests and 171 browser tests green, docs
pages, and seven embed routes live.

The component list from `docs/00` is complete. What remains before `1.0.0` is
Phase 5.1 (docs polish) and Phase 6 (API review, bundle size, the semver
promise).

**Publishing is still the one human decision.** `main` carries `0.0.1` in every
`package.json` but nothing has been pushed to npm, and nothing will until someone
sets `RELEASE_ENABLED` deliberately — see "Human tasks".

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
- [x] `NPM_TOKEN` replaced with a granular access token carrying **Bypass 2FA**
      (npm retired the "automation" type). Set 2026-07-30.
- [ ] Set the `RELEASE_ENABLED` repository variable to `true`. **This is the
      remaining Phase 1 step.** Doing so publishes `0.0.1` on the next merge to
      `main`, which is irreversible — npm never allows reusing a version number.
      Everything else is ready: the changeset is written, the packages build
      clean, and `publint`/`attw` pass.
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
- [ ] **Published `0.0.1`** — needs `RELEASE_ENABLED`, a human decision
- [x] External install verified from a clean directory — real `pnpm pack`
      tarballs installed with plain `npm` into a project outside the workspace,
      so nothing could resolve through the monorepo. Barrel *and* `./switch`
      subpath entries imported and server-rendered in both frameworks; types
      resolve under both `bundler` and `node16`. The only thing left unproven is
      the registry round-trip itself.
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
- [ ] Docs site domain — `kanso-ui.pages.dev` by default, custom domain undecided
- [x] ~~Whether `ComponentPreview` reflects live knob state in the shown
      source.~~ It shows the real example file, read at build time with `?raw`
      so it cannot drift. Reflecting knob state would mean generating source,
      which is exactly how a "copy this" block starts lying.
- [x] ~~`ComponentPreview`'s framework toggle is a hand-rolled tablist.~~ It now
      drives `getRovingMove` / `getRovingIndex` from core. Not rebuilt on the Vue
      or React `Tabs` deliberately — see the Phase 2 entry above. Worth revisiting
      only if the toggle ever needs behaviour the core utilities do not cover.
- [ ] The `/e2e/switch-form` fixture page ships publicly (noindex, unlinked). It
      exists because constraint validation needs a real form with a real
      stylesheet. Acceptable, but worth revisiting if fixtures multiply.
