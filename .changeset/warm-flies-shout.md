---
'@caioalfonso/kanso-styles': patch
---

Correct the stylesheet README's piecemeal import example.

It listed `tokens` and one component sheet as if the pair were sufficient. It is
not: `base.css` carries the `:focus-visible` ring, the reduced-motion opt-out
and the clipping that keeps a form component's `hidden-input` mirror out of
sight, and no component sheet `@import`s it. Following the old example gave you
a control with no visible focus indicator and a stray checkbox on the page —
which is a WCAG 2.4.7 failure produced by the install instructions themselves.

No CSS changed; the barrel entry always pulled `base` in, which is why the docs
site never showed the defect. README only, so the fix ships with the package it
describes.
