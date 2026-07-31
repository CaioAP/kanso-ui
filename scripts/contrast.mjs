#!/usr/bin/env node
/**
 * Measure WCAG contrast ratios for the kanso token palette.
 *
 * docs/00 §7 claims "contrast measured, not assumed", so this reads the real
 * tokens.css rather than a copy of its values — a copy would drift and the
 * claim would quietly become false.
 *
 * OKLCh -> OKLab -> LMS -> linear sRGB -> gamma sRGB -> 8-bit -> WCAG luminance.
 * The 8-bit round trip matters: contrast is judged on what the screen shows,
 * and out-of-gamut colours get clamped there.
 *
 * Self-check anchors run first. If they fail, every number below is worthless.
 *
 *   node scripts/contrast.mjs
 *   node scripts/contrast.mjs --solve line-strong 3
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clamp01 = (x) => Math.min(1, Math.max(0, x));

function oklchToLinearSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const encodeGamma = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.sign(c) * Math.abs(c) ** (1 / 2.4) - 0.055;

/** WCAG 2.x linearisation — deliberately not the same curve as the encode above. */
const wcagLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function oklchToRgb8(L, C, h) {
  return oklchToLinearSrgb(L, C, h)
    .map(encodeGamma)
    .map((c) => Math.round(clamp01(c) * 255));
}

const toHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

function luminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map((c) => wcagLinear(c / 255));
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------- self-check

const anchors = [
  { name: 'oklch(100% 0 0) -> white', got: toHex(oklchToRgb8(1, 0, 0)), want: '#ffffff' },
  { name: 'oklch(0% 0 0) -> black', got: toHex(oklchToRgb8(0, 0, 0)), want: '#000000' },
  {
    name: 'oklch(62.8% 0.2577 29.23) -> sRGB red',
    got: toHex(oklchToRgb8(0.628, 0.2577, 29.23)),
    want: '#ff0000',
  },
  {
    name: 'white vs black contrast',
    got: contrast([255, 255, 255], [0, 0, 0]).toFixed(2),
    want: '21.00',
  },
  { name: 'luminance of #808080', got: luminance([128, 128, 128]).toFixed(4), want: '0.2159' },
];

let anchorsOk = true;
console.log('self-check');
for (const { name, got, want } of anchors) {
  const ok = got === want;
  if (!ok) anchorsOk = false;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: got ${got}, want ${want}`);
}
if (!anchorsOk) {
  console.error('\nconverter is wrong — do not record these numbers');
  process.exit(1);
}

// ------------------------------------------------------------------- palette

const tokensPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'packages',
  'styles',
  'src',
  'tokens.css',
);
const css = readFileSync(tokensPath, 'utf8');

const DECLARATION = /--kanso-([a-z-]+):\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g;

/** Pull the oklch declarations out of one selector block. */
function readBlock(startPattern) {
  const start = css.search(startPattern);
  if (start === -1) throw new Error(`tokens.css: no block matching ${startPattern}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const block = css.slice(open, close);

  const tokens = {};
  DECLARATION.lastIndex = 0;
  let match = DECLARATION.exec(block);
  while (match !== null) {
    tokens[match[1]] = [Number(match[2]) / 100, Number(match[3]), Number(match[4])];
    match = DECLARATION.exec(block);
  }
  return tokens;
}

const light = readBlock(/^:root,/m);
const dark = readBlock(/^\[data-theme='dark'\]/m);

// Plain CSS cannot share a declaration block between a media query and a
// selector, so the dark palette is written twice: once under
// prefers-color-scheme, once under an explicit [data-theme='dark']. Measuring
// one and not the other would let dark-by-preference regress while this gate
// stayed green, so assert the two copies agree.
const darkByPreference = readBlock(/:root:not\(\[data-theme='light'\]\)/);
const drift = Object.keys({ ...dark, ...darkByPreference }).filter(
  (token) => String(dark[token]) !== String(darkByPreference[token]),
);
if (drift.length > 0) {
  console.error(
    'tokens.css: the two dark blocks disagree on: ' +
      `${drift.join(', ')}\nKeep [data-theme='dark'] and the prefers-color-scheme copy identical.`,
  );
  process.exit(1);
}

/** [foreground, background, required ratio, what it is for] */
const pairs = [
  ['fg', 'bg', 4.5, 'body text'],
  ['fg', 'surface', 4.5, 'text on a raised surface'],
  ['fg-muted', 'bg', 4.5, 'secondary text'],
  ['fg-muted', 'surface', 4.5, 'secondary text on surface'],
  ['fg-faint', 'bg', 3.0, 'large text only'],
  ['on-accent', 'accent', 4.5, 'text on the accent fill'],
  ['on-accent', 'accent-hover', 4.5, 'text on the hovered accent fill'],
  ['on-danger', 'danger', 4.5, 'text on the danger fill'],
  ['accent', 'bg', 3.0, 'focus ring (SC 1.4.11)'],
  ['accent', 'surface', 3.0, 'focus ring on a surface'],
  ['danger', 'bg', 3.0, 'invalid border (SC 1.4.11)'],
  ['line-strong', 'surface', 3.0, 'state border on a surface'],
  ['line-strong', 'bg', 3.0, 'stronger border'],
  // Switch. The thumb is a graphical object carrying state, so it needs 3:1
  // against the track it sits on (SC 1.4.11) — in both positions.
  ['fg-muted', 'surface-sunk', 3.0, 'switch thumb on an unchecked track'],
  ['line-strong', 'surface-sunk', 3.0, 'switch track border, unchecked'],
  // Tabs adds no pair that is not already above, and that is worth stating so
  // nobody assumes it was forgotten. Unselected trigger text is fg-muted on bg
  // and on surface when hovered; the selected trigger is fg on the same two; the
  // 2px rule that marks selection is accent on bg and on surface, covered by the
  // SC 1.4.11 rows. The list hairline is --kanso-line, which is decorative and
  // deliberately below 3:1 — allowed only because it never indicates state.
  // Dialog. Body text and the muted description sit on --kanso-surface, already
  // measured above; the trigger and close button borders are --kanso-line-strong
  // on bg and on surface, also above. Two things here are deliberately *not*
  // measured, for the same reason in both cases — they are not opaque colour
  // pairs. The scrim is translucent (a component property, not a token), and
  // the dialog's own 1px --kanso-line border is decorative: what tells a user a
  // modal is open is the dimmed page and the moved focus, never that hairline.
  ['fg', 'surface-sunk', 4.5, 'dialog trigger and close button text, hovered'],
];

let failures = 0;

for (const [themeName, theme] of [
  ['light', light],
  ['dark', dark],
]) {
  console.log(`\n${themeName}`);
  const rgb = Object.fromEntries(
    Object.entries(theme).map(([k, v]) => [k, oklchToRgb8(v[0], v[1], v[2])]),
  );

  for (const [fg, bg, required, purpose] of pairs) {
    const ratio = contrast(rgb[fg], rgb[bg]);
    const pass = ratio >= required;
    if (!pass) failures++;
    console.log(
      `  ${pass ? 'PASS' : 'FAIL'} ${(`${fg}/${bg}`).padEnd(28)} ${ratio.toFixed(2).padStart(6)}:1  ` +
        `need ${required.toFixed(1)}  ${toHex(rgb[fg])} on ${toHex(rgb[bg])}  (${purpose})`,
    );
  }
}

// -------------------------------------------------------------------- solver
// `--solve <token> <ratio>` reports the OKLCh lightness that would hit a target
// ratio against bg and surface. Used to derive corrected values, not in CI.

/** Find the OKLCh lightness that hits `target` contrast against `bgRgb`. */
function solveL(C, h, bgRgb, target, direction) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const ratio = contrast(oklchToRgb8(mid, C, h), bgRgb);
    // direction 'darker': raising L lowers contrast against a light bg.
    const tooLow = direction === 'darker' ? ratio < target : ratio > target;
    if (tooLow) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

const solveIndex = process.argv.indexOf('--solve');
if (solveIndex !== -1) {
  const token = process.argv[solveIndex + 1];
  const target = Number(process.argv[solveIndex + 2] ?? 3);
  console.log(`\nsolving ${token} for ${target}:1`);

  for (const [themeName, theme, direction] of [
    ['light', light, 'darker'],
    ['dark', dark, 'lighter'],
  ]) {
    for (const bgName of ['bg', 'surface']) {
      const bgRgb = oklchToRgb8(...theme[bgName]);
      const [, C, h] = theme[token];
      const L = solveL(C, h, bgRgb, target, direction);
      console.log(
        `  ${themeName} vs ${bgName.padEnd(8)} L = ${(L * 100).toFixed(1)}%  -> ` +
          `${toHex(oklchToRgb8(L, C, h))}  ratio ${contrast(oklchToRgb8(L, C, h), bgRgb).toFixed(2)}:1`,
      );
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} pair(s) below the required ratio — correct the tokens.`);
  process.exit(1);
}
console.log('\nall measured pairs meet their required ratio');
