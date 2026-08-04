#!/usr/bin/env node
/**
 * Measure each component entry, and prove tree-shaking actually works.
 *
 * Two things are checked, and the second is the one that matters (docs/07,
 * Phase 6):
 *
 *   1. Size. Every entry is bundled and gzipped, and compared to a budget.
 *      A budget that only ever goes up is a ratchet, not a test, so the
 *      budgets here are set close to the measured values — see BUDGETS.
 *
 *   2. Isolation. Importing `@caioalfonso/kanso-react/switch` must not pull in
 *      Menu, Dialog or Tabs. `"sideEffects": false` is a *claim*; tsup emits
 *      shared chunks between entries, so whether the claim holds is a fact
 *      about the built output, not about the package.json.
 *
 * Isolation is checked against the bundled, tree-shaken output rather than the
 * module graph, because shared chunks make the graph uninformative: every entry
 * legitimately imports the chunk that holds the normalizer. What matters is
 * what *survives* tree-shaking, and string data survives minification intact.
 *
 * The marker is `"data-scope":"<component>"`, the attribute every connect()
 * puts on its root. Bare anatomy part names were tried first and are wrong:
 * Card's parts are `header` / `body` / `footer`, and Vue's Dialog teleports
 * with `to: "body"`, which reported Card leaking into Dialog in every build.
 * The marker has to carry its own scope or it is just a common word.
 *
 * Run `pnpm build` first. This reads `dist/`, never `src/` — the published
 * artefact is the thing consumers install, and it is the only honest subject.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRIES = ['switch', 'tabs', 'dialog', 'menu', 'field', 'button', 'card'];

const PACKAGES = [
  { name: '@caioalfonso/kanso-core', dir: 'packages/core', external: [] },
  { name: '@caioalfonso/kanso-react', dir: 'packages/react', external: ['react', 'react-dom'] },
  { name: '@caioalfonso/kanso-vue', dir: 'packages/vue', external: ['vue'] },
];

/**
 * The string that appears in exactly one component's output: the `data-scope`
 * every connect() emits on its root. esbuild minifies the object literal to
 * `"data-scope":"dialog"` — the key keeps its quotes because of the hyphen —
 * and that exact form was verified identical in core, react and vue output.
 *
 * If a scope is ever renamed, the self-presence assertion below fails loudly
 * rather than silently checking nothing.
 */
const marker = (entry) => `"data-scope":"${entry}"`;

/**
 * Gzipped byte budgets per entry. Deliberately tight: a budget with slack in it
 * cannot fail, and a check that cannot fail is decoration. Raise one only with
 * a reason in the commit message.
 *
 * Calibrated against a pinned esbuild — the version in the root package.json is
 * exact, not a caret range, for this reason. Minifier output moves between
 * releases, and at ~12% headroom a bump could push every entry over at once.
 * If a run fails on size across the board rather than on one entry, suspect the
 * bundler moved, not the library.
 */
const BUDGETS = {
  '@caioalfonso/kanso-core': {
    switch: 800,
    tabs: 1200,
    dialog: 2700,
    menu: 2550,
    field: 1000,
    button: 450,
    card: 225,
  },
  '@caioalfonso/kanso-react': {
    switch: 1150,
    tabs: 1700,
    dialog: 3700,
    menu: 3550,
    field: 1550,
    button: 650,
    card: 500,
  },
  '@caioalfonso/kanso-vue': {
    switch: 1525,
    tabs: 2075,
    dialog: 4075,
    menu: 3875,
    field: 1950,
    button: 875,
    card: 675,
  },
};

/** Bundle one entry from dist and return its minified + gzipped output. */
async function measure(pkg, entry) {
  const entryPath = join(repoRoot, pkg.dir, 'dist', `${entry}.js`);

  const result = await build({
    stdin: {
      // Re-export rather than side-effect import: a bare import would let a
      // bundler drop everything, and measure nothing.
      contents: `export * from ${JSON.stringify(entryPath)};`,
      resolveDir: join(repoRoot, pkg.dir),
      sourcefile: `${entry}-probe.js`,
    },
    bundle: true,
    minify: true,
    treeShaking: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: pkg.external,
    write: false,
    logLevel: 'silent',
  });

  const code = result.outputFiles[0].text;
  return { code, gzip: gzipSync(code).length, raw: Buffer.byteLength(code) };
}

const violations = [];
const rows = [];

for (const pkg of PACKAGES) {
  try {
    await readFile(join(repoRoot, pkg.dir, 'dist', 'index.js'));
  } catch {
    console.error(`bundle-size: ${pkg.dir}/dist is missing. Run \`pnpm build\` first.`);
    process.exit(1);
  }

  for (const entry of ENTRIES) {
    const { code, gzip, raw } = await measure(pkg, entry);

    // Isolation: no other component's scope may survive tree-shaking.
    const leaked = ENTRIES.filter((other) => other !== entry && code.includes(marker(other)));
    if (leaked.length > 0) {
      violations.push(
        `${pkg.name}/${entry} pulls in ${leaked.join(', ')} — tree-shaking is not isolating entries`,
      );
    }

    // Sanity: the entry must contain its own marker, or the probe measured
    // nothing and every other assertion here is vacuous.
    if (!code.includes(marker(entry))) {
      violations.push(
        `${pkg.name}/${entry} does not contain ${marker(entry)} — the probe bundled ` +
          'nothing, or the scope was renamed, so this run proves nothing',
      );
    }

    const budget = BUDGETS[pkg.name]?.[entry];
    if (budget !== undefined && gzip > budget) {
      violations.push(`${pkg.name}/${entry} is ${gzip} B gzipped, over its ${budget} B budget`);
    }

    rows.push({ pkg: pkg.name, entry, raw, gzip, budget, leaked });
  }
}

const width = Math.max(...rows.map((row) => `${row.pkg}/${row.entry}`.length));
let current = '';
for (const row of rows) {
  if (row.pkg !== current) {
    current = row.pkg;
    console.log();
  }
  const label = `${row.pkg}/${row.entry}`.padEnd(width);
  const budget = row.budget === undefined ? '' : ` / ${row.budget}`;
  const flag = row.leaked.length > 0 ? `  LEAKS: ${row.leaked.join(', ')}` : '';
  console.log(
    `  ${label}  ${String(row.raw).padStart(6)} B raw  ${String(row.gzip).padStart(5)} B gz${budget}${flag}`,
  );
}

if (violations.length > 0) {
  console.error('\nbundle-size: failed.\n');
  for (const violation of violations) console.error(`  ${violation}`);
  console.error(
    '\nAn entry that pulls in another component means a consumer importing one\n' +
      'component ships all of them. See docs/01 §10.',
  );
  process.exit(1);
}

console.log(
  `\nbundle-size: clean (${rows.length} entries, every entry isolated and within budget)`,
);
