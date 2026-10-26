<template>
  <main class="archive-page">
    <header class="collection-heading archive-heading">
      <div><p class="editorial-label">THE COLLECTION ARCHIVE</p><h1>{{ t('archive.title') }}</h1><p class="archive-intro">{{ t('archive.intro') }}</p><div class="gold-rule" /></div>
      <p v-if="!loading && !error" class="archive-total">{{ t('archive.count', { n: albums.length }) }}<span>{{ dateRange }}</span></p>
    </header>
    <p v-if="loading" role="status" class="archive-status">{{ t('common.loading') }}</p>
    <p v-else-if="error" role="alert" class="archive-status">{{ error }}</p>
    <p v-else-if="!albums.length" class="archive-status">{{ t('archive.empty') }}</p>
    <div v-else class="archive-layout">
      <nav class="archive-index" :aria-label="locale === 'zh' ? '按年份浏览' : 'Browse by year'">
        <a v-for="group in timeline" :key="group.year" :href="`#year-${group.year || 'undated'}`" @click.prevent="goToYear(group.year)">{{ group.year || t('archive.undated') }}<span>{{ String(group.count).padStart(2, '0') }}</span></a>
      </nav>
      <div class="archive-timeline">
        <section v-for="group in timeline" :id="`year-${group.year || 'undated'}`" :key="group.year" class="archive-year" :aria-labelledby="`label-${group.year || 'undated'}`">
          <header class="archive-year-heading"><h2 :id="`label-${group.year || 'undated'}`">{{ group.year || t('archive.undated') }}</h2><span>{{ t('archive.count', { n: group.count }) }}</span></header>
          <section v-for="month in group.months" :key="month.month" class="archive-month">
            <h3 class="archive-month-label"><span>{{ month.month || '—' }}</span>{{ monthLabel(group.year, month.month) }}</h3>
            <div class="archive-entries"><CollectionEntry v-for="album in month.albums" :key="album.id" :album="album" /></div>
          </section>
        </section>
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, type Album } from '../api';
import CollectionEntry from '../components/CollectionEntry.vue';
import { groupAlbumTimeline } from '../lib/albumTimeline';
import { locale, t } from '../lib/i18n';
const albums = ref<Album[]>([]), loading = ref(true), error = ref('');
const timeline = computed(() => groupAlbumTimeline(albums.value));
const dateRange = computed(() => {
  const years = timeline.value.map(group => group.year).filter(Boolean);
  return years.length ? [...new Set([years[years.length - 1], years[0]])].join(' — ') : '';
});
function monthLabel(year: string, month: string) {
  if (!year) return t('archive.unrecorded');
  if (!month) return t('archive.noMonth');
  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
}
function goToYear(year: string) {
  document.getElementById(`year-${year || 'undated'}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}
onMounted(async () => {
  try { albums.value = await api.albums(); }
  catch (e: any) { error.value = e.message; }
  finally { loading.value = false; }
});
</script>
