<script setup lang="ts">
/**
 * The Vue half of the Button preview: the live component plus its knobs.
 *
 * Deliberately a mirror of ButtonPlaygroundReact.tsx. Toggling the framework
 * tab should change nothing a visitor can see — that is the demonstration.
 *
 * The press counter is the point of the preview: turn `loading` on and it stops
 * moving, while the button stays focusable and keeps its name.
 */
import { Button } from '@caioalfonso/kanso-vue';
import { ref, useId } from 'vue';

const variant = ref<'solid' | 'outline' | 'ghost'>('solid');
const size = ref<'sm' | 'md' | 'lg'>('md');
const loading = ref(false);
const disabled = ref(false);
const presses = ref(0);

// The rule is written for React. <script setup> *is* the component body, so
// Vue's useId() is correctly placed here.
// biome-ignore lint/correctness/useHookAtTopLevel: see above
const knobId = useId();
</script>

<template>
  <div class="preview-stage">
    <Button
      :variant="variant"
      :size="size"
      :loading="loading"
      :disabled="disabled"
      @click="presses += 1"
    >
      Save changes
    </Button>

    <p class="preview-note" data-presses>Presses: {{ presses }}</p>

    <fieldset class="preview-knobs">
      <legend>Props</legend>

      <label :for="`${knobId}-variant`">
        variant
        <select :id="`${knobId}-variant`" v-model="variant">
          <option value="solid">solid</option>
          <option value="outline">outline</option>
          <option value="ghost">ghost</option>
        </select>
      </label>

      <label :for="`${knobId}-size`">
        size
        <select :id="`${knobId}-size`" v-model="size">
          <option value="sm">sm</option>
          <option value="md">md</option>
          <option value="lg">lg</option>
        </select>
      </label>

      <label :for="`${knobId}-loading`">
        <input :id="`${knobId}-loading`" v-model="loading" type="checkbox" />
        loading
      </label>

      <label :for="`${knobId}-disabled`">
        <input :id="`${knobId}-disabled`" v-model="disabled" type="checkbox" />
        disabled
      </label>
    </fieldset>
  </div>
</template>
