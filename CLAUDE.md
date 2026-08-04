# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Project overview

**kanso-ui** — a headless, accessible component library. All behaviour (state, keyboard,
ARIA, focus management) lives once in a framework-agnostic **core**; **Vue 3** and
**React 19** are thin adapters that bind reactivity and render. An optional stylesheet
gives the "Kanso" look; the library is usable fully unstyled.

**Status: greenfield.** Nothing is implemented yet. `docs/` is the complete
specification — it was written before any code and is the source of truth until code
exists. Read `docs/07-roadmap.md` first to find the current phase.

The thesis, in one line: *the accessibility lives once, the frameworks are skins.*

This library is a portfolio piece for Caio Alfonso (https://caio-alfonso.pages.dev).
It must be genuinely good, not a demo — it publishes to npm and people can install it.

| Doc | Contents |
|---|---|
| `docs/00-project-spec.md` | Goals, non-goals, success criteria, quality floor |
| `docs/01-architecture.md` | **Core + adapter pattern, `connect`, `normalizeProps`, package layout** |
| `docs/02-design-system.md` | Kanso design language, OKLCH tokens, styling contract |
| `docs/03-component-specs.md` | Per-component anatomy, props, keyboard map, ARIA |
| `docs/04-testing-strategy.md` | What is tested where, and why axe is not enough |
| `docs/05-tooling-and-release.md` | pnpm, tsup, Biome, changesets, CI, npm, deploy |
| `docs/06-docs-site.md` | Starlight structure, `ComponentPreview`, embed routes |
| `docs/07-roadmap.md` | **Phases 0–6 with definitions of done — start here** |
| `docs/08-portfolio-integration.md` | Linking this back into the portfolio site |
| `docs/09-progress-checklist.md` | **Living state — update as items land** |

## Locked decisions

Do not relitigate these without the user's explicit say-so. Each was decided
deliberately; the reasoning is in the linked doc.

- **Architecture:** framework-agnostic core + per-framework adapters (Zag.js/Ariakit
  model). Core exports `connect()` returning neutral prop bags; adapters supply
  `normalizeProps`. See `docs/01`.
- **Frameworks:** Vue 3 and React 19. Both, from one core. This is the whole point —
  do not collapse to one.
- **Styling:** headless by default, **optional** opt-in stylesheet. Components expose
  `data-part` / `data-state` attributes; the stylesheet targets those. No class-name
  coupling, no CSS-in-JS, no Tailwind dependency in the packages.
- **Tokens:** kanso-ui ships its own *neutral* OKLCH palette, retheme-able via CSS
  custom properties. It does **not** ship the portfolio's Yohaku/vermilion brand —
  that would make it un-adoptable by anyone else.
- **Docs site:** Astro Starlight, themed. Not Storybook (heavy, off-brand), not
  VitePress (Vue-only — we need Vue *and* React islands on one page).
- **Playground:** live component + prop knobs + static Shiki source + copy button.
  **No in-browser REPL** (Sandpack/esbuild-wasm) — heavy and off-brand.
- **Package manager:** pnpm workspaces.
- **Lint/format:** Biome owns the whole repo. No ESLint, no Prettier.
- **TypeScript:** strict everywhere.
- **npm scope:** `@caioalfonso/*`. See "npm identity" below.
- **Hosting:** Cloudflare **Pages** for the docs site. Never add an SSR adapter.
- **License:** MIT.

## Commands

```bash
pnpm install
pnpm build          # build all packages (tsup; styles just copies CSS)
pnpm typecheck      # tsc --noEmit over the whole workspace
pnpm lint           # biome check .
pnpm lint:fix       # biome check --write .
pnpm test           # vitest run (core + both adapters)
pnpm test:a11y      # the adapter projects, where the axe assertions live
pnpm core-purity    # assert packages/core imports no framework — the thesis
pnpm contrast       # measure every token pair against its WCAG requirement
pnpm package-lint   # publint + arethetypeswrong on each package
pnpm bundle-size    # size per entry + assert no entry pulls in another (build first)
pnpm changeset      # record a version bump — required on any package change

pnpm --filter docs dev     # Starlight dev server
pnpm --filter docs build
pnpm --filter docs test:e2e  # Playwright + axe against the docs site (Phase 1)
```

**Never check whether a gate passed by truncating its output.** `pnpm lint | tail -2`
will happily hide the error and show you blank lines. Read enough output to see a
verdict, or key off the exit status. (This rule exists because it already cost a
broken build on the sibling portfolio repo.)

## Non-negotiable rules

These are the rules that, if broken, quietly destroy the project's premise.

1. **`packages/core` must never import `vue` or `react`** — not even as a type-only
   import. This is the entire thesis. CI enforces it with a dependency check
   (`docs/05` §6). If you find yourself wanting a framework primitive in core,
   the answer is to pass it in as an argument.
2. **Behaviour goes in core, never in an adapter.** If a keyboard handler exists in
   `packages/vue` but not `packages/react`, that is a bug, not a shortcut. Adapters
   contain reactivity binding and rendering only.
3. **IDs come from the framework, never from core.** Core accepts ids as input.
   React 19 `useId()`, Vue 3.5+ `useId()`. A core-generated counter or random id
   produces SSR/hydration mismatches — see "Traps" below.
4. **Every interactive component ships keyboard tests.** axe cannot detect a broken
   arrow-key handler or a focus trap that leaks. Automated a11y scanning is a floor,
   not a ceiling. See `docs/04`.
5. **Both adapters ship together.** A component is not "done" in Vue only. The
   definition of done in `docs/07` requires core + Vue + React + tests + docs page.
6. **Any change to `packages/*` needs a changeset**, or the release will silently
   drift from reality.

## Traps — read before writing code

These are the failure modes specific to this architecture. They are cheap to avoid
up front and expensive to discover later.

- **SSR id mismatch.** The single most common headless-library bug. Core must not
  generate ids. Adapters pass framework-stable ids in. Phase 1 includes an explicit
  server-render test in both frameworks to lock this down.
- **`normalizeProps` is not identity for either adapter.** React takes
  `className` / `htmlFor`; Vue takes `class` / `for` but needs event handler
  names folded to `on` + capital + lowercase tail — `onKeyDown` → `onKeydown`.
  Core emits React's camelCase form because `KeyDown → keydown` is mechanical
  while the reverse is not. **Do not lowercase the whole name.** `onkeydown`
  fails Vue's `/^on[^a-z]/` event test, so Vue assigns it as the `el.onkeydown`
  DOM property instead — which works on a fresh mount and is silently dropped on
  hydration, leaving a server-rendered component inert. Every failure mode here
  is silent, and only the SSR test catches that last one. See `docs/01` §4.
- **`peerDependencies`, not `dependencies`.** `vue` and `react` must be peers in the
  adapter packages, or consumers get a second copy of the framework and hooks break
  in ways that are miserable to debug.
- **The `exports` map is the most common publish bug.** A package that works in the
  monorepo and explodes on `npm install` almost always has a wrong `exports` /
  `types` field. Phase 1 includes `publint` + `arethetypeswrong` in CI.
- **Focus trap vs. `inert`.** Prefer the `inert` attribute on background content over
  manual tab-cycling where support allows; keep a tab-cycle fallback. Test with a
  real browser (Playwright), not jsdom — jsdom's focus model is not trustworthy for
  trap verification.
- **Starlight needs both integrations.** Mounting a Vue island and a React island on
  the same docs page requires `@astrojs/vue` *and* `@astrojs/react` registered. They
  coexist fine; the failure is forgetting one and getting a cryptic build error.
- **Contrast is measured, and stays measured.** `pnpm contrast` parses
  `packages/styles/src/tokens.css`, converts OKLCh → sRGB → WCAG luminance, and
  fails on any pair below its requirement. It runs in CI. If you change a colour
  token, run it. Do not add a colour pair to a component without adding it to the
  pair list in `scripts/contrast.mjs`.

## npm identity

Packages publish under the scope **`@caioalfonso`**:

```
@caioalfonso/kanso-core     framework-agnostic behaviour
@caioalfonso/kanso-vue      Vue 3 adapter
@caioalfonso/kanso-react    React 19 adapter
@caioalfonso/kanso-styles   optional stylesheet + tokens
```

**Unresolved at time of writing:** the account did not exist yet, and npm's user
endpoint requires auth, so availability could not be verified — a scope search
returned zero published packages, which is a good sign but not proof. The user runs
`npm adduser` and confirms. If `caioalfonso` is taken, ask the user for the fallback
scope before renaming anything; do not guess.

Note the unscoped names `kanso-ui` and `kanso` are **already taken on npm by other
people**. The repo, docs site and GitHub project are still called kanso-ui; only the
npm identifier is scoped. Do not try to publish unscoped.

## Repository structure

```
kanso-ui/
├─ packages/
│  ├─ core/          @caioalfonso/kanso-core    — zero framework deps
│  ├─ vue/           @caioalfonso/kanso-vue     — peerDep vue ^3
│  ├─ react/         @caioalfonso/kanso-react   — peerDep react ^19
│  └─ styles/        @caioalfonso/kanso-styles  — optional CSS + tokens
├─ docs/             Astro Starlight site (also holds the planning docs below)
├─ .changeset/
├─ .github/workflows/ci.yml
├─ biome.json
├─ pnpm-workspace.yaml
└─ vitest.workspace.ts
```

Note `docs/` serves double duty: the numbered planning documents live at its root,
and the Starlight site is created inside it during Phase 5. Keep them separate —
`docs/*.md` is planning, `docs/src/**` is the site.

## Component scope (v1)

In dependency order, **not** the order they were originally listed. Later components
reuse utilities built by earlier ones, so this order is load-bearing:

**Switch → Tabs → Dialog → Menu → Inputs → Button → Card**

Full specs in `docs/03`. Button and Card are largely presentational and intentionally
have a thin or absent core — do not over-engineer them to fit the pattern.

## Working style

- The user is an experienced frontend engineer. Be direct, skip preamble.
- Prefer finishing one component through every layer over starting three.
  Phase 1's whole purpose is de-risking; respect it.
- When a doc and the code disagree, the code is what ships — but update the doc in
  the same commit so it never rots.
- Update `docs/09-progress-checklist.md` as items land. It is the fast way for a new
  session to learn where things stand.
