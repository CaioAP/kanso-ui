---
'@caioalfonso/kanso-core': major
'@caioalfonso/kanso-react': major
'@caioalfonso/kanso-vue': major
'@caioalfonso/kanso-styles': major
---

`1.0.0` — the public API is settled.

Not a feature release. Nothing here changes behaviour; this is the version
number catching up with the state of the project, because `0.0.x` says "the API
is still moving" and that stopped being true.

What `1.0.0` means for these packages:

**Seven components**, each with a framework-agnostic core, a Vue 3 adapter, a
React 19 adapter, the full APG keyboard map, a server-render test in both
frameworks, and an optional stylesheet part — Switch, Tabs, Dialog, Menu, Field,
Button and Card.

**The public surface has been reviewed rather than accumulated.** Every export in
core's entry points was traced to its callers, and the five that had exactly one
caller — never an adapter — were removed before this release rather than after
it. What remains is what the two shipped adapters need plus what the docs teach.

**The contracts that are now covered by semver:**

- the `data-part` / `data-state` attributes each component emits, which are the
  styling contract — there are no class names to depend on;
- the `--kanso-*` custom properties, which are the whole theming API;
- the per-component entry points on all four packages, and the fact that
  importing one never pulls in another.

Breaking any of those now requires a major. That is the point of the number.

**Deliberately unchanged:** the scope. Seven components, Vue and React only. The
architecture would allow a third adapter and the library will not ship one — see
the non-goals in the project spec. Restraint is the design, not an unfinished
state.
