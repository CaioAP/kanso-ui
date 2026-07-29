#!/usr/bin/env node
/**
 * Enforce the project's central invariant: packages/core imports no framework.
 *
 * This is the whole thesis, so it is checked three ways (docs/05 §6):
 *   1. package.json declares no dependencies of any kind
 *   2. no source file references a framework specifier
 *   3. the built dist carries none either
 *
 * Deliberately wider than a `grep "from 'vue'"`: bare side-effect imports,
 * dynamic import(), require() and Node builtins all count. A type-only import
 * counts too — the bytes may vanish, but the design has already leaked.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coreRoot = join(repoRoot, 'packages', 'core');

const FORBIDDEN = [
  /^vue$/,
  /^vue\//,
  /^@vue\//,
  /^react$/,
  /^react\//,
  /^react-dom$/,
  /^react-dom\//,
  /^node:/,
];

/** Matches the specifier of import / export-from / dynamic import / require. */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.d.ts'];

async function walk(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      found.push(...(await walk(full)));
    } else if (SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      found.push(full);
    }
  }
  return found;
}

const violations = [];

// 1. No declared dependencies at all.
const pkg = JSON.parse(await readFile(join(coreRoot, 'package.json'), 'utf8'));
for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  const names = Object.keys(pkg[field] ?? {});
  if (names.length > 0) {
    violations.push(`packages/core/package.json declares ${field}: ${names.join(', ')}`);
  }
}

// 2 + 3. No framework specifier in source, and none in the built output.
const targets = [join(coreRoot, 'src'), join(coreRoot, 'dist')];
let distChecked = false;

for (const target of targets) {
  try {
    await stat(target);
  } catch {
    continue;
  }
  if (target.endsWith('dist')) distChecked = true;

  for (const file of await walk(target)) {
    const source = await readFile(file, 'utf8');
    const lines = source.split('\n');

    for (const [index, line] of lines.entries()) {
      SPECIFIER.lastIndex = 0;
      let match = SPECIFIER.exec(line);
      while (match !== null) {
        const specifier = match[1];
        if (FORBIDDEN.some((pattern) => pattern.test(specifier))) {
          violations.push(`${relative(repoRoot, file)}:${index + 1} imports "${specifier}"`);
        }
        match = SPECIFIER.exec(line);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('core-purity: packages/core must not depend on a framework or a Node builtin.\n');
  for (const violation of violations) console.error(`  ${violation}`);
  console.error('\nPass the primitive in as an argument instead. See CLAUDE.md rule 1.');
  process.exit(1);
}

console.log(
  `core-purity: clean (source${distChecked ? ' + dist' : ', dist not built'}, no framework imports)`,
);
