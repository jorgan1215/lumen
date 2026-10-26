<template>
  <article v-reveal class="collection-entry" :class="{ reverse }">
    <router-link :to="link" class="gilded-cover" :aria-label="pick(album.title, album.title_en)">
      <div class="cover-image"><PhotoImage preview-only :src="album.cover_url" :proxy="album.cover_proxy_url || ''" fill :alt="pick(album.title, album.title_en)" /></div>
      <span v-if="album.locked" class="cover-lock" :aria-label="t('home.locked')">🔒</span>
    </router-link>
    <div class="collection-copy">
      <p class="editorial-label">{{ album.subtitle || 'COLLECTION' }}</p>
      <router-link :to="link"><h2>{{ pick(album.title, album.title_en) }}</h2></router-link>
      <p class="collection-description">{{ pick(album.description, album.description_en) }}</p>
      <p class="collection-location">{{ [pick(album.location, album.location_en), album.shot_at].filter(Boolean).join(' · ') }}</p>
    </div>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { Album } from '../api';
import { pick, t, localePath } from '../lib/i18n';
import PhotoImage from './PhotoImage.vue';
const props = defineProps<{ album: Album; reverse?: boolean }>();
const link = computed(() => localePath(`/album/${props.album.key || props.album.slug || props.album.id}`));
</script>
