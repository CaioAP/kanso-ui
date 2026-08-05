---
'@caioalfonso/kanso-core': patch
'@caioalfonso/kanso-react': patch
'@caioalfonso/kanso-vue': patch
'@caioalfonso/kanso-styles': patch
---

Field now shows **one** message below its control, never two stacked: while
`invalid` with an `errorText`, the error replaces the description rather than
pushing it down.

`aria-describedby` follows the same resolver, so it names only the message that
is actually rendered. Previously a field with both parts described itself with
`"…-description …-error"`; it is now `"…-error"` alone while invalid, and the
description element is not in the document. Referencing an element that is no
longer rendered would be a dangling idref — the defect class this component
exists to prevent — so the render decision and the aria composition come from
one function rather than two conditions that can drift.

New in core: `fieldMessage(state)` → `'error-text' | 'description' | undefined`,
and `fieldShowsDescription(state)`. `fieldShowsErrorText` is unchanged in
behaviour and still exported; it is now derived from `fieldMessage`. A future
third kind of message is inserted into that one ordered list.

The error element still mounts whenever a message was supplied and stays empty
until invalid — it is the live region, which is exactly why the description is
the part that yields. Behaviour is identical in the server HTML, asserted in
both SSR suites.

The optional stylesheet gains one rule for the consequence of that: an empty
live region is zero-height but still earns its share of the field's `gap`, so a
valid field carried 8px of dead space under its message. Cancelled with a
negative margin on `:empty`, not `display: none` — hiding it would take the
region out of the accessibility tree and break the announcement it exists for.

**Behaviour change for anyone relying on both being announced.** A description
carrying the rule the error complains about ("8 characters or more") now
disappears while the user is correcting it; put the constraint in the error
message if your form needs it. Recorded in `docs/03` §5 decision 9.

Still a `patch`: `0.1.0` is the maintainer's call, not a phase boundary's.
