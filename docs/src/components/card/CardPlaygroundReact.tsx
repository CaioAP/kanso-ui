import { Card } from '@caioalfonso/kanso-react';
import { useId, useState } from 'react';

/**
 * The React half of the Card preview: the live component plus its knobs.
 *
 * Deliberately a mirror of CardPlayground.vue.
 *
 * The `whole-card link` knob is the teaching one. With it on, the card has a
 * single link whose click area covers everything — and the second button in the
 * footer becomes unreachable by pointer, which is the pattern telling you this
 * card has two actions and should not be one big link.
 */
export function CardPlaygroundReact() {
  const [as, setAs] = useState<'div' | 'article' | 'section'>('article');
  const [wholeCardLink, setWholeCardLink] = useState(false);
  const knobId = useId();

  return (
    <div className="preview-stage">
      <Card.Root as={as} className="preview-card">
        <Card.Header>
          <h3 className="preview-card-title">
            <a href="#kanso" data-card-link={wholeCardLink ? '' : undefined}>
              Kanso
            </a>
          </h3>
        </Card.Header>

        <Card.Body>Simplicity through the elimination of clutter.</Card.Body>

        <Card.Footer>
          <button type="button" data-secondary>
            Save for later
          </button>
        </Card.Footer>
      </Card.Root>

      <fieldset className="preview-knobs">
        <legend>Props</legend>

        <label htmlFor={`${knobId}-as`}>
          as
          <select
            id={`${knobId}-as`}
            value={as}
            onChange={(event) => setAs(event.target.value as typeof as)}
          >
            <option value="div">div</option>
            <option value="article">article</option>
            <option value="section">section</option>
          </select>
        </label>

        <label htmlFor={`${knobId}-link`}>
          <input
            id={`${knobId}-link`}
            type="checkbox"
            checked={wholeCardLink}
            onChange={(event) => setWholeCardLink(event.target.checked)}
          />
          whole-card link
        </label>
      </fieldset>
    </div>
  );
}
