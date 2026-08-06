# 08 — Portfolio integration

How kanso-ui surfaces on **https://caio-alfonso.pages.dev**.

Sibling repo: `/home/caio/Projects/caio-alfonso`. Read its `CLAUDE.md` before
touching it — it has its own locked decisions and traps.

## 1. Principle: link, don't merge

kanso-ui stays a separate repo with its own deploy. The portfolio **links** to it
and embeds a small live taste. It does not vendor the source or take a build
dependency on the packages.

Why:
- The portfolio's content pages ship **0 KB of JS**. A library workspace inside it
  would compromise that discipline.
- Release cadences differ — the blog publishes from a CMS webhook, the library
  publishes on semver.
- The docs site is the library's natural home. The portfolio is a shop window.

## 2. Two surfaces

**a. A `project` document** in Sanity — fills `/work`, which is currently empty.

**b. A playground entry** — a live demo iframed from the docs site's embed route.

## 3. The Sanity `project` document

Schema is at `studio/schemas/project.ts` in the portfolio repo. Authored in the
Studio (https://caio-alfonso.sanity.studio) — **no code change needed**. Publishing
fires the webhook that rebuilds Pages.

| Field | Value |
|---|---|
| `title` | kanso-ui |
| `slug` | `kanso-ui` |
| `role` | Author |
| `period` | e.g. `2026 —` |
| `stack` | TypeScript · Vue 3 · React 19 · pnpm · tsup · Vitest · Playwright · Astro Starlight |
| `summary` | One paragraph: headless accessible components, one core, two frameworks. |
| `body` | Portable Text — the architecture story, the a11y approach, what was hard. |
| `links` | `Docs` → docs site · `npm` → package page · `Source` → GitHub |
| `cover` | Screenshot of the docs site or a component. **`alt` is required** — the build fails without it (Zod-enforced). |
| `featured` | `true` — surfaces it on the home page |
| `order` | `1` |

Write the `summary` for a skimmer and the `body` for someone genuinely curious.
Per `docs/05` of the portfolio repo, a project is done when it has a summary, stack,
at least one link, a cover, and a short outcome line.

**Outcome line** — only write it once it is true. Something in the shape of:
*"Seven components, WAI-ARIA APG conformant, published to npm, zero axe violations
across the docs site."*

## 4. The playground entry

> **Built, and demoted.** `KansoEmbed.vue` and its registry entry shipped in the
> portfolio repo on 2026-08-06. But the embed is **not** a requirement for this
> integration to be complete, and `docs/00` §6 was amended to say so. The project
> document links to the docs site, npm and GitHub; anyone evaluating the work
> follows one of those, and each shows the components better than an iframe does.
> Keep the embed while it costs nothing. Do not treat it as load-bearing, and do
> not rebuild it if it is ever removed.
>
> One thing it did surface, which was worth the trip: the portfolio was building
> from Sanity's `raw` perspective, so unpublished drafts were being rendered into
> production. Found by creating this project's own draft and seeing it in `dist`.
> Fixed with `perspective: 'published'`.

The portfolio's playground is open/closed by design: one folder plus one registry
entry in `src/features/playground/_registry.ts`.

The registry's `load` returns a component, so the embed is a tiny Vue component
wrapping an iframe:

```ts
// src/features/playground/kanso-ui/KansoEmbed.vue — renders the iframe
{
  id: 'kanso-ui',
  title: 'kanso-ui — headless components',
  description: 'One accessible core, rendered by Vue and React.',
  framework: 'Vue ↔ React',
  howBuilt:
    'The behaviour — state, keyboard, ARIA, focus — lives in a framework-agnostic '
    + 'TypeScript core that returns neutral prop bags. Vue and React adapters supply '
    + 'a normalizeProps translator and render; neither contains a keyboard handler. '
    + 'Flip the framework toggle: same core, different renderer.',
  load: () => import('./kanso-ui/KansoEmbed.vue'),
}
```

Note `framework: 'Vue ↔ React'` is already a permitted value in the registry's
`Demo` interface — it exists for exactly this case.

The component itself:

```vue
<iframe
  :src="`https://<docs-domain>/embed/switch?theme=${theme}`"
  title="kanso-ui Switch component demo"
  loading="lazy"
  height="320"
/>
```

**Why an iframe rather than importing the package:**

- No version coupling — the portfolio never needs a rebuild when the library ships.
- No duplicate Vue/React in the portfolio's bundle.
- The embed page is maintained alongside the component it demonstrates, so it
  cannot drift.

**Requirements:**

- Pass the host's `data-theme` through as `?theme=` so the embed matches the
  portfolio's light/dark state, and update it when the theme toggles.
- Give the `<iframe>` a `title` — an untitled iframe is an axe violation, and the
  portfolio runs axe in CI.
- `loading="lazy"`, explicit height to avoid layout shift.
- The docs site must allow the portfolio origin in `frame-ancestors`.
- Playground pages already ship JS, so an island here costs nothing on content pages.

## 5. Theming the embed — the demo that proves the API

The embed is the natural place to show the theming API working: pass the
portfolio's **Yohaku** tokens (vermilion `--shu`, its neutrals) into the embed and
let kanso-ui adopt them by overriding `--kanso-*` custom properties.

This is worth doing deliberately rather than shipping the default indigo. A
component library visibly wearing someone else's brand is the most convincing
possible demonstration that the theming contract is real. Cross-reference it from
the docs site's theming guide (`docs/06` §4) as the worked example.

## 6. Blog post

The architecture is genuinely worth writing up, and the portfolio is a daily
frontend blog with a topic backlog. Suggested angle, once Phase 6 lands:

> **One accessible core, two frameworks** — why the keyboard handling should be
> written once, what `normalizeProps` actually does, and the SSR id trap that
> breaks every naive implementation.

Post bodies support code blocks (Shiki, build-time highlighted) and inline images
with required alt text.

## 7. Prior art already in the portfolio

The portfolio's **Command Palette** demo already implements a focus trap,
`aria-activedescendant`, focus restoration, and a combobox contract. When building
Dialog (Phase 3) and Menu (Phase 4), read it first — the problems were solved once
already, and consistency between the two codebases is a small free win.

## 8. Order of operations

Do not create the project document before Phase 1 publishes. A `/work` entry
pointing at a library nobody can install is worse than an empty `/work`.

1. Phase 1 completes — package published, docs deployed.
2. Create the Sanity `project` document, publish → webhook rebuilds the portfolio.
3. Add the playground entry + embed component, push.
4. Tick the portfolio's own `docs/06-progress-checklist.md`, which currently flags
   the empty `/work` as an open gap.
