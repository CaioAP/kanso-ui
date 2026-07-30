<script setup lang="ts">
/**
 * The Vue half of the Switch preview: the live component plus its knobs.
 *
 * Deliberately a mirror of SwitchPlaygroundReact.tsx. Toggling the framework
 * tab should change nothing a visitor can see — that is the demonstration.
 */
import { Switch } from '@caioalfonso/kanso-vue';
import { ref, useId } from 'vue';

const checked = ref(false);
const disabled = ref(false);
const readOnly = ref(false);
// The rule is written for React. <script setup> *is* the component body, so
// Vue's useId() is correctly placed here.
// biome-ignore lint/correctness/useHookAtTopLevel: see above
const knobId = useId();
</script>

<template>
  <div class="preview-stage">
    <Switch v-model="checked" label="Wi-Fi" :disabled="disabled" :read-only="readOnly" />

    <fieldset class="preview-knobs">
      <legend>Props</legend>

      <label :for="`${knobId}-disabled`">
        <input :id="`${knobId}-disabled`" v-model="disabled" type="checkbox" />
        disabled
      </label>

      <label :for="`${knobId}-readonly`">
        <input :id="`${knobId}-readonly`" v-model="readOnly" type="checkbox" />
        readOnly
      </label>
    </fieldset>
  </div>
</template>
