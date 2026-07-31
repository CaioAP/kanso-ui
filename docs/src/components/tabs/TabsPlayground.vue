<script setup lang="ts">
/**
 * The Vue half of the Tabs preview: the live component plus its knobs.
 *
 * Deliberately a mirror of TabsPlaygroundReact.tsx. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 */
import { Tabs } from '@caioalfonso/kanso-vue';
import { computed, ref, useId } from 'vue';

const vertical = ref(false);
const manual = ref(false);
const loop = ref(true);

const orientation = computed(() => (vertical.value ? 'vertical' : 'horizontal'));
const activationMode = computed(() => (manual.value ? 'manual' : 'automatic'));

// The rule is written for React. <script setup> *is* the component body, so
// Vue's useId() is correctly placed here.
// biome-ignore lint/correctness/useHookAtTopLevel: see above
const knobId = useId();
</script>

<template>
  <div class="preview-stage">
    <Tabs.Root
      default-value="account"
      :orientation="orientation"
      :activation-mode="activationMode"
      :loop="loop"
    >
      <Tabs.List aria-label="Settings">
        <Tabs.Trigger value="account">Account</Tabs.Trigger>
        <Tabs.Trigger value="password">Password</Tabs.Trigger>
        <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="account">Change your display name.</Tabs.Content>
      <Tabs.Content value="password">Pick something you have not used before.</Tabs.Content>
      <Tabs.Content value="sessions">Sign out everywhere else.</Tabs.Content>
    </Tabs.Root>

    <fieldset class="preview-knobs">
      <legend>Props</legend>

      <label :for="`${knobId}-vertical`">
        <input :id="`${knobId}-vertical`" v-model="vertical" type="checkbox" />
        vertical
      </label>

      <label :for="`${knobId}-manual`">
        <input :id="`${knobId}-manual`" v-model="manual" type="checkbox" />
        manual
      </label>

      <label :for="`${knobId}-loop`">
        <input :id="`${knobId}-loop`" v-model="loop" type="checkbox" />
        loop
      </label>
    </fieldset>
  </div>
</template>
