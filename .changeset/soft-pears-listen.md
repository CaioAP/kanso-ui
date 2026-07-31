---
'@caioalfonso/kanso-core': patch
'@caioalfonso/kanso-react': patch
'@caioalfonso/kanso-vue': patch
'@caioalfonso/kanso-styles': patch
---

Add Field, Input and Textarea: the accessibility wiring around a form control,
with `aria-describedby` **composed** rather than overwritten — including a
consumer's own — in Vue 3 and React 19 from one core.

The component's shape is decided by server rendering rather than by taste.
`Field` takes its label, description and error as node props in React and as
the `#label` / `#description` / `#error-text` slots in Vue, so presence is known
during render. A compound child registering from its own mount hook would leave
the control's `aria-describedby` out of the server HTML and add it once
JavaScript arrived — a form that works without JavaScript would ship without its
description association. Both SSR suites assert the attribute is in the HTML
string itself.

Also here:

- the error element is rendered before it has a message, so its `aria-live`
  region is already in the document when the message arrives
- `required` is the native attribute; no redundant `aria-required`
- the stylesheet keys the invalid state off `data-invalid`, never `:invalid`,
  which matches every required empty control from page load
- a development warning when a `Field` contains no control, since the label's
  `for` is emitted unconditionally

`PropTypes` and `NormalizeProps` gain a `textarea` entry. A textarea is not an
input: it has `rows`, no `type`, and its own props interface in React.

Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.
