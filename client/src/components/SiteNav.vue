<template>
  <header class="site-header">
    <nav class="site-navigation">
      <router-link :to="localePath('/')" class="wordmark" :aria-label="`${siteSettings.name}，返回首页`" @click="home"><img :src="siteSettings.logo" class="site-brand-logo" alt="" /><span class="site-brand-title">{{ siteSettings.name }}</span><span v-if="siteSettings.subtitle" class="site-brand-subtitle">{{ siteSettings.subtitle }}</span></router-link>
      <div class="navigation-links">
        <router-link :to="localePath('/#collections')">{{ t('nav.albums') }}</router-link>
        <router-link :to="localePath('/albums')">{{ t('nav.all') }}</router-link>
        <router-link :to="localePath('/about')">{{ locale === 'zh' ? '关于' : 'About' }}</router-link>
        <router-link v-if="authed" :to="localePath('/admin')">{{ t('nav.admin') }}</router-link>
        <router-link v-else :to="localePath('/login')" aria-label="Admin" class="admin-entry">·</router-link>
        <router-link :to="languageLink" :aria-label="locale === 'zh' ? 'Switch to English' : '切换中文'">{{ locale === 'zh' ? 'EN' : '中文' }}</router-link>
        <BackgroundMusic />
      </div>
    </nav>
  </header>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import BackgroundMusic from './BackgroundMusic.vue';
import { siteSettings } from '../lib/site';
import { useRoute } from 'vue-router';
import { getToken } from '../api';
import { locale, t, localePath } from '../lib/i18n';
const route = useRoute();
const languageLink = computed(() => ({path:localePath(route.path, locale.value === 'zh' ? 'en' : 'zh'),query:route.query,hash:route.hash}));
const authed = computed(() => { void route.fullPath; return !!getToken(); });
function home() { if (route.meta.page === 'home') window.scrollTo({ top: 0, behavior: 'smooth' }); }
</script>
