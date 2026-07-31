<script setup lang="ts">
import { Button } from '@caioalfonso/kanso-vue';
import { ref } from 'vue';

const saving = ref(false);

async function save() {
  saving.value = true;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  saving.value = false;
}
</script>

<template>
  <Button :loading="saving" @click="save">Save changes</Button>
</template>
