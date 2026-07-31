import { Button } from '@caioalfonso/kanso-react';
import { useState } from 'react';

export function ButtonBasic() {
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSaving(false);
  };

  return (
    <Button loading={saving} onClick={save}>
      Save changes
    </Button>
  );
}
