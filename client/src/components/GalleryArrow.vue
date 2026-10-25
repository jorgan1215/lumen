<template>
  <button type="button" class="gallery-arrow">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" :class="{ 'arrow-reversed': direction === 'prev' }">
      <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" />
    </svg>
  </button>
</template>
<script setup lang="ts">
defineProps<{ direction: 'prev' | 'next' }>();
</script>
