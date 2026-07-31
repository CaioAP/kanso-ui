<script setup lang="ts">
import { Tabs } from '@caioalfonso/kanso-vue';
</script>

<template>
  <Tabs.Root default-value="account">
    <Tabs.List aria-label="Settings">
      <Tabs.Trigger value="account">Account</Tabs.Trigger>
      <Tabs.Trigger value="password">Password</Tabs.Trigger>
      <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="account">Your display name.</Tabs.Content>
    <Tabs.Content value="password">Something new.</Tabs.Content>
    <Tabs.Content value="sessions">Sign out elsewhere.</Tabs.Content>
  </Tabs.Root>
</template>
