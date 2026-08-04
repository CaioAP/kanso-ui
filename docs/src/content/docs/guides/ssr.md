---
title: Server rendering
description: Stable ids, hydration, what is deliberately absent from the server HTML, and notes for Astro, Nuxt and Next.
---

kanso-ui is built to be server-rendered. Every component has a server-render
test in both frameworks, and those tests are the reason for several of the
design decisions on this page.

## Ids come from the framework, never from core

Core does not generate ids. Not with a counter, not with `Math.random`, not
with `crypto.randomUUID` — all three produce a different value on the server
than on the client, and the result is a hydration mismatch.

Ids are passed **into** core, and core derives the part ids deterministically:

```ts
export const switchIds = (id: string) => ({
  root: `kanso-switch-${id}`,
  control: `kanso-switch-${id}-control`,
  label: `kanso-switch-${id}-label`,
});
```

The adapters source the base id from the framework's own stable primitive —
React's `useId()`, Vue 3.5's `useId()`. Both are SSR-stable by design.

**Vue needs 3.5 or newer.** Earlier versions have no `useId`, and the adapter
throws a clear error rather than falling back to something unstable. If you are
on an older Vue, pass an `id` prop explicitly.

An explicit `id` prop always wins, in both frameworks:

```tsx
<Switch id="notifications" label="Notifications" />
```

### If you render more than one app on a page

Two independent Vue or React apps on the same page each start their id counter
from zero, so both emit `«r0»`-style ids and the second app's markup can
collide with the first. Both frameworks solve this the same way — give each app
its own prefix:

```ts
// React
hydrateRoot(el, <App />, { identifierPrefix: 'app2-' });

// Vue 3.5+
const app = createSSRApp(App);
app.config.idPrefix = 'app2';
```

The prefix has to match on both sides — pass the same option to
`renderToString` / `createRoot` as you pass when hydrating.

This is a framework-level concern rather than a kanso-ui one, but a collision
shows up as a duplicated `id` attribute, which is an accessibility failure as
well as a hydration one.

## The trap that only hydration catches

Vue only treats a prop as an event listener when the name matches
`/^on[^a-z]/`. A handler folded all the way to lowercase — `onclick` — fails
that test, so Vue falls through to its "is this a DOM property?" check, finds
that `onclick` is one, and assigns it directly.

**That works.** Clicks fire, client-side tests pass, nothing looks wrong.

Hydration takes a different path: it only patches props Vue recognises as
events. So a server-rendered component hydrates with no handler at all and is
simply inert — no error, no warning.

This is why `normalizeProps` folds handler names to `on` + capital + lowercase
tail (`onKeyDown` → `onKeydown`) rather than lowercasing the whole name, and
why the test suites assert hydration rather than only rendering. If you write
your own adapter, this is the bug you will hit.

A related one, found the same way: Vue's server renderer decides between a
property and an attribute differently from its client. `readOnly` is a real
property of an `<input>`, so the client sets it as one, while the server
renderer's boolean-attribute list is lowercase and never takes the boolean
path — emitting a literal `readOnly="true"`. The Vue normalizer maps
`readOnly` → `readonly` to keep the two halves identical.

## What is deliberately absent from the server HTML

**Dialog is portalled after mount**, so a dialog is not in the server-rendered
HTML at all, `defaultOpen` included. React's `createPortal` is unsupported by
`react-dom/server`, and Vue's teleport output is collected separately from the
page HTML. If content must be in the initial response, it does not want to be
a dialog.

**Menu content is unmounted while closed**, so its markup arrives on open. The
trigger carries no `aria-controls` for exactly this reason — the reference
would dangle.

## What is deliberately present in it

`Field` is the opposite case, and it shaped the component.

A dialog is absent from the server HTML, so a `Dialog.Title` registering
itself with its root from a mount hook has nothing to be late for. A field is
*always* rendered. If `Field.Description` registered the same way, the server
would send a control with **no `aria-describedby`** and the association would
appear only once JavaScript ran — a form that works without JavaScript would
ship without its description.

So a field's parts are props in React and slots in Vue, known during render:

```tsx
<Field
  label="Email"
  description="We only use this to reply."
  errorText={error}
>
  <Input type="email" />
</Field>
```

Reading context downward during render is synchronous and server-safe. Only
writing upward is not. The SSR tests assert `aria-describedby` is in the HTML
**string**, not merely present after hydration — "hydrates without warnings"
would have passed on the broken design, because a registration produces a
post-hydration update rather than a mismatch.

## Framework notes

**Astro.** Components mount as islands. Everything here applies per island,
and each island is its own app — so if you mount several and see id
collisions, give them prefixes as above. `client:visible` islands are fully
present and fully inert until they hydrate, which is worth knowing when you
write tests against them.

**Next.js.** Server Components render kanso-ui fine, but the adapters are
client components: they use `useId` and `useState`, so any file importing them
needs `'use client'`. Import from the subpath entry (`kanso-react/switch`) to
keep the client bundle small.

**Nuxt.** Works with the default setup on Vue 3.5+. If you render several Nuxt
apps on one page, set `idPrefix` per app.

## Testing your own integration

The check that matters is not "did it render" — it is "did it hydrate without
a mismatch". A test that only asserts no exception was thrown passes on every
bug described on this page. Spy on `console.error` and assert it stayed quiet,
which is what this library's own suites do.
