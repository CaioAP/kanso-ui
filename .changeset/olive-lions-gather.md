---
'@caioalfonso/kanso-core': patch
---

Narrow the public surface before `1.0.0` makes it a promise, and start
measuring that each component entry ships alone.

Five names leave the public exports. Each had exactly one caller, and none of
them was an adapter, the docs site, or a documented example:

- `assertDialogName` — called only by `scheduleDialogNameCheck`, in its own file
- `assertFieldControl` — called only by `scheduleFieldControlCheck`, likewise
- `fieldDescribedBy` — called only by `connectField`
- `measureMenuPlacement` — called only by `activateMenu`
- `getDismissableLayerCount` — called only by `dismissable.test.ts`; test
  introspection that had been exported by accident

They remain available inside the package; only the entry points change. The
scheduled dev-time checks that adapters *do* call — `scheduleDialogNameCheck`,
`scheduleFieldControlCheck` — are unaffected.

Deliberately kept: `switchIds` and its siblings, and `tabsTriggerId` /
`tabsContentId`. No adapter imports them, but the server-rendering guide teaches
the derivation, and a consumer pointing `aria-controls` at a panel from outside
the component needs them.

The criterion was `docs/00`'s non-goal — Vue and React only, no Svelte or Solid
— so the surface is what the two shipped adapters need plus what the docs teach,
not a speculative adapter-authoring API.

A `patch`, because nothing is published yet: there is no consumer to break.

Also adds `pnpm bundle-size`, now a CI gate. It bundles all 21 component entries
from `dist` and fails if one pulls in another. `"sideEffects": false` is a claim
and tsup emits shared chunks between entries, so whether the claim holds is a
fact about the built output. Verified by planting a cross-import from Switch
into Menu: the check reported the leak and the size regression, and passed again
once reverted.
