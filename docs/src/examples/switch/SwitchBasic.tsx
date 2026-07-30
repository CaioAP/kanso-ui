import { Switch } from '@caioalfonso/kanso-react';
import { useState } from 'react';

export function SwitchBasicReact() {
  const [checked, setChecked] = useState(false);

  return <Switch label="Wi-Fi" checked={checked} onCheckedChange={setChecked} />;
}
