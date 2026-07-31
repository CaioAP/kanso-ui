<script setup lang="ts">
/**
 * The Vue half of the Card preview: the live component plus its knobs.
 *
 * Deliberately a mirror of CardPlaygroundReact.tsx.
 *
 * The `whole-card link` knob is the teaching one. With it on, the card has a
 * single link whose click area covers everything — and the second button in the
 * footer becomes unreachable by pointer, which is the pattern telling you this
 * card has two actions and should not be one big link.
 */
import { Card } from '@caioalfonso/kanso-vue';
import { ref, useId } from 'vue';

const as = ref<'div' | 'article' | 'section'>('article');
const wholeCardLink = ref(false);

// The rule is written for React. <script setup> *is* the component body, so
// Vue's useId() is correctly placed here.
// biome-ignore lint/correctness/useHookAtTopLevel: see above
const knobId = useId();
</script>

<template>
  <div class="preview-stage">
    <Card.Root :as="as" class="preview-card">
      <Card.Header>
        <h3 class="preview-card-title">
          <a
            href="#kanso"
            :data-card-link="wholeCardLink ? '' : undefined"
          >Kanso</a>
        </h3>
      </Card.Header>

      <Card.Body>Simplicity through the elimination of clutter.</Card.Body>

      <Card.Footer>
        <button type="button" data-secondary>Save for later</button>
      </Card.Footer>
    </Card.Root>

    <fieldset class="preview-knobs">
      <legend>Props</legend>

      <label :for="`${knobId}-as`">
        as
        <select :id="`${knobId}-as`" v-model="as">
          <option value="div">div</option>
          <option value="article">article</option>
          <option value="section">section</option>
        </select>
      </label>

      <label :for="`${knobId}-link`">
        <input :id="`${knobId}-link`" v-model="wholeCardLink" type="checkbox" />
        whole-card link
      </label>
    </fieldset>
  </div>
</template>
