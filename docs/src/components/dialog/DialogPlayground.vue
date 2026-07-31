<script setup lang="ts">
/**
 * The Vue half of the Dialog preview: the live component plus its knobs.
 *
 * Deliberately a mirror of DialogPlaygroundReact.tsx. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 *
 * Worth knowing while you play with it: a modal dialog makes the rest of the
 * page `inert`, which includes the framework toggle above and the other panel.
 * That is the component working, not the preview breaking. Close it first.
 */
import { Dialog } from '@caioalfonso/kanso-vue';
import { computed, ref, useId } from 'vue';

const nonModal = ref(false);
const alert = ref(false);
const closeOnEscape = ref(true);

const role = computed(() => (alert.value ? 'alertdialog' : 'dialog'));

// The rule is written for React. <script setup> *is* the component body, so
// Vue's useId() is correctly placed here.
// biome-ignore lint/correctness/useHookAtTopLevel: see above
const knobId = useId();
</script>

<template>
  <div class="preview-stage">
    <Dialog.Root :modal="!nonModal" :role="role" :close-on-escape="closeOnEscape">
      <Dialog.Trigger>Delete project</Dialog.Trigger>

      <Dialog.Positioner>
        <!--
          Only while modal. A scrim over a page you can still use is a lie about
          the state, and it also swallows the clicks that page is meant to
          receive — the backdrop covers the viewport by design.
        -->
        <Dialog.Backdrop v-if="!nonModal" />
        <Dialog.Content>
          <Dialog.Title>Delete this project?</Dialog.Title>
          <Dialog.Description>
            Everything in it goes with it. This cannot be undone.
          </Dialog.Description>
          <Dialog.Close>Keep it</Dialog.Close>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>

    <fieldset class="preview-knobs">
      <legend>Props</legend>

      <label :for="`${knobId}-non-modal`">
        <input :id="`${knobId}-non-modal`" v-model="nonModal" type="checkbox" />
        non-modal
      </label>

      <label :for="`${knobId}-alert`">
        <input :id="`${knobId}-alert`" v-model="alert" type="checkbox" />
        alertdialog
      </label>

      <label :for="`${knobId}-escape`">
        <input :id="`${knobId}-escape`" v-model="closeOnEscape" type="checkbox" />
        closeOnEscape
      </label>
    </fieldset>
  </div>
</template>
