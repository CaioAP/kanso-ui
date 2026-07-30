<script setup lang="ts">
import { Switch } from '@caioalfonso/kanso-vue';
import { ref } from 'vue';

const checked = ref(false);
</script>

<template>
  <Switch v-model="checked" label="Wi-Fi" />
</template>
