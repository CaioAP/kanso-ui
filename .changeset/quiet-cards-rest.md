---
'@caioalfonso/kanso-core': patch
'@caioalfonso/kanso-react': patch
'@caioalfonso/kanso-vue': patch
'@caioalfonso/kanso-styles': patch
---

Add Card: a layout container with `header`, `body` and `footer`, an `as` prop,
and the whole-card link pattern in the optional stylesheet.

No state, no keyboard, no ARIA — but it does have a core module, which corrects
`docs/03` §7. The instruction that line was protecting still holds (no state
machine for a `<div>`); leaving the `data-part` attributes to two hand-written
adapters is simply how they end up disagreeing, and nothing fails until a
stylesheet meets one of them.

The docs page teaches the pseudo-element whole-card link *and* what it costs: a
second interactive element inside the card becomes unreachable by pointer. Both
halves are asserted in a real browser.

Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.
