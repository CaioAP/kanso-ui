# 02 — Design system

## 1. Kanso as a design brief

*Kanso* (簡素) is one of the seven principles of Japanese aesthetics: simplicity,
the elimination of clutter. Critically it means **restraint in service of clarity**,
not minimalism as decoration. Things are plain because plainness works, not because
plain is a style.

Translated into concrete rules for this library:

| Principle | Rule here |
|---|---|
| Eliminate the non-essential | No decorative shadows, gradients, or borders that do not communicate state. |
| Function determines form | Every visual property maps to a state: focus, checked, disabled, invalid, open. |
| Natural materials, no ornament | Flat surfaces, hairline rules, near-zero radius. |
| Asymmetry / negative space | Generous spacing. Whitespace is the layout tool, not boxes. |
| Quiet, not loud | One accent colour, used sparingly. Neutrals do the work. |

**Do not put Japanese characters in the UI.** The name carries the idea; the design
expresses it. This mirrors the author's portfolio rule and matters for the same
reason — cultural decoration would be exactly the ornament kanso rejects.

## 2. The styling contract

kanso-ui is **headless first**. Behaviour packages ship zero CSS. An optional
stylesheet — `@caioalfonso/kanso-styles` — is opt-in:

```ts
import '@caioalfonso/kanso-styles'          // everything
import '@caioalfonso/kanso-styles/switch'   // one component
```

The stylesheet targets **only** the data attributes core emits. No class names, ever.

```css
[data-kanso] [data-part='control'] { ... }
[data-kanso] [data-part='control'][data-state='checked'] { ... }
[data-kanso] [data-part='control'][data-disabled] { ... }
```

**The selector shape is a contract — get it right once.** `data-kanso` is emitted
on the **root part only** (see `docs/01` §8). Every other part carries `data-part`
alone. So component rules are **descendant** selectors — `[data-kanso] [data-part]`,
with a space — never compound `[data-kanso][data-part]`, which would require both
attributes on the same element and match nothing.

Rules that style the root itself are the one exception, and use the compound form
deliberately: `[data-kanso][data-part='root']`.

Where two components could both own a part name, disambiguate with the
`data-scope` the root also carries: `[data-kanso][data-scope='switch'] [data-part='control']`.

Why this contract matters:

- **No class-name collisions**, no hashing, no CSS-modules build step.
- **The consumer can restyle anything** by targeting the same attributes, at equal
  specificity, without fighting a cascade they cannot see.
- **Behaviour and appearance can genuinely be adopted separately** — the headless
  claim is true rather than nominal.

Every root element carries a `data-kanso` marker attribute so the stylesheet can
scope itself and never touch unrelated `data-part` usage in a consumer's app.

### Specificity budget

All component rules use exactly **one attribute-selector chain, no nesting, no
`!important`**. Two consequences, both intended: the stylesheet is trivially
overridable, and disciplined authoring is enforced by the budget itself.

## 3. Tokens

CSS custom properties under the `--kanso-` namespace, defined on `:root`, with a
dark variant. Every one is overridable — that *is* the theming API.

```css
:root {
  /* surfaces */
  --kanso-bg:            oklch(99%   0.002 95);
  --kanso-surface:       oklch(97%   0.003 95);
  --kanso-surface-sunk:  oklch(94.5% 0.004 95);

  /* ink */
  --kanso-fg:            oklch(22%   0.006 95);
  --kanso-fg-muted:      oklch(45%   0.006 95);
  --kanso-fg-faint:      oklch(60%   0.005 95);

  /* structure */
  --kanso-line:          oklch(88%   0.004 95);
  --kanso-line-strong:   oklch(78%   0.005 95);

  /* accent — restrained indigo, deliberately not the portfolio's vermilion */
  --kanso-accent:        oklch(52%   0.13  258);
  --kanso-accent-hover:  oklch(46%   0.13  258);
  --kanso-on-accent:     oklch(99%   0.002 258);

  /* feedback */
  --kanso-danger:        oklch(52%   0.17  27);
  --kanso-on-danger:     oklch(99%   0.002 27);

  /* geometry */
  --kanso-radius:        0px;      /* kanso default: square */
  --kanso-radius-sm:     2px;      /* small controls only */
  --kanso-radius-full:   9999px;   /* switch thumb only */
  --kanso-border:        1px;

  /* focus */
  --kanso-focus-ring:        2px;
  --kanso-focus-ring-offset: 2px;
  --kanso-focus-color:       var(--kanso-accent);

  /* spacing — 4px base */
  --kanso-space-1: 0.25rem;
  --kanso-space-2: 0.5rem;
  --kanso-space-3: 0.75rem;
  --kanso-space-4: 1rem;
  --kanso-space-6: 1.5rem;
  --kanso-space-8: 2rem;

  /* motion */
  --kanso-duration: 140ms;
  --kanso-ease:     cubic-bezier(0.2, 0, 0, 1);
}

[data-theme='dark'] {
  --kanso-bg:            oklch(18%   0.004 95);
  --kanso-surface:       oklch(21%   0.005 95);
  --kanso-surface-sunk:  oklch(15%   0.004 95);
  --kanso-fg:            oklch(93%   0.004 95);
  --kanso-fg-muted:      oklch(72%   0.005 95);
  --kanso-fg-faint:      oklch(58%   0.005 95);
  --kanso-line:          oklch(32%   0.006 95);
  --kanso-line-strong:   oklch(42%   0.007 95);
  --kanso-accent:        oklch(70%   0.12  258);
  --kanso-accent-hover:  oklch(76%   0.12  258);
  --kanso-on-accent:     oklch(16%   0.01  258);
  --kanso-danger:        oklch(68%   0.16  27);
  --kanso-on-danger:     oklch(16%   0.01  27);
}
```

> ⚠️ **These values are unverified starting points, not measured results.**
> They were chosen by eye and reasoning, and no contrast ratio in this table has
> been computed. Phase 0 includes a task to run every foreground/background pair
> through a contrast checker and correct the values. **Do not claim WCAG AA
> conformance for the stylesheet until that task is done and the numbers are
> recorded in `docs/09`.** The pairs that need checking:
> `fg`/`bg`, `fg-muted`/`bg`, `fg-faint`/`bg` (large text only), `on-accent`/`accent`,
> `on-danger`/`danger`, `accent`/`bg` (focus ring, needs 3:1 non-text),
> `line`/`bg` (needs 3:1 where a border is the only state indicator).

### Dark mode

The stylesheet keys off `[data-theme='dark']` on any ancestor, and additionally
honours `@media (prefers-color-scheme: dark)` when no explicit `data-theme` is set.
The library never writes `data-theme` itself — theme ownership belongs to the host
app. Document this clearly; it is a common source of confusion.

### Typography

**The library ships no fonts and sets no `font-family`.** Components inherit from
the host. This is a deliberate adoptability decision — a component library that
imposes a typeface is a component library nobody adopts.

Only relative type sizing is set, and only where a control needs it:
`font-size: inherit` is the default; size tokens exist for the docs site, not the
packages.

## 4. Focus, state and motion

**Focus** is the most important visual in the system, because it is the one people
most often get wrong.

```css
[data-kanso] [data-part]:focus-visible,
[data-kanso][data-part='root']:focus-visible {
  outline: var(--kanso-focus-ring) solid var(--kanso-focus-color);
  outline-offset: var(--kanso-focus-ring-offset);
}
```

Rules:
- `:focus-visible`, never `:focus` — no rings on mouse click, always rings on keyboard.
- **Never** `outline: none` without an equally visible replacement.
- The ring must clear 3:1 against adjacent colours (WCAG 2.2 SC 1.4.11).
- WCAG 2.2 SC 2.4.11 *Focus Not Obscured* — the Dialog and Menu must not let the
  focused element be hidden behind their own overlay.

**State is never colour-only** (WCAG 1.4.1). Checked, selected, invalid and
disabled each carry a non-colour cue as well — position, weight, an icon, a border
change. Called out per component in `docs/03`.

**Disabled** uses reduced opacity plus `aria-disabled` / native `disabled`. Do not
drop contrast so far the control becomes unreadable; disabled still needs to be
legible.

**Motion** is minimal and always guarded:

```css
@media (prefers-reduced-motion: reduce) {
  [data-kanso],
  [data-kanso] * { transition: none !important; animation: none !important; }
}
```

This is the one sanctioned `!important` in the codebase.

**Touch targets** are ≥ 44 × 44 px (WCAG 2.2 SC 2.5.8), using padding or a
pseudo-element to extend the hit area where the visual is smaller.

## 5. Relationship to the portfolio's Yohaku system

They are deliberately different systems by the same hand.

| | Yohaku (portfolio) | Kanso (this library) |
|---|---|---|
| Accent | Vermilion `--shu` | Restrained indigo `--kanso-accent` |
| Fonts | Zen Old Mincho / Zen Kaku / JetBrains Mono | None — inherits |
| Signature | Hanko seal, katakana カ | None |
| Purpose | Personal brand | Neutral, adoptable default |

The portfolio will **retheme** kanso-ui with Yohaku tokens when it embeds a demo.
That is not a workaround — it is the theming API demonstrating itself, and it is
worth calling out on the docs site's theming page as the worked example.
