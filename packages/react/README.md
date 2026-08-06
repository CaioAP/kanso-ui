# @caioalfonso/kanso-react

React 19 components for [kanso-ui](https://github.com/CaioAP/kanso-ui) — headless,
accessible, and sharing every line of their behaviour with the Vue build.

```bash
npm i @caioalfonso/kanso-react
```

```tsx
import { Switch } from '@caioalfonso/kanso-react/switch';

function Settings() {
  const [checked, setChecked] = useState(false);
  return <Switch label="Wi-Fi" checked={checked} onCheckedChange={setChecked} />;
}
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
This package binds that to React and renders it. The
[Vue build](https://www.npmjs.com/package/@caioalfonso/kanso-vue) does the same
for Vue. A keyboard fix lands in both at once, because there is only one
implementation to fix.

## Documentation

<https://kansoui.caioalfonso.dev>

ESM only. `react` and `react-dom` are peer dependencies. MIT licensed.
