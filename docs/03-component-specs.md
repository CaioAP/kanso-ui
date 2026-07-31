# 03 — Component specs

Seven components, listed in **build order** (see `docs/07`). Each later component
reuses utilities built by an earlier one, so the order is load-bearing.

Every spec follows the **WAI-ARIA Authoring Practices Guide (APG)**. When this doc
and the APG disagree, the APG wins — and fix this doc in the same commit.

Reference: https://www.w3.org/WAI/ARIA/apg/patterns/

**Universal rules for all components:**

- Prefer a native element over a role. `<button>` before `role="button"`.
  Native elements bring keyboard, focus and AT behaviour for free.
- The **root part only** carries `data-kanso` and `data-scope="<component>"`.
  Every part, root included, carries `data-part`. The stylesheet relies on this —
  see `docs/02` §2.
- State is exposed as `data-state`, `data-disabled`, `data-invalid` — consumers
  style and animate from these.
- Every user-facing string is a prop. Core ships no copy.
- `asChild` / polymorphic rendering is **out of scope for v1.** Note it as a
  possible v2 addition; do not build it.

---

## 1. Switch — *Phase 1, the vertical slice*

APG: https://www.w3.org/WAI/ARIA/apg/patterns/switch/

A binary on/off control. Distinct from Checkbox: a switch takes effect immediately,
a checkbox is usually submitted with a form. Deliberately the first component
because the behaviour is trivial — Phase 1 is about proving the *pipeline*, not
solving a hard interaction problem.

**Anatomy:** `root` · `control` · `thumb` · `label` · `hidden-input`

`label` renders only when `label` is given; `hidden-input` only when `name` is.

**Props**

| Prop | Type | Default | Notes |
|---|---|---|---|
| `checked` | `boolean` | — | Controlled |
| `defaultChecked` | `boolean` | `false` | Uncontrolled |
| `onCheckedChange` | `(checked: boolean) => void` | — | Both modes |
| `disabled` | `boolean` | `false` | |
| `readOnly` | `boolean` | `false` | Focusable, not toggleable |
| `required` | `boolean` | `false` | |
| `name` / `value` | `string` | — | Renders a hidden input for form submission |
| `id` | `string` | auto | Overrides framework id |
| `label` | `string` | — | Required for a11y unless `aria-label` given |

**Keyboard**

| Key | Action |
|---|---|
| `Space` | Toggle |
| `Enter` | Toggle |
| `Tab` | Move focus |

Both keys come free from a native `<button>`. **Do not add a keydown handler.**

**ARIA:** `role="switch"` on the control, `aria-checked`, `aria-labelledby` → label
id, `aria-readonly` when read-only, native `disabled`.

`aria-labelledby` is emitted **only when a `<label>` is actually rendered**. With
`aria-label` and no `label`, the idref would dangle and the control would announce
as nameless — see `docs/01` §8.

**Non-colour state cue:** the thumb *moves*. Position, not colour, is the primary
signal. Add a track border change as reinforcement.

**Form participation:** render a visually-hidden `<input type="checkbox">` mirroring
state when `name` is set, so the switch works inside a plain `<form>`. It carries
`aria-hidden`, `tabindex="-1"` and `readonly`, and must be clipped rather than
`display: none` — a hidden-by-display checkbox is skipped by constraint validation,
which quietly disables `required`. Full rationale in `docs/01` §8.

---

## 2. Tabs — *Phase 2*

APG: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

Introduces **roving tabindex** to `core/src/dom/roving-focus.ts` — reused by Menu.

**Anatomy:** `root` · `list` · `trigger` · `content`

**Props**

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` / `defaultValue` | `string` | — | Selected tab |
| `onValueChange` | `(value: string) => void` | — | |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Changes arrow keys |
| `activationMode` | `'automatic' \| 'manual'` | `'automatic'` | See below |
| `loop` | `boolean` | `true` | Arrow wrap-around |

**`activationMode` matters for a11y.** `automatic` selects on focus — correct when
selecting is free. `manual` requires `Enter`/`Space` — correct when selecting has a
cost, because in automatic mode arrowing from the first tab to the last fires
`onValueChange` once per tab passed through. Document the tradeoff on the docs page;
this is a genuinely useful thing to teach.

**Keyboard** (horizontal; vertical swaps for `ArrowUp`/`ArrowDown`)

| Key | Action |
|---|---|
| `ArrowRight` | Focus next tab (wrap if `loop`) |
| `ArrowLeft` | Focus previous tab |
| `Home` | Focus first tab |
| `End` | Focus last tab |
| `Enter` / `Space` | Select focused tab (manual mode) |
| `Tab` | Move out of the tab list into the active panel |

**Roving tabindex:** exactly one trigger has `tabindex="0"`; all others `-1`. This
is what makes `Tab` skip the whole list — a very common bug is giving every tab
`tabindex="0"`.

**ARIA:** `role="tablist"` (+ `aria-orientation`), `role="tab"` with `aria-selected`
and `aria-controls`, `role="tabpanel"` with `aria-labelledby` and `tabindex="0"`
(so the panel itself is focusable when it holds no focusable child).

**Non-colour cue:** the active indicator is a 2px rule under/beside the trigger,
plus a font-weight change. Never colour alone.

### Decisions taken before implementation (Phase 2)

Six questions this spec did not answer. Each is settled here rather than
discovered in a test, per `docs/01` §12 step 1.

**1. Panels are always mounted; only their children may be lazy.**

`aria-controls` on a trigger and `aria-labelledby` on a panel are a bidirectional
pair of idrefs. If unselected panels are not in the DOM, every unselected trigger
carries a dangling `aria-controls` — the same defect class as Switch's
unconditional `aria-labelledby` (`docs/01` §8), and axe will not catch it: an
unresolvable `aria-controls` is reported as *incomplete*, not a violation.

So `Tabs.Content` always renders its element, carrying `hidden` when unselected.
The idrefs always resolve, and panel-local DOM state (a half-filled input, a
scroll position) survives switching away and back.

Consumers who need lazy work put the condition *inside* the panel, not around it:

```tsx
<Tabs.Content value="reports">{isSelected && <ExpensiveReport />}</Tabs.Content>
```

The docs page teaches this pattern. It also means the original "expensive to
render" justification for `manual` was wrong, and the prop table above now gives
the real one: automatic activation fires `onValueChange` for every tab the user
arrows past, which matters when the handler fetches, navigates, or logs.

**2. No `focusedValue` in state — roving tabindex derives from `value` alone.**

Exactly one trigger has `tabindex="0"`: the selected one. Arrow keys move DOM
focus without moving the tab stop, which is what the APG reference implementation
does. The consequence is visible in manual mode: arrow to the third tab, `Tab`
away, `Shift+Tab` back, and focus lands on the *selected* tab, not the third. That
is correct — the tab stop marks where the component's state is, not where the
user's attention last happened to be.

Storing a second focus pointer in core would also mean core tracking blur, which
it has no business doing. Transient focus lives in the DOM.

**3. Ids encode the tab value with `encodeURIComponent`.**

Ids are `${rootId}-trigger-${encodeURIComponent(value)}` and
`${rootId}-content-${encodeURIComponent(value)}`. A raw value containing a space
would make `aria-controls="tabs-content-my tab"` parse as **two** idrefs, both
broken. Encoding is injective, so two distinct values can never collide on one id
— which naive sanitising (`replace(/\s/g, '-')`) does not guarantee. Every
character `encodeURIComponent` leaves alone is legal in an HTML id and in an
idref. Tested with values containing spaces, slashes and non-ASCII.

**4. No per-tab `disabled` in v1.**

Deliberately absent from the prop table. A disabled tab must stay focusable
(`aria-disabled`, not the native attribute) while arrow keys skip it, which means
roving focus over a *filtered* set. Phase 4's Menu requires exactly that for
disabled menu items, so it gets built once, there, and Tabs can adopt it
afterwards. Building it twice is how the roving-focus utility ends up with two
shapes.

**5. `indicator` is deferred out of the v1 anatomy.**

A single indicator element cannot know where the selected trigger is without
measuring it — element measurement plus a `ResizeObserver`, i.e. a `tabs.dom.ts`
and an effect in each adapter. That is Phase 3-grade machinery bought for an
animation, and Phase 2's definition of done is the keyboard table.

The non-colour cue above is unaffected: the 2px rule is drawn by the selected
trigger's own `::after` in `tabs.css`, which needs no JavaScript at all. A
sliding indicator can be added later without a breaking change, since it adds a
part rather than renaming one.

**6. With nothing selected there is no tab stop, and that is on purpose.**

The tab stop is the selected trigger. So a `Tabs` given neither `value` nor
`defaultValue` — or a controlled one pointed at a value no trigger has — renders
every trigger at `tabindex="-1"` and cannot be reached with `Tab` at all.

The alternative is to select the first tab in an effect on mount. That is
rejected: it is a state write during mount, so it fights controlled mode, it
differs between the server render and the client render, and it has to be built
in both adapters — three of this project's named traps for one convenience.

Failing visibly is the better trade. A missing `defaultValue` is noticed the
first time anyone presses `Tab`, whereas a component that quietly repairs its own
inputs teaches the consumer nothing.

---

## 3. Dialog — *Phase 3, the first hard one*

APG: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

Builds `focus-trap.ts`, `scroll-lock.ts`, `dismissable.ts` — all reused by Menu.

**Anatomy:** `trigger` · `backdrop` · `positioner` · `content` · `title` ·
`description` · `close`

**Props**

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` / `defaultOpen` | `boolean` | `false` | |
| `onOpenChange` | `(open: boolean) => void` | — | |
| `modal` | `boolean` | `true` | Non-modal skips trap + scroll lock |
| `closeOnEscape` | `boolean` | `true` | |
| `closeOnInteractOutside` | `boolean` | `true` | |
| `initialFocus` | `() => HTMLElement \| null` | — | Defaults to first focusable |
| `finalFocus` | `() => HTMLElement \| null` | — | Defaults to the trigger |
| `role` | `'dialog' \| 'alertdialog'` | `'dialog'` | |

**Keyboard**

| Key | Action |
|---|---|
| `Escape` | Close, return focus to trigger |
| `Tab` | Move to next focusable **inside** the dialog; wrap at the end |
| `Shift+Tab` | Reverse; wrap at the start |

**Focus behaviour — the part that is usually wrong:**

1. On open, move focus into the dialog — `initialFocus`, else the first focusable,
   else the content element itself (given `tabindex="-1"`).
2. Focus **cannot** leave while open. Prefer `inert` on sibling content; keep a
   tab-cycle fallback for older engines.
3. On close, restore focus to whatever had it before opening (usually the trigger).
   Failing to do this strands keyboard users at the top of the document.
4. Never auto-focus a destructive action.

**ARIA:** `role="dialog"`, `aria-modal="true"` when modal, `aria-labelledby` → title,
`aria-describedby` → description. Trigger gets `aria-haspopup="dialog"` and
`aria-expanded`.

**Scroll lock:** lock the body while modal and open. Compensate for scrollbar width
to avoid a layout shift on open — a small detail that reads as care.

**WCAG 2.2 SC 2.4.11:** the dialog must never obscure the focused element.

**Testing note:** jsdom's focus model is not trustworthy for verifying a trap.
Assert trap behaviour in **Playwright**, on a real browser.

---

## 4. Menu — *Phase 4, the hardest*

APG: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/

Reuses `focus-trap`, `dismissable`, `roving-focus`; adds `typeahead.ts`.
Deliberately last of the hard components — by now every utility it needs exists.

**Anatomy:** `trigger` · `positioner` · `content` · `item` · `separator` ·
`group` · `groupLabel`

**Props**

| Prop | Type | Default |
|---|---|---|
| `open` / `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `(open: boolean) => void` | — |
| `onSelect` | `(value: string) => void` | — |
| `loop` | `boolean` | `true` |
| `typeahead` | `boolean` | `true` |

**Keyboard**

| Key | Context | Action |
|---|---|---|
| `Enter` / `Space` / `ArrowDown` | Trigger | Open, focus first item |
| `ArrowUp` | Trigger | Open, focus last item |
| `ArrowDown` / `ArrowUp` | Open | Move focus, wrap if `loop` |
| `Home` / `End` | Open | First / last item |
| `Enter` / `Space` | Open | Activate item, close, focus trigger |
| `Escape` | Open | Close, focus trigger |
| `Tab` | Open | Close **and** let focus move on (do not swallow) |
| a–z | Open | Typeahead: focus next item starting with typed string |

**Typeahead** buffers keystrokes with a ~500 ms reset, matches case-insensitively
on item text, and wraps. Repeated presses of one letter cycle matching items.

**Disabled items** remain focusable (`aria-disabled`, not removed from the ring) so
keyboard users can discover them. Do not skip them.

**ARIA:** trigger — `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`.
Content — `role="menu"`, `aria-labelledby` → trigger. Items — `role="menuitem"`,
`aria-disabled` when disabled. Focus moves via roving tabindex.

**Positioning:** v1 uses simple CSS anchoring with a viewport-collision fallback.
**Do not add a positioning engine dependency** (Floating UI) in v1 — it is a large
dependency for a headless library. Revisit for v2 if collisions prove painful.

---

## 5. Inputs — *Phase 5*

Not one component but a small **Field** system: the a11y wiring around a control.
Genuinely valuable because `aria-describedby` composition is what people get wrong.

**Anatomy:** `root` · `label` · `control` · `description` · `errorText`

**Components:** `Field` (context/wiring), `Input` (text), `Textarea`.

**Props (Field)**

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` | Base for all derived ids |
| `invalid` | `boolean` | Sets `aria-invalid`, reveals `errorText` |
| `disabled` / `readOnly` / `required` | `boolean` | Forwarded to the control |

**The wiring, which is the whole point:**

- `label` gets `for` → control id. Native association, not `aria-label`.
- `aria-describedby` on the control is the **space-joined** list of whichever of
  description-id and error-id are present. Both, one, or neither — computed, never
  hardcoded. Getting this wrong (overwriting rather than composing) is the single
  most common form-a11y bug.
- `aria-invalid="true"` when invalid. `aria-required` when required.
- Error text lives in a container with `aria-live="polite"` so it is announced when
  it appears after validation.

**Non-colour cue:** an invalid field gets a thicker border and an icon, plus the
error text itself — never a red outline alone.

---

## 6. Button — *Phase 5*

Presentational. **Thin or absent core** — do not manufacture a state machine for it.

**Props:** `variant` (`solid | outline | ghost`), `size` (`sm | md | lg`),
`disabled`, `loading`, `type` (default `'button'`).

**Rules that still matter:**

- Always a native `<button>`; `type="button"` by default so it never accidentally
  submits a form.
- `loading` sets `aria-busy="true"` and keeps the button **focusable** while
  blocking activation. Do not use `disabled` for loading — disabled elements are
  removed from the tab order and the state change is not announced.
- When loading replaces the label with a spinner, keep an accessible name (visually
  hidden text or `aria-label`).
- Minimum 44 × 44 px hit area, including `size="sm"`, via padding.

---

## 7. Card — *Phase 5*

Pure layout. **No core module.** Included for completeness of the visual set.

**Anatomy:** `root` · `header` · `body` · `footer`

Renders a `<div>` by default; accepts an `as` prop for `<article>` / `<section>`.

**The one real a11y trap — the "clickable card".** Never wrap a card containing
links or buttons in another link or a click handler: it produces nested interactive
elements, an unusable tab order, and a meaningless accessible name.

The correct pattern, which the docs must teach:

```css
[data-part='root'] { position: relative; }
[data-part='root'] a[data-card-link]::after {
  content: ''; position: absolute; inset: 0;
}
```

One real link takes the whole card's click area via a pseudo-element. Screen
readers get one link with a sensible name; the tab order stays sane; text inside
remains selectable.

---

## Summary

| Component | Phase | Core weight | New utility introduced |
|---|---|---|---|
| Switch | 1 | Light | — (pipeline proof) |
| Tabs | 2 | Medium | `roving-focus` |
| Dialog | 3 | Heavy | `focus-trap`, `scroll-lock`, `dismissable` |
| Menu | 4 | Heaviest | `typeahead` |
| Inputs | 5 | Medium | id/`describedby` composition |
| Button | 5 | None | — |
| Card | 5 | None | — |
