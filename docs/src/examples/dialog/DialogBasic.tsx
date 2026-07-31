import { Dialog } from '@caioalfonso/kanso-react';

export function DialogBasicReact() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Delete project</Dialog.Trigger>

      <Dialog.Positioner>
        <Dialog.Backdrop />
        <Dialog.Content>
          <Dialog.Title>Delete this project?</Dialog.Title>
          <Dialog.Description>Everything in it goes with it.</Dialog.Description>
          <Dialog.Close>Keep it</Dialog.Close>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
