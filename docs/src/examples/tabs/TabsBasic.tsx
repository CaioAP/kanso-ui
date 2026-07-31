import { Tabs } from '@caioalfonso/kanso-react';

export function TabsBasicReact() {
  return (
    <Tabs.Root defaultValue="account">
      <Tabs.List aria-label="Settings">
        <Tabs.Trigger value="account">Account</Tabs.Trigger>
        <Tabs.Trigger value="password">Password</Tabs.Trigger>
        <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="account">Your display name.</Tabs.Content>
      <Tabs.Content value="password">Something new.</Tabs.Content>
      <Tabs.Content value="sessions">Sign out elsewhere.</Tabs.Content>
    </Tabs.Root>
  );
}
