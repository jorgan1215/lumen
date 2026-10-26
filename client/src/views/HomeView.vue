<template>
  <main>
    <section class="featured-gallery" aria-label="Featured photographs" @focusin="paused = true" @focusout="paused = false">
      <div v-for="(slide, i) in slides" :key="slide.url + i" class="featured-slide" :class="{ active: i === active }" :aria-hidden="i !== active">
        <img v-if="i === active || i === (active + 1) % slides.length || i === (active - 1 + slides.length) % slides.length" :src="slide.url" :alt="pick(slide.caption, slide.caption_en)" :fetchpriority="i === 0 ? 'high' : 'auto'" />
      </div>
      <div v-if="!slides.length" class="featured-empty" />
      <div class="featured-shade" />
      <template v-if="slides.length > 1">
        <GalleryArrow direction="prev" class="featured-arrow previous" aria-label="上一张精选图" @click="step(-1)" />
        <GalleryArrow direction="next" class="featured-arrow next" aria-label="下一张精选图" @click="step(1)" />
        <div class="featured-dots"><button v-for="(_, i) in slides" :key="i" :class="{ active: i === active }" :aria-label="`精选图 ${i + 1}`" :aria-current="i === active ? 'true' : undefined" @click="select(i)" /></div>
      </template>
      <p v-if="slides[active]?.caption" class="featured-caption" :key="active">{{ pick(slides[active].caption, slides[active].caption_en) }}</p>
    </section>
    <section id="collections" class="collections-section">
      <header class="collection-heading"><p class="editorial-label">SELECTED COLLECTIONS</p><h1>{{ t('home.albums') }}</h1><div class="gold-rule" /></header>
      <p v-if="error" role="alert">{{ error }}</p>
      <div v-if="loading" class="py-24 text-center text-gold">{{ t('common.loading') }}</div>
      <p v-else-if="!albums.length" class="py-24 text-center">{{ t('home.noAlbums') }}</p>
      <div v-else class="collection-list">
        <CollectionEntry v-for="(album, i) in albums" :key="album.id" :album="album" :reverse="i % 2 === 1" />
      </div>
      <router-link :to="localePath('/albums')" class="archive-link">{{ t('archive.browse') }} <span aria-hidden="true">↗</span></router-link>
    </section>
  </main>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { siteSettings, applySiteSettings } from '../lib/site';
import GalleryArrow from '../components/GalleryArrow.vue';
import { api, type Album, type HeroSlide } from '../api';
import CollectionEntry from '../components/CollectionEntry.vue';
import { pick, t , localePath } from '../lib/i18n';
const albums = ref<Album[]>([]), slides = ref<HeroSlide[]>([]);
const active = ref(0), loading = ref(true), paused = ref(false), error = ref('');
let timer = 0, interval = 5;
function schedule() { window.clearInterval(timer); timer = window.setInterval(() => { if (!paused.value && !document.hidden && slides.value.length > 1) active.value = (active.value + 1) % slides.value.length; }, interval * 1000); }
function select(i: number) { active.value = i; schedule(); }
function step(d: number) { select((active.value + d + slides.value.length) % slides.value.length); }
onMounted(async () => {
  document.title = `${siteSettings.name} · ${siteSettings.author}`;
  try {
    const [site, list] = await Promise.all([api.site(), api.albums()]);
    applySiteSettings(site);
    albums.value = list.filter(album => album.featured);
    slides.value = site.heroSlides?.length ? site.heroSlides : site.heroImage ? [{ url: site.heroImage, caption: '' }] : albums.value.filter(a => a.cover_url).map(a => ({ url: a.cover_url, caption: pick(a.description, a.description_en) }));
    interval = Math.max(2, site.heroInterval || 5); schedule();
  } catch(e: any) { error.value = e.message; } finally { loading.value = false; }
});
onUnmounted(() => window.clearInterval(timer));
</script>
