import { Field, Input } from '@caioalfonso/kanso-react';
import { useState } from 'react';

export function FieldBasic() {
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);

  return (
    <Field
      label="Email"
      description="We only use this to sign you in."
      errorText="Enter an email address."
      invalid={invalid}
      required
    >
      <Input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setInvalid(email === '')}
      />
    </Field>
  );
}
