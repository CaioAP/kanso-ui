<script setup lang="ts">
import { Menu } from '@caioalfonso/kanso-vue';
</script>

<template>
  <Menu.Root @select="(value: string) => console.log(value)">
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
</template>
