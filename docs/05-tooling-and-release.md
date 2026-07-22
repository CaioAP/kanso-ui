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
    "build":     "pnpm -r --filter './packages/*' build",
    "typecheck": "tsc --build",
    "lint":      "biome check .",
    "lint:fix":  "biome check --write .",
    "test":      "vitest run",
    "changeset": "changeset",
    "release":   "pnpm build && changeset publish"
  }
}
```

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
2. **A CI grep**, cheap and blunt:

   ```bash
   if grep -rEn "from ['\"](vue|react|react-dom)" packages/core/src; then
     echo "core must not import a framework"; exit 1
   fi
   ```

3. **A bundle assertion** — after build, `packages/core/dist` must contain no
   framework import. pnpm's strict resolution makes an accidental import fail to
   resolve locally too, which is the fastest feedback of all.

Run all three. This invariant is the whole thesis; protect it accordingly.

## 7. CI

`.github/workflows/ci.yml`, on push and PR:

```
setup (pnpm, node 24, cache)
  → lint         biome check .
  → typecheck    tsc --build
  → core-purity  the grep above
  → test         vitest run
  → build        all packages
  → package-lint publint + arethetypeswrong
  → docs build   astro build
  → e2e          playwright + axe
```

Fail fast on lint/typecheck; run the rest even if one fails so a single run
surfaces every problem.

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
- uses: changesets/action@v1
  with:
    publish: pnpm release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

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

For CI publishing, create an **automation** token (bypasses 2FA) and store it as
the `NPM_TOKEN` repository secret. Never commit it, never put it in `.npmrc` in
the repo.

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
