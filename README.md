# kanso-ui

Headless, accessible components for **Vue 3** and **React 19**, built on one
framework-agnostic core.

> *Kanso* (簡素) — simplicity through the elimination of clutter.

**Status: Phase 0 — foundations.** The workspace, build, test and CI rails are in
place; no components are implemented yet. Switch lands in Phase 1. See
[`docs/07-roadmap.md`](docs/07-roadmap.md) for the build plan and
[`docs/09-progress-checklist.md`](docs/09-progress-checklist.md) for current state.

## The idea

All behaviour — state, keyboard handling, ARIA, focus management — lives once in a
plain-TypeScript core. Vue and React are thin adapters that bind reactivity and
render.

```
        ┌──────────────────┐
        │   kanso-core     │   state · keyboard · ARIA · focus
        └────────┬─────────┘
        ┌────────┴─────────┐
        ▼                  ▼
  ┌───────────┐      ┌───────────┐
  │ kanso-vue │      │kanso-react│   reactivity + render only
  └───────────┘      └───────────┘
```

The accessibility is written once. The frameworks are skins.

## Planned packages

| Package | Purpose |
|---|---|
| `@caioalfonso/kanso-core` | Framework-agnostic behaviour. Zero dependencies. |
| `@caioalfonso/kanso-vue` | Vue 3 adapter |
| `@caioalfonso/kanso-react` | React 19 adapter |
| `@caioalfonso/kanso-styles` | Optional stylesheet + design tokens |

## Components (v1)

Switch · Tabs · Dialog · Menu · Inputs · Button · Card

Each conforms to its [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/)
pattern, with the full keyboard map tested in both frameworks.

## Principles

- **Headless by default.** The stylesheet is opt-in. Components expose
  `data-part` / `data-state`; style them however you like.
- **No fonts, no imposed typography.** Components inherit from your app.
- **Native elements first.** A `<button>` before a `role="button"`.
- **Keyboard tests, not just axe.** Automated scanning cannot detect a broken
  arrow-key handler or a leaking focus trap. Both are tested explicitly.
- **SSR-safe.** IDs come from the framework, never generated in core.

## Documentation

| Doc | Contents |
|---|---|
| [`docs/00-project-spec.md`](docs/00-project-spec.md) | Goals, non-goals, quality floor |
| [`docs/01-architecture.md`](docs/01-architecture.md) | Core + adapter pattern, `normalizeProps` |
| [`docs/02-design-system.md`](docs/02-design-system.md) | Kanso design language, tokens |
| [`docs/03-component-specs.md`](docs/03-component-specs.md) | Per-component anatomy, ARIA, keyboard |
| [`docs/04-testing-strategy.md`](docs/04-testing-strategy.md) | What is tested, where, and why |
| [`docs/05-tooling-and-release.md`](docs/05-tooling-and-release.md) | Build, CI, npm, deploy |
| [`docs/06-docs-site.md`](docs/06-docs-site.md) | Starlight structure, playground |
| [`docs/07-roadmap.md`](docs/07-roadmap.md) | Phases 0–6 |
| [`docs/08-portfolio-integration.md`](docs/08-portfolio-integration.md) | Linking from the portfolio |
| [`docs/09-progress-checklist.md`](docs/09-progress-checklist.md) | Living state |

## Prior art

The core/adapter split follows [Zag.js](https://zagjs.com), with influences from
[Ariakit](https://ariakit.org) and [Radix](https://radix-ui.com). The pattern is
well-trodden; the contribution here is a small, carefully-specified set with
first-class Vue support, which the ecosystem is genuinely thinner on.

## Licence

MIT © Caio Alfonso
