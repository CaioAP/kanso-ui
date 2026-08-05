# 06 — Docs site

## 1. Purpose

The docs site has two jobs and must do both:

1. **Teach.** Someone installs the library and succeeds without reading source.
2. **Demonstrate.** The site is itself a portfolio piece — it is the visible proof
   of the Kanso design sensibility.

Job 2 is why it is themed rather than left as stock Starlight, and why the live
examples show Vue **and** React side by side: that pairing is the whole thesis
made visible in one screenshot.

## 2. Stack

**Astro Starlight**, with `@astrojs/vue` and `@astrojs/react` both registered so
one page can mount islands from either framework.

Chosen over:
- **Storybook** — heavy, slow, and its chrome would dominate the design.
- **VitePress** — excellent, but Vue-only. We need both frameworks live.
- **A fully custom Astro site** — total control, but weeks spent rebuilding nav,
  search and MDX plumbing. Starlight gives those free and is themeable enough.

Trade-off accepted: Starlight has recognisable chrome. Theming effort in Phase 5.1
is what makes it feel like kanso-ui rather than like every other docs site.

## 3. Location

```
docs/
├─ 0*.md              ← these planning documents (repo root of docs/)
├─ astro.config.mjs
├─ package.json
├─ src/
│  ├─ content/docs/   ← MDX pages, the actual site content
│  ├─ components/     ← ComponentPreview, PropsTable, KeyboardTable, ThemeToggle
│  ├─ examples/       ← live demo sources, per component, per framework
│  ├─ pages/embed/    ← minimal-chrome routes for portfolio embedding
│  └─ styles/
└─ tests/e2e/
```

Keep the planning docs and the site source clearly separated: `docs/*.md` is
planning, `docs/src/**` is the site. Do not publish the planning docs to the site.

## 4. Information architecture

```
Getting started
  ├─ Introduction        what headless means, why core+adapters, the tradeoff
  ├─ Installation        npm/pnpm/yarn/bun in tabs · per-component entry points
  ├─ Quick start         a working Switch in under a minute
  └─ Styling             headless usage · optional stylesheet · theming with tokens

Guides
  ├─ Accessibility       what is guaranteed, how it is tested, what is still on you
  ├─ Architecture        core + adapters, with the diagram from docs/01
  ├─ Theming             token reference, worked example: retheming to a brand
  └─ SSR                 id stability, hydration, Astro/Nuxt/Next notes

Components
  └─ one page per component

Reference
  ├─ Design tokens       the full table
  ├─ Data attributes     data-part / data-state per component
  └─ Changelog
```

The **Accessibility** guide is the highest-value page on the site and should be
written with real care. Say what is guaranteed (APG conformance, keyboard, focus),
how it is verified (link to the test strategy), and — importantly — **what is still
the consumer's responsibility** (accessible names, colour contrast if they retheme,
sensible content order). Honesty about limits is more convincing than a blanket
claim.

## 5. Component page template

Every component page has the same sections, in this order:

1. **One-line description** and when to use it — plus when *not* to
   (e.g. Switch vs Checkbox).
2. **Live example** — the `ComponentPreview` (below).
3. **Import** — the per-component entry points and nothing else. Package
   installation is *not* repeated here; it lives once on the Installation page,
   which every component page links to. Seven copies of `npm i` is seven places
   for the instructions to drift.
4. **Anatomy** — the parts, from `anatomy.ts`, with a labelled diagram.
5. **Props table** — generated where possible, hand-written where not.
6. **Keyboard table** — copied verbatim from `docs/03`. Non-negotiable on every
   interactive component; it is the most useful thing on the page.
7. **Accessibility notes** — roles, ARIA, and the specific traps this component has.
8. **Examples** — controlled, disabled, and any component-specific variants.
9. **APG link.**

## 6. `ComponentPreview` — the playground

The CodePen feeling, without a bundler in the browser. Four parts:

```
┌──────────────────────────────────────────┐
│                               [ ☾ ]      │  theme toggle
├──────────────────────────────────────────┤
│                                          │
│            live component                │
│                                          │
├──────────────────────────────────────────┤
│  disabled  ☐    checked  ☑   size ▾      │  prop knobs
├──────────────────────────────────────────┤
│ ┌Switch.vue┐ Switch.tsx                  │  framework toggle = file tabs
├─┴──────────┴─────────────────────────────┤
│  <Switch checked />              [copy]  │  source, Shiki-highlighted
└──────────────────────────────────────────┘
```

- **Framework toggle** swaps between the Vue island and the React island of the
  same example. Both are rendered; toggling shows/hides. This is the single most
  important interaction on the site — it is the thesis, demonstrated.

  It is rendered as the **file tabs on the source block** — `Switch.vue` and
  `Switch.tsx` — not as a separate Vue/React control above the preview. The
  earlier arrangement had two pieces of chrome naming the same thing: a
  Vue/React tablist in the top bar, and Expressive Code's own frame title
  reading `Switch.vue` immediately below it. One tab now owns both regions,
  which `aria-controls` supports as a space-separated idref list, and the
  `<Code>` blocks pass no `title` so no second filename is rendered.

  The cost, accepted knowingly: the switcher sits *below* the preview it
  controls. See `docs/09` Phase 5.2.
- **Prop knobs** are declarative: each example declares its controls, and the
  preview renders checkboxes/selects and passes values through.
- **Source** is the real example file, read at build time and highlighted with
  Shiki. Never a hand-maintained copy — it will drift. Reflect the knob state in
  the shown source where practical.
- **Copy button** with a live-region confirmation.
- **Theme toggle** flips `data-theme` on the preview only, so light and dark can be
  compared without changing the page.

**No editable REPL.** Sandpack / esbuild-wasm is a large dependency, slow, and
visually at odds with the design. Explicitly out of scope.

`ComponentPreview` itself must be accessible: the framework toggle is a real Tabs
pattern (dogfood the library once Tabs exists — a nice milestone), knobs are real
labelled form controls, and the code block is keyboard-scrollable.

## 7. Embed routes

`/embed/<component>` renders a single component with no nav, no sidebar, no
footer — just the demo, on a transparent background, honouring a `?theme=dark`
query parameter.

Used by the portfolio playground via an iframe (`docs/08`). The reason for a
dedicated route rather than iframing the full docs page is that it decouples the
portfolio from the docs layout, keeps the payload tiny, and lets the embed
inherit the host's theme.

Set `X-Frame-Options`/CSP `frame-ancestors` to allow the portfolio origin.

## 8. Performance and a11y floor

The docs site holds the same bar as the library:

- Lighthouse ≥ 95 on all four categories.
- Zero axe violations on every page — enforced in Playwright.
- Islands hydrate individually; prose pages ship no framework JS.
- Fonts self-hosted and subsetted, no CDN at runtime.
- Static output, no SSR adapter (see `docs/05` §10).

## 9. Theming Starlight

Starlight exposes CSS custom properties and component overrides. The plan:

1. Map Starlight's `--sl-color-*` onto the kanso tokens so the chrome inherits the
   palette automatically.
2. Override the components that carry the most visual identity: header, sidebar,
   page title. Starlight supports per-component overrides — use them sparingly.
3. Set type scale and spacing to match the design system.
4. Square off Starlight's default radii to `--kanso-radius`.

Resist rewriting Starlight's layout. The value is in the tokens, type and spacing;
fighting the framework's structure costs weeks and returns little.
