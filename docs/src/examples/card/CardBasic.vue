<script setup lang="ts">
import { Card } from '@caioalfonso/kanso-vue';
</script>

<template>
  <Card.Root as="article">
    <Card.Header>
      <h3><a href="/kanso" data-card-link>Kanso</a></h3>
    </Card.Header>

    <Card.Body>Simplicity by elimination.</Card.Body>

    <Card.Footer>
      <small>4 min read</small>
    </Card.Footer>
  </Card.Root>
</template>
