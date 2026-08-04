# 05 — Tooling and release

## 1. Toolchain

| Concern | Choice | Why |
|---|---|---|
| Package manager | **pnpm** workspaces | Strict node_modules prevents phantom deps — critical when core must have zero framework deps |
| Bundler | **tsup** (esbuild) | Minimal config, ESM + `.d.ts`, fast |
| Types | **TypeScript strict** | |
| Lint + format | **Biome** | One tool, whole repo. No ESLint, no Prettier |
| Tests | **Vitest** (workspace) | |
| Browser tests | **Playwright** | |
| Versioning | **changesets** | Monorepo-aware, generates changelogs |
| Docs | **Astro Starlight** | See `docs/06` |
| CI | **GitHub Actions** | |
| Docs hosting | **Cloudflare Pages** | |

pnpm's strictness is a feature here, not a preference: it makes "core accidentally
resolves `react` through a hoisted node_modules" impossible.

## 2. Workspace setup

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'docs'
```

Root `package.json` scripts fan out with `pnpm -r` / `--filter`:

```jsonc
{
  "private": true,
  "scripts": {
    "build":        "pnpm -r --filter './packages/*' build",
    "typecheck":    "tsc --noEmit",
    "lint":         "biome check .",
    "lint:fix":     "biome check --write .",
    "test":         "vitest run",
    "core-purity":  "node scripts/core-purity.mjs",
    "contrast":     "node scripts/contrast.mjs",
    "package-lint": "pnpm -r --filter './packages/*' package-lint",
    "changeset":    "changeset",
    "release":      "pnpm build && changeset publish"
  }
}
```

**Typecheck is one flat program, not TypeScript project references.** A single
root `tsconfig.json` includes every package's `src` and maps siblings with
`paths`, so `@caioalfonso/kanso-core` resolves to core's *source* during
development. Project references would need core's `.d.ts` to exist at the path
its `exports` map advertises — which is `dist/`, which tsup owns and cleans — so
references would make typechecking depend on build order for no benefit at this
size. Whether the *published* entry points resolve is a separate question,
answered by `publint` / `arethetypeswrong` and the clean-directory install check
in Phase 1.

The Vitest config mirrors that mapping with a `resolve.alias`, so tests run
against core's source too.

## 3. Package build (tsup)

Every package uses the same shape. One entry per component enables tree-shaking:

```ts
// packages/react/tsup.config.ts
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    switch: 'src/switch/index.ts',
    tabs: 'src/tabs/index.ts',
    // one per component
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'vue', '@caioalfonso/kanso-core'],
})
```

**ESM only.** No CJS build. Vue 3 and React 19 era tooling handles ESM; shipping
dual formats doubles the surface area and creates the dual-package hazard. Document
the decision on the docs site so nobody files it as a bug.

`external` must list peers and workspace siblings, or they get inlined into the
bundle — a subtle bug that produces duplicate React copies at runtime.

### The `exports` map

The most common publish bug in the ecosystem. Get it right once, then copy:

```jsonc
{
  "type": "module",
  "sideEffects": false,
  "files": ["dist"],
  "exports": {
    ".":        { "types": "./dist/index.d.ts",  "import": "./dist/index.js" },
    "./switch": { "types": "./dist/switch.d.ts", "import": "./dist/switch.js" },
    "./package.json": "./package.json"
  }
}
```

`types` must come **first** in each condition object. `sideEffects: false` is what
lets bundlers drop unused components — verify it works rather than assuming.

CI runs `publint` and `arethetypeswrong` against the built tarball, so a broken
`exports` map fails the build instead of shipping.

`attw` runs with `--profile esm-only`. That suppresses exactly two findings, both
of which are the ESM-only decision working as intended rather than defects: the
`node10` resolver has no `exports` support at all, and `require()` of an ESM file
is an error for CJS consumers. Every resolution mode this library actually
targets — `node16` from ESM, and bundlers — is still checked and must be green.

## 4. The styles package

Plain CSS, no build step beyond copying and minifying:

```
packages/styles/
├─ src/
│  ├─ tokens.css        the :root custom properties
│  ├─ base.css          focus ring, reduced motion, shared primitives
│  ├─ switch.css
│  └─ ...
├─ src/index.css        @import of everything
└─ package.json
```

```jsonc
"exports": {
  ".":         "./dist/index.css",
  "./tokens":  "./dist/tokens.css",
  "./switch":  "./dist/switch.css"
}
```

Consumers import all, or tokens plus a subset. Use Lightning CSS for minification
if a step is wanted; plain file copy is acceptable for v1.

## 5. Biome

One `biome.json` at the root covering packages and docs. Match the sibling
portfolio repo's settings so the two feel like one hand wrote them.

Ignore `dist/`, `.astro/`, `node_modules/`.

## 6. Enforcing the core-purity rule

The project's central invariant — `packages/core` imports no framework — must be
mechanical, not a matter of discipline.

Three layers:

1. **package.json** — `core` has no `dependencies` and no `peerDependencies`.
2. **A specifier scan** — `scripts/core-purity.mjs`, run as `pnpm core-purity`.
   A bare `grep "from 'vue'"` is too narrow: it misses side-effect imports
   (`import 'vue'`), dynamic `import('vue')` and `require()`. The script extracts
   every module specifier instead and rejects `vue`, `@vue/*`, `react`,
   `react-dom` and — because core must stay runtime-agnostic — anything
   `node:`-prefixed. A type-only import counts as a violation: the bytes vanish,
   but the design has already leaked.

3. **A bundle assertion** — the same script scans `packages/core/dist` when it
   exists, so CI runs it once before the build and once after. pnpm's strict
   resolution makes an accidental import fail to resolve locally too, which is
   the fastest feedback of all.

Run all three. This invariant is the whole thesis; protect it accordingly.

**Verify the gate by breaking it on purpose.** Plant a framework import in
`packages/core/src`, confirm a non-zero exit, remove it. A check nobody has
watched fail is not a check. (Done in Phase 0; the probe caught all three import
forms.)

## 7. CI

`.github/workflows/ci.yml`, on push and PR:

```
setup (pnpm, node 24, cache)
  → lint         biome check .
  → typecheck    tsc --noEmit
  → core-purity  specifier scan over src
  → contrast     token ratios measured from tokens.css
  → test         vitest run
  → build        all packages
  → core-purity  specifier scan over dist
  → package-lint publint + arethetypeswrong
  → docs build   astro build
  → e2e          playwright + axe        (added in Phase 1)
```

Every step carries `if: ${{ !cancelled() }}`, so one run surfaces every problem
rather than one problem at a time. The steps are cheap and the alternative —
fixing a lint error, pushing, then discovering a test failure — costs more than
it saves.

Playwright browsers are cached and installed with `--with-deps`.

## 8. Release with changesets

Flow:

1. Any PR touching `packages/*` includes a changeset: `pnpm changeset` → pick
   packages, pick bump, write a human-readable summary. That summary becomes the
   changelog entry, so write it for a consumer, not for yourself.
2. Merging to `main` makes the changesets action open a **"Version Packages"** PR
   that applies bumps, updates changelogs, and rewrites `workspace:^` to real ranges.
3. Merging *that* PR publishes to npm.

```yaml
# .github/workflows/release.yml
permissions:
  id-token: write          # mints the OIDC credential; there is no NPM_TOKEN

- uses: changesets/action@v1
  with:
    publish: pnpm release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### The publish trap, found the hard way

**Step 2 above is not conditional on a changeset existing.** The action runs its
publish step whenever no changesets are pending — which is exactly the state
after a Version Packages PR merges, but is indistinguishable from *no changeset
was ever written*. With packages at `0.0.0` and absent from the registry, npm
treats that as a real version and accepts it.

So an ordinary merge with no changeset publishes whatever version is in
`package.json`. The first run of this workflow did exactly that and was stopped
only by a 2FA prompt on the token.

The job was therefore gated on a `RELEASE_ENABLED` repository variable until a
version existed on the registry.

**The guard was removed on 2026-08-04**, once `0.0.1` was published. That is the
condition it was always waiting for: npm rejects republishing a version that
exists, even after `npm unpublish`, so an unintended run can no longer take a
version number nobody meant to take. The variable was never set — `0.0.1` went
out by hand instead, for the reason in §9.

npm does **not** allow reusing a version number, even after `npm unpublish`. A
burned `0.0.0` is burned.

### Pack with pnpm, never with npm

The adapter packages depend on core as `"@caioalfonso/kanso-core": "workspace:^"`.
**pnpm rewrites that to a real range when it packs**; `npm pack` does not — it
copies the string through, and the resulting tarball fails to install with:

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:^
```

`changeset publish` shells out to the repo's package manager, so the real release
path is safe. This only bites when packing by hand to inspect a tarball — which
is exactly when you are least likely to notice the tarball is not what ships.

**Versioning policy**

- `0.x` while the API settles — through Phase 5.
- `1.0.0` when all seven components are done and the API has not changed in a
  couple of releases. `1.0.0` is a promise; do not make it early.
- Post-1.0 strict semver. Adding a required prop, renaming a `data-part`, or
  changing a default is a **major** — `data-part` names are a public API because
  consumers style against them.
- All four packages version in lockstep. Simpler to reason about, and adapters are
  tightly coupled to core anyway.

## 9. npm setup (one-time, human)

```bash
npm adduser              # create the account, enable 2FA
npm org create ...       # not needed for a username scope
npm access list packages @caioalfonso   # verify the scope
```

Scoped packages default to **restricted**. Every package needs:

```jsonc
"publishConfig": { "access": "public" }
```

Forgetting this is the classic first-publish failure.

**CI holds no npm credential.** Publishing is authenticated with **trusted
publishing** (OIDC): the `id-token: write` permission in `release.yml` lets the
job mint a short-lived token that npm exchanges for publish rights. Nothing to
leak, nothing to rotate, nothing to store.

Historical note, since the token route is what most guides still describe: npm
retired the "automation" token type, and the nearest equivalent is a granular
access token with **Bypass two-factor authentication (2FA)** checked, `Read and
write` on packages, and the IP-range field empty — GitHub runners rotate
addresses, so any range breaks CI. This repo used one briefly and **deleted it
on 2026-08-04**. If you ever reintroduce one: never commit it, and never put it
in an `.npmrc` in the repo.

`changeset publish` shells out to **pnpm**, not npm, so OIDC here depends on
pnpm's support for it — present in 10.x (this repo pins 10.30.3) and regressed
in 11.0.8 ([pnpm/pnpm#11513](https://github.com/pnpm/pnpm/issues/11513)). Check
that before bumping pnpm's major. The failure mode is safe: a broken exchange
fails the publish, it cannot publish the wrong thing.

Trusted publishing is configured **per package** on npmjs.com and requires the
package to exist, which is a chicken-and-egg the first release has to break by
hand. That sequence is done, in this order, and the order is the point:

1. `0.0.1` published by hand from a local authenticated session — 2026-08-04.
2. Trusted publishing configured for all four packages.
3. `NPM_TOKEN` deleted from the repository secrets.
4. `NPM_TOKEN` / `NODE_AUTH_TOKEN` removed from `release.yml`'s env.
5. The `RELEASE_ENABLED` guard removed.

Steps 3 and 4 come before 5 deliberately. Removing the guard while CI still
holds a working token is the one arrangement that can publish something nobody
intended.

> **Unverified:** at the time these docs were written, the account did not exist and
> npm's user endpoint requires auth, so `caioalfonso` could not be confirmed
> available — a scope search returned zero packages, which is suggestive but not
> proof. Confirm at `npm adduser`. If taken, get the fallback scope from the user
> before renaming; do not guess.

## 10. Docs deployment

Cloudflare **Pages**, connected to the repo:

- Build command: `pnpm install && pnpm build && pnpm --filter docs build`
  (packages must build first — the docs site imports them).
- Output directory: `docs/dist`
- Production branch: `main`

**Never add an SSR adapter and never add `wrangler.jsonc`.** The Pages flow uploads
a static directory. The sibling portfolio repo lost a day to exactly this: the
Workers flow runs `wrangler deploy`, which auto-adds the Cloudflare adapter and
rebuilds for the Workers runtime, where native binaries fail to load. Pages only
uploads `dist/`.

## 11. Repository hygiene

- **Branch:** `main` is default and protected; CI must pass to merge.
- **Commits:** Conventional Commits — `feat(switch):`, `fix(core):`, `docs:`,
  `chore(release):`.
- **`.gitignore`:** `node_modules`, `dist`, `.astro`, `coverage`,
  `playwright-report`, `test-results`, `.env*`.
- **`LICENSE`:** MIT.
- **`.nvmrc` / `packageManager` field:** pin Node 24 and the pnpm version so CI and
  local agree.
