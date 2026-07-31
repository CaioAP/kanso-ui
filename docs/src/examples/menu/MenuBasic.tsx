import { Menu } from '@caioalfonso/kanso-react';

export function MenuBasicReact() {
  return (
    <Menu.Root onSelect={(value) => console.log(value)}>
      <Menu.Trigger>Actions</Menu.Trigger>

      <Menu.Positioner>
        <Menu.Content>
          <Menu.Item value="archive">Archive</Menu.Item>
          <Menu.Item value="duplicate">Duplicate</Menu.Item>
          <Menu.Separator />
          <Menu.Group>
            <Menu.GroupLabel>Settings</Menu.GroupLabel>
            <Menu.Item value="rename">Rename</Menu.Item>
          </Menu.Group>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}
