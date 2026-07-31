---
'@caioalfonso/kanso-core': patch
'@caioalfonso/kanso-react': patch
'@caioalfonso/kanso-vue': patch
'@caioalfonso/kanso-styles': patch
---

Add Button: three variants, three sizes, and a `loading` state that stays
focusable and keeps its accessible name.

`loading` is not `disabled`. It sets `aria-busy`, leaves the button in the tab
order, and blocks activation — including form submission — through a handler
composed in core. The consumer's `onClick` is passed *into* `connectButton`
rather than left in the props spread, because every adapter applies core's props
last and would otherwise replace it; a button whose handler silently never fires
renders perfectly and passes an axe scan.

The label is a part of its own so the spinner can fade it with `opacity`.
`visibility: hidden` and `display: none` both remove an element from the
accessibility tree, and would take the button's name with them.

Every size keeps a 44px minimum. `sm` is narrower and lighter, not shorter.

Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.
