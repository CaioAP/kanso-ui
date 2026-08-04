# Contributing

Thanks for looking. This is a small, deliberately-scoped library, and the
constraints below are what keep it that way — they are not bureaucracy, they are
the design.

## Getting set up

Node 24+ and pnpm. The version is pinned in `package.json`; `corepack enable`
will pick it up.

```bash
pnpm install
pnpm test
```

## The rules that matter

Four of these, if broken, quietly destroy the point of the project. CI enforces
all four, but knowing them up front saves a round trip.

**1. `packages/core` imports no framework.** Not `vue`, not `react`, not even as
a type-only import. All behaviour — state, keyboard, ARIA, focus — lives there in
plain TypeScript, and the adapters bind reactivity and render. If you find
yourself wanting a framework primitive in core, pass it in as an argument.
`pnpm core-purity` checks source *and* built output.

**2. Behaviour goes in core, never in an adapter.** A keyboard handler that
exists in `packages/vue` but not `packages/react` is a bug, not a shortcut.

**3. Ids come from the framework.** Core never generates one. React 19's
`useId()`, Vue 3.5's `useId()`. A counter or a random value in core produces
hydration mismatches, which is why every component has a server-render test in
both frameworks.

**4. Both adapters ship together.** A component is not done in Vue only. Done
means core + Vue + React + tests + a docs page.

## Tests

axe is a floor, not a ceiling. It cannot detect a broken arrow-key handler, a
focus trap that leaks, or a roving tabindex that strands the user — so keyboard
behaviour is tested explicitly, and anything involving real focus is tested in a
browser rather than jsdom, whose focus model is not trustworthy for it.

If you fix a bug, the test should fail before your fix and pass after. Where a
check is structural, the convention here is to **plant the defect** and confirm
the check catches it — several of the gates in this repo were found to be
passing vacuously that way.

## Before opening a pull request

```bash
pnpm lint
pnpm typecheck
pnpm core-purity    # no framework import in packages/core
pnpm contrast       # every token pair against its WCAG requirement
pnpm test
pnpm build
pnpm core-purity    # again, against dist — the source check cannot see inlining
pnpm package-lint   # publint + arethetypeswrong; catches a broken exports map
pnpm bundle-size    # needs the build; asserts no entry pulls in another
```

That is what CI runs, in that order, and it is why `core-purity` appears twice.
If you touched the docs site, add `pnpm --filter docs build` and
`pnpm --filter docs test:e2e`, which CI runs after these.

Do not check whether a gate passed by truncating its output — `pnpm lint | tail -2`
will happily hide the error. Read enough to see a verdict, or key off the exit
status.

**Any change under `packages/*` needs a changeset:**

```bash
pnpm changeset
```

Without one, the release drifts from reality. Describe what changed and why, not
just which files moved.

## Colour tokens

Contrast is measured, not eyeballed. `pnpm contrast` converts every token pair
from OKLCH to sRGB and fails on any pair below its WCAG requirement. If you add
a colour pair to a component, add it to the pair list in `scripts/contrast.mjs`
too — an unlisted pair is an unmeasured one.

## Scope

The v1 component set is fixed: Switch, Tabs, Dialog, Menu, Field, Button, Card.
More components, more adapters (Svelte, Solid), `asChild` polymorphic rendering
and Floating UI positioning are all deliberately deferred rather than forgotten —
see the "Deliberately deferred" section of `docs/07-roadmap.md`. An issue
proposing one of those is welcome; a pull request adding one will probably be
asked to wait.

## Documentation

`docs/*.md` at the repo root are the planning documents and the specification;
`docs/src/**` is the Starlight site. When a document and the code disagree, the
code is what ships — but update the document in the same commit so it never
rots.

## Licence

By contributing you agree that your contributions are MIT licensed, the same as
the project.
