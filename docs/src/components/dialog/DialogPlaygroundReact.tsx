import type { DialogRole } from '@caioalfonso/kanso-core';
import { Dialog } from '@caioalfonso/kanso-react';
import { useId, useState } from 'react';

/**
 * The React half of the Dialog preview: the live component plus its knobs.
 *
 * Deliberately a mirror of DialogPlayground.vue. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 *
 * Worth knowing while you play with it: a modal dialog makes the rest of the
 * page `inert`, which includes the framework toggle above and the other panel.
 * That is the component working, not the preview breaking. Close it first.
 */
export function DialogPlaygroundReact() {
  const [nonModal, setNonModal] = useState(false);
  const [role, setRole] = useState<DialogRole>('dialog');
  const [closeOnEscape, setCloseOnEscape] = useState(true);
  const knobId = useId();

  return (
    <div className="preview-stage">
      <Dialog.Root modal={!nonModal} role={role} closeOnEscape={closeOnEscape}>
        <Dialog.Trigger>Delete project</Dialog.Trigger>

        <Dialog.Positioner>
          {/*
            Only while modal. A scrim over a page you can still use is a lie
            about the state, and it also swallows the clicks that page is meant
            to receive — the backdrop covers the viewport by design.
          */}
          {!nonModal && <Dialog.Backdrop />}
          <Dialog.Content>
            <Dialog.Title>Delete this project?</Dialog.Title>
            <Dialog.Description>
              Everything in it goes with it. This cannot be undone.
            </Dialog.Description>
            <Dialog.Close>Keep it</Dialog.Close>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <fieldset className="preview-knobs">
        <legend>Props</legend>

        <label htmlFor={`${knobId}-non-modal`}>
          <input
            id={`${knobId}-non-modal`}
            type="checkbox"
            checked={nonModal}
            onChange={(event) => setNonModal(event.target.checked)}
          />
          non-modal
        </label>

        <label htmlFor={`${knobId}-alert`}>
          <input
            id={`${knobId}-alert`}
            type="checkbox"
            checked={role === 'alertdialog'}
            onChange={(event) => setRole(event.target.checked ? 'alertdialog' : 'dialog')}
          />
          alertdialog
        </label>

        <label htmlFor={`${knobId}-escape`}>
          <input
            id={`${knobId}-escape`}
            type="checkbox"
            checked={closeOnEscape}
            onChange={(event) => setCloseOnEscape(event.target.checked)}
          />
          closeOnEscape
        </label>
      </fieldset>
    </div>
  );
}
