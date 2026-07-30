# @caioalfonso/kanso-styles

## 0.0.1

### Patch Changes

- 594e89d: First release: **Switch**, in Vue 3 and React 19, from one shared core.

  A binary on/off control built on a native `<button>`, so `Space` and `Enter`
  work without the library adding a keyboard handler. Supports controlled and
  uncontrolled use, `disabled`, `readOnly`, and form submission via `name` — which
  renders a visually-hidden checkbox that mirrors state, so the switch works
  inside a plain `<form>`.

  Also ships the optional stylesheet: a neutral OKLCH palette in light and dark,
  re-themeable entirely through CSS custom properties, with every colour pair
  measured against its WCAG requirement in CI.

  Components expose `data-part` / `data-state` attributes and no class names, so
  styling them yourself is straightforward and the library never fights your CSS.
