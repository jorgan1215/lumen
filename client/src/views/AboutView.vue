<template>
  <main class="about-page">
    <p class="editorial-label">BEHIND THE LENS</p>
    <div class="about-layout">
      <div><h1>{{ site?.aboutTitle || siteSettings.author }}</h1><div class="gold-rule" /><p class="about-copy">{{ site?.aboutBody || (locale === 'zh' ? '以影像，收藏光与时间。' : 'Collecting light and time through photography.') }}</p></div>
      <PhotoImage v-if="site?.aboutImage" :src="site.aboutImage" :alt="site.aboutTitle" eager />
    </div>
    <p v-if="!site?.musicUrl || site.musicUrl === DEFAULT_MUSIC_URL" class="about-music-credit">Music: “Meditation Impromptu 01” by <a href="https://incompetech.com/" target="_blank" rel="noopener">Kevin MacLeod</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></p>
    <p v-if="error" role="alert">{{ error }}</p>
  </main>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, type SiteInfo } from '../api';
import { DEFAULT_MUSIC_URL } from '../lib/music';
import { locale } from '../lib/i18n';
import { siteSettings } from '../lib/site';
import PhotoImage from '../components/PhotoImage.vue';
const site = ref<SiteInfo | null>(null);
const error = ref('');
onMounted(async () => { document.title = `About · ${siteSettings.name}`; try { site.value = await api.site(); } catch(e: any) { error.value = e.message; } });
</script>
