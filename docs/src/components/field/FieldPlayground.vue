<script setup lang="ts">
/**
 * The Vue half of the Field preview: the live component plus its knobs.
 *
 * Deliberately a mirror of FieldPlaygroundReact.tsx. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 *
 * Where React passes `label` / `description` / `errorText` as node props, Vue
 * fills the `#label` / `#description` / `#error-text` slots. Same information,
 * known at the same moment; each framework spells content its own way.
 */
import { Field, Input } from '@caioalfonso/kanso-vue';
import { ref, useId } from 'vue';

const invalid = ref(false);
const required = ref(true);
const disabled = ref(false);

// The rule is written for React. <script setup> *is* the component body, so
// Vue's useId() is correctly placed here.
// biome-ignore lint/correctness/useHookAtTopLevel: see above
const knobId = useId();
</script>

<template>
  <div class="preview-stage">
    <Field
      class="preview-field"
      :invalid="invalid"
      :required="required"
      :disabled="disabled"
    >
      <template #label>Email</template>
      <template #description>We only use this to sign you in.</template>
      <template #error-text>Enter an email address.</template>

      <Input type="email" name="email" placeholder="you@example.com" />
    </Field>

    <fieldset class="preview-knobs">
      <legend>Props</legend>

      <label :for="`${knobId}-invalid`">
        <input :id="`${knobId}-invalid`" v-model="invalid" type="checkbox" />
        invalid
      </label>

      <label :for="`${knobId}-required`">
        <input :id="`${knobId}-required`" v-model="required" type="checkbox" />
        required
      </label>

      <label :for="`${knobId}-disabled`">
        <input :id="`${knobId}-disabled`" v-model="disabled" type="checkbox" />
        disabled
      </label>
    </fieldset>
  </div>
</template>
