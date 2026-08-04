---
title: Introduction
description: What kanso-ui is, what headless means here, and the tradeoff the architecture makes.
---

kanso-ui is a headless, accessible component library for **Vue 3** and **React 19**,
built on a single framework-agnostic behaviour core.

:::caution[Not on npm yet]
All seven v1 components are built, tested and documented — Switch, Tabs, Dialog,
Menu, Field, Button and Card — but the packages have not been published to npm.
There is nothing to install yet. Build from the repository, or follow the
roadmap there for the release.
:::

## What headless means here

The packages ship behaviour, not appearance. Each component renders semantic
markup with `data-part` and `data-state` attributes, and nothing else — no class
names, no injected CSS, no font. You style it, or you opt into
`@caioalfonso/kanso-styles` and restyle whatever you like by targeting the same
attributes.

## Why a core and two adapters

All behaviour — state transitions, keyboard handling, ARIA, focus management —
lives once in `@caioalfonso/kanso-core`, as plain TypeScript with zero
dependencies. The core exports a pure reducer and a `connect()` function that
returns neutral prop bags. Each adapter supplies a `normalizeProps` translator
and renders.

Writing components twice, once per framework, duplicates the expensive part —
accessibility — and guarantees the two implementations drift apart.

## The tradeoff, stated honestly

This pattern costs a layer of indirection. A single one-off component is more
code this way than writing it directly in one framework. It pays off at the
second framework and at every component after the first, because the hard part
is written once.
