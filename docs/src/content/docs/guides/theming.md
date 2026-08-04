---
title: Theming
description: The token reference, the data-attribute styling contract, and a worked example rethemeing the library to a different brand.
---

kanso-ui is headless first. The behaviour packages ship **zero CSS** — every
component renders semantic markup carrying `data-part` and `data-state`
attributes and nothing else. No class names, no injected styles, no font.

You have three options, and they are all supported:

1. Style the `data-*` attributes yourself and never install the stylesheet.
2. Opt into `@caioalfonso/kanso-styles` and override its custom properties.
3. Opt in and override individual rules, at equal specificity.

This page covers 2 and 3. Option 1 needs nothing from this library except the
attribute names, which are listed on each component's page.

## The styling contract

```ts
import '@caioalfonso/kanso-styles';         // everything
import '@caioalfonso/kanso-styles/switch';  // one component
import '@caioalfonso/kanso-styles/tokens';  // tokens only
```

Every root element carries a `data-kanso` marker; every part carries
`data-part`; stateful parts carry `data-state` and boolean markers like
`data-disabled`.

```css
[data-kanso] [data-part='control'] { … }
[data-kanso] [data-part='control'][data-state='checked'] { … }
[data-kanso] [data-part='control'][data-disabled] { … }
```

Two rules about the selector shape, and both are load-bearing:

- `data-kanso` is on the **root part only**, so component rules are
  *descendant* selectors — `[data-kanso] [data-part]`, with a space. The
  compound form `[data-kanso][data-part]` demands both attributes on one
  element and matches nothing.
- Rules that style the root itself are the exception and use the compound form
  deliberately: `[data-kanso][data-part='root']`.

Where two components could own the same part name, disambiguate with the
`data-scope` the root also carries:

```css
[data-kanso][data-scope='switch'] [data-part='control'] { … }
```

### The specificity budget

Every rule in the shipped stylesheet is **one attribute-selector chain, no
nesting, no `!important`**. That is a deliberate constraint, and it is what
makes the stylesheet overridable: you can win any rule by matching it at equal
specificity later in the cascade, without fighting anything you cannot see.

The one sanctioned `!important` in the whole codebase is the reduced-motion
guard.

## Tokens

Every visual value is a CSS custom property in the `--kanso-` namespace. The
tokens *are* the theming API.

| Token | Purpose |
|---|---|
| `--kanso-bg` | Page background |
| `--kanso-surface` | Raised surface |
| `--kanso-surface-sunk` | Recessed surface — tracks, inputs |
| `--kanso-fg` | Body text |
| `--kanso-fg-muted` | Secondary text |
| `--kanso-fg-faint` | Large text only — see the warning below |
| `--kanso-line` | Decorative hairline |
| `--kanso-line-strong` | Any border that indicates state |
| `--kanso-accent` | The one accent colour |
| `--kanso-accent-hover` | Hovered accent fill |
| `--kanso-on-accent` | Text on an accent fill |
| `--kanso-danger` | Invalid, destructive |
| `--kanso-on-danger` | Text on a danger fill |
| `--kanso-radius` | Corner radius — `0px` by default |
| `--kanso-radius-sm` | Small controls |
| `--kanso-radius-full` | Pills and thumbs |
| `--kanso-border` | Border width |
| `--kanso-focus-ring` | Focus outline width |
| `--kanso-focus-ring-offset` | Focus outline offset |
| `--kanso-focus-color` | Focus outline colour |
| `--kanso-space-1` … `-8` | Spacing, 4px base |
| `--kanso-duration` | Transition duration |
| `--kanso-ease` | Transition easing |

Colours are authored in OKLCh, which keeps lightness perceptually even across
hues — but nothing requires your overrides to be. Any CSS colour works.

### `line` and `line-strong` are not two shades

They are an accessibility rule wearing a naming convention.

`--kanso-line` is decorative and deliberately below 3:1. `--kanso-line-strong`
is measured at **at least 3:1 against every surface it can sit on**, because
WCAG 2.2 SC 1.4.11 applies to any border that is the *only* indicator of a
state. If you override one, override both, and keep the relationship.

### `fg-faint` is a large-text token

It measures 3.84:1 in light and 4.37:1 in dark. That clears 3:1 but not the
4.5:1 body text needs. It exists for large text and non-essential marks. Do not
set body copy in it.

## Dark mode

The library never writes `data-theme` itself — theme ownership belongs to your
app. The tokens respond to both signals:

```css
:root, [data-theme='light'] { /* light values */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { /* dark values */ }
}

[data-theme='dark'] { /* dark values */ }
```

An explicit `data-theme` always wins; the media query applies only in its
absence. Set `data-theme` on `<html>` from your own theme toggle and the
components follow.

## Worked example: rethemeing to a different brand

The neutral palette exists so the library is adoptable. Replacing it is the
theming API doing its job, not a workaround.

Here is this library's author's own portfolio system — a vermilion accent, a
warmer paper background, serif type — applied entirely from consumer CSS.
Nothing in the packages changes.

```css
/* your-app/theme.css — loaded after kanso-styles */
:root {
  --kanso-bg: oklch(97.5% 0.008 85);
  --kanso-surface: oklch(99% 0.005 85);
  --kanso-fg: oklch(24% 0.01 60);
  --kanso-fg-muted: oklch(46% 0.012 60);

  --kanso-accent: oklch(52% 0.19 32);
  --kanso-accent-hover: oklch(46% 0.19 32);
  --kanso-on-accent: oklch(99% 0.005 32);

  --kanso-radius: 2px;
}

[data-theme='dark'] {
  --kanso-bg: oklch(19% 0.008 60);
  --kanso-surface: oklch(23% 0.009 60);
  --kanso-fg: oklch(93% 0.006 85);
  --kanso-fg-muted: oklch(73% 0.008 85);

  --kanso-accent: oklch(70% 0.16 32);
  --kanso-accent-hover: oklch(76% 0.16 32);
  --kanso-on-accent: oklch(17% 0.01 32);
}
```

Type is not in that list, because the library sets no `font-family` at all.
Components inherit from your app — set the font on `body` and it reaches them.

:::caution[Measure your palette]
Overriding colour tokens moves you outside the contrast this library measured.
The shipped palette is verified pair by pair, in both themes, by a script that
runs in CI. Yours is not.

At minimum check `fg` on `bg` and on `surface` at 4.5:1, `on-accent` on
`accent` at 4.5:1, and `accent`, `danger` and `line-strong` at 3:1 against
every surface they sit on. See the [accessibility
guide](/guides/accessibility/) for what the library guarantees and what
becomes yours the moment you retheme.
:::

## Overriding a rule rather than a token

When a token is not enough, match the stylesheet's own selector shape and load
your CSS after it:

```css
[data-kanso][data-scope='switch'] [data-part='control'] {
  border-radius: var(--kanso-radius-full);
}
```

Equal specificity, later in the cascade, wins. That is the whole reason for the
specificity budget — you never need `!important` to move something.
