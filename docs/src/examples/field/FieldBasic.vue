<script setup lang="ts">
import { Field, Input } from '@caioalfonso/kanso-vue';
import { ref } from 'vue';

const email = ref('');
const invalid = ref(false);
</script>

<template>
  <Field :invalid="invalid" required>
    <template #label>Email</template>
    <template #description>We only use this to sign you in.</template>
    <template #error-text>Enter an email address.</template>

    <Input
      v-model="email"
      type="email"
      @blur="invalid = email === ''"
    />
  </Field>
</template>
