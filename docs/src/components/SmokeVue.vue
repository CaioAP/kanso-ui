<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
  <button type="button" data-framework="vue" @click="count++">Vue island: {{ count }}</button>
</template>
