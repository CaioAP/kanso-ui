<script setup lang="ts">
/**
 * The Vue half of the Menu preview: the live component plus its knobs.
 *
 * Deliberately a mirror of MenuPlaygroundReact.tsx. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 */
import { Menu } from '@caioalfonso/kanso-vue';
import { ref, useId } from 'vue';

const loop = ref(true);
const typeahead = ref(true);
const chosen = ref<string | null>(null);

// The rule is written for React. <script setup> *is* the component body, so
// Vue's useId() is correctly placed here.
// biome-ignore lint/correctness/useHookAtTopLevel: see above
const knobId = useId();
</script>

<template>
  <div class="preview-stage">
    <Menu.Root :loop="loop" :typeahead="typeahead" @select="(value: string) => (chosen = value)">
      <Menu.Trigger>Actions</Menu.Trigger>

      <Menu.Positioner>
        <Menu.Content>
          <Menu.Item value="archive">Archive</Menu.Item>
          <Menu.Item value="duplicate">Duplicate</Menu.Item>
          <Menu.Item value="share" disabled>Share (unavailable)</Menu.Item>
          <Menu.Separator />
          <Menu.Group>
            <Menu.GroupLabel>Settings</Menu.GroupLabel>
            <Menu.Item value="rename">Rename</Menu.Item>
            <Menu.Item value="permissions">Permissions</Menu.Item>
          </Menu.Group>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>

    <p class="preview-note" data-chosen>
      {{ chosen === null ? 'Nothing chosen yet.' : `Chose: ${chosen}` }}
    </p>

    <fieldset class="preview-knobs">
      <legend>Props</legend>

      <label :for="`${knobId}-loop`">
        <input :id="`${knobId}-loop`" v-model="loop" type="checkbox" />
        loop
      </label>

      <label :for="`${knobId}-typeahead`">
        <input :id="`${knobId}-typeahead`" v-model="typeahead" type="checkbox" />
        typeahead
      </label>
    </fieldset>
  </div>
</template>
