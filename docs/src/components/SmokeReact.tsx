import { useState } from 'react';

export function SmokeReact() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" data-framework="react" onClick={() => setCount(count + 1)}>
      React island: {count}
    </button>
  );
}
