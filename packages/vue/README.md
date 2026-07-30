# @caioalfonso/kanso-vue

Vue 3 components for [kanso-ui](https://github.com/CaioAP/kanso-ui) — headless,
accessible, and sharing every line of their behaviour with the React build.

```bash
npm i @caioalfonso/kanso-vue
```

```vue
<script setup lang="ts">
import { Switch } from '@caioalfonso/kanso-vue/switch';
import { ref } from 'vue';

const checked = ref(false);
</script>

<template>
  <Switch v-model="checked" label="Wi-Fi" />
</template>
```

Unstyled by default. Components expose `data-part` and `data-state` attributes
and nothing else, so you can style them however you like — or opt into the
included stylesheet:

```ts
import '@caioalfonso/kanso-styles';
```

## Why

State, keyboard handling, ARIA and focus management live once, in
[`@caioalfonso/kanso-core`](https://www.npmjs.com/package/@caioalfonso/kanso-core).
This package binds that to Vue's reactivity and renders it. The
[React build](https://www.npmjs.com/package/@caioalfonso/kanso-react) does the
same for React. A keyboard fix lands in both at once, because there is only one
implementation to fix.

## Documentation

<https://kanso-ui.pages.dev>

ESM only. Requires Vue 3.5+ (for `useId`), which is a peer dependency. MIT licensed.
