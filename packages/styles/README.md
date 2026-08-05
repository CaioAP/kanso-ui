# @caioalfonso/kanso-styles

The optional stylesheet and design tokens for
[kanso-ui](https://github.com/CaioAP/kanso-ui). Entirely opt-in — the components
work fully unstyled without it.

```bash
npm i @caioalfonso/kanso-styles
```

```ts
import '@caioalfonso/kanso-styles';           // tokens + base + every component

import '@caioalfonso/kanso-styles/tokens';    // or, piece by piece:
import '@caioalfonso/kanso-styles/base';      //   tokens and base are required,
import '@caioalfonso/kanso-styles/switch';    //   then one component at a time
```

`tokens` defines every custom property the component sheets read, and `base`
carries the `:focus-visible` ring, the reduced-motion opt-out and the clipping
that hides a form component's mirror input. A component sheet on its own gives
you an unfocusable-looking control and a stray visible checkbox.

## Theming

Every value is a CSS custom property under the `--kanso-` namespace, and every
one is overridable. That is the whole theming API:

```css
:root {
  --kanso-accent: oklch(55% 0.15 150);
  --kanso-radius: 6px;
}
```

The palette is deliberately neutral so it can be re-themed to anything. Light
and dark both ship; dark applies on `prefers-color-scheme` unless you set
`data-theme` yourself, and the library never writes `data-theme` — theme
ownership stays with your app.

## Contrast is measured, not assumed

Every colour pair in this package is converted OKLCh → sRGB → WCAG relative
luminance and checked against its required ratio on every CI run. Text pairs
must clear 4.5:1; anything that carries state — borders, focus rings, the switch
thumb — must clear 3:1 per WCAG 2.2 SC 1.4.11.

## Styling contract

The stylesheet only ever targets `data-part`, `data-state`, `data-disabled` and
`data-scope`. There are no class names to depend on, which is also what makes
your own CSS straightforward:

```css
[data-scope='switch'] [data-part='thumb'][data-state='checked'] {
  /* your checked thumb */
}
```

## Documentation

<https://kanso-ui.pages.dev>

MIT licensed.
