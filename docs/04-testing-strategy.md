# 04 — Testing strategy

## 1. The premise

For an accessibility library, tests are not a safety net — they are **the product
claim**. "Accessible" is either verified or it is marketing.

The strategy has four layers, each catching what the layer below cannot:

| Layer | Tool | Catches |
|---|---|---|
| Core unit | Vitest | Wrong state transitions |
| Adapter integration | Vitest + Testing Library | Wrong ARIA, wrong keyboard |
| Static a11y | axe | Structural violations |
| Real browser | Playwright + axe | Focus, traps, scroll lock, contrast |

## 2. The most important thing in this document

**axe cannot detect a broken keyboard interaction.**

A Menu whose `ArrowDown` handler is missing, a Dialog whose focus trap leaks, a
Tabs whose roving tabindex is inverted — every one of these passes axe with zero
violations. Automated scanning verifies *structure*: roles, names, contrast,
duplicate ids. It cannot verify *behaviour*.

So: **axe is the floor, keyboard tests are the actual work.** Every interactive
component ships explicit assertions for every row of its keyboard table in
`docs/03`. If a key is in the table and not in a test, the component is not done.

## 3. Layer 1 — core unit tests

The best return on effort in the whole repo. Reducers are pure, so tests are
fast, deterministic, and need no DOM.

```ts
// packages/core/src/switch/switch.state.test.ts
describe('switchReducer', () => {
  it('toggles checked', () => {
    expect(switchReducer(initial({ checked: false }), { type: 'TOGGLE' }).checked).toBe(true)
  })

  it('ignores TOGGLE when disabled', () => {
    const state = initial({ checked: false, disabled: true })
    expect(switchReducer(state, { type: 'TOGGLE' })).toBe(state) // identity, not just equality
  })

  it('ignores TOGGLE when readOnly', () => { ... })
})
```

Note `toBe` on the no-op case: the reducer returns the **same reference** when
nothing changes. That is both a correctness property and a rendering optimisation,
so assert identity rather than deep equality.

**Coverage requirement:** every `case` in every reducer, plus every guard
(`disabled`, `readOnly`, `loop` boundaries). This is where a11y bugs actually live.

Also unit-test `normalizeProps` in each adapter directly — every component depends
on it, so a bug there is a bug everywhere.

## 4. Layer 2 — adapter integration tests

`@testing-library/vue`, `@testing-library/react`, `@testing-library/user-event`.

**Test the way a user works: by role and accessible name.** Never by class name,
never by `data-testid`, never by inspecting component internals. If a test can only
be written against internals, that is a signal the ARIA is wrong.

```ts
it('toggles with Space', async () => {
  const user = userEvent.setup()
  render(<Switch label="Wi-Fi" />)
  const control = screen.getByRole('switch', { name: 'Wi-Fi' })

  expect(control).toHaveAttribute('aria-checked', 'false')
  await user.tab()
  expect(control).toHaveFocus()
  await user.keyboard(' ')
  expect(control).toHaveAttribute('aria-checked', 'true')
})
```

### Shared test specs across frameworks

Behaviour is shared, so the *test intent* should be too. Keep a plain-language
spec list per component in one place and implement it in both adapters. If a Vue
test exists with no React counterpart, one of the two adapters is untested.

A lightweight approach that works: export a `switchSpec` array of
`{ name, run }` cases parameterised over a render function, and have each adapter
supply its own renderer. Do not over-abstract this — a duplicated `describe` block
in each adapter is acceptable if the abstraction starts costing clarity.

### Required cases per interactive component

1. Renders with correct role and accessible name.
2. Every key in the `docs/03` keyboard table, asserted individually.
3. Controlled mode: prop change updates the DOM; internal state does not diverge.
4. Uncontrolled mode: `defaultX` respected, `onXChange` fires.
5. `disabled` blocks interaction; `readOnly` allows focus but blocks change.
6. axe: zero violations, in every meaningful state (open **and** closed).
7. SSR: renders to string without throwing, no hydration mismatch.

## 5. Layer 3 — axe

`vitest-axe` (or `jest-axe`) in the component tests:

```ts
it('has no axe violations when open', async () => {
  const { container } = render(<Dialog defaultOpen title="Settings" />)
  expect(await axe(container)).toHaveNoViolations()
})
```

Scan **every state**, not just the default. A closed Dialog has almost no DOM;
scanning only that proves nothing.

Zero violations is the standard. No exception list. If a rule genuinely does not
apply, disable it inline with a comment explaining why — and treat that as a code
smell to justify in review.

## 6. Layer 4 — Playwright, against the docs site

jsdom lies about layout, focus and visibility. These properties **must** be tested
in a real browser:

- **Focus trap** — Tab repeatedly through a Dialog and assert focus never escapes.
- **Focus restoration** — close, assert focus is back on the trigger.
- **Scroll lock** — body does not scroll while modal is open; no layout shift.
- **`inert`** — background content is genuinely unreachable.
- **Real contrast** — axe measures computed colours, so this catches token
  regressions the unit layer cannot.
- **`prefers-reduced-motion`** — run a project with the flag set and assert no
  animation.

Two races that bit the sibling portfolio repo and will bite here — guard both:

- **Wait for entry animations to finish before running axe.** Scanning mid-animation
  makes axe measure blended colours and report phantom contrast failures. Skip
  animations with infinite iteration counts or the wait never resolves.
- **Wait for hydration before driving an island.** Listeners bind on mount, so
  input sent earlier is silently dropped. Astro removes the `ssr` attribute from
  `<astro-island>` once hydrated — key off that.

## 7. SSR tests

Non-negotiable, because the id trap (`docs/01` §5) is silent and severe.

```ts
// react
const html = renderToString(<Switch label="Wi-Fi" />)
expect(html).toContain('role="switch"')

// vue
const html = await renderToString(createSSRApp(Switch, { label: 'Wi-Fi' }))
```

Then hydrate the server HTML in jsdom and assert **no hydration warning was
emitted** — spy on `console.error`. A mismatch warns; it does not throw. Without
the spy the test passes while the bug ships.

## 8. What is *not* tested

Deliberate exclusions, so nobody adds them later out of habit:

- **No snapshot tests of rendered markup.** They break on every legitimate change
  and assert nothing about behaviour.
- **No visual regression testing** in v1. Real value, real maintenance cost;
  revisit once the API is stable.
- **No coverage percentage gate.** Coverage is reported, not enforced. A number
  invites tests written to raise it. The real gate is the required-cases list in §4.

## 9. Commands

```bash
pnpm test              # everything
pnpm test --project core
pnpm test --project react
pnpm test --project vue
pnpm --filter docs test:e2e
```

One Vitest project per package — declared as `test.projects` in the root
`vitest.config.ts`, since `vitest.workspace.ts` is deprecated as of Vitest 3.2 —
so a failure names its package. Each package owns its own `vitest.config.ts` with
its environment and setup file.

**Never verify a gate by truncating its output.** Read the verdict or key off the
exit status.
