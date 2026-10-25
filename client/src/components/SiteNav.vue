<template>
  <header class="site-header">
    <nav class="site-navigation">
      <router-link to="/" class="wordmark" :aria-label="`${siteSettings.name}，返回首页`" @click="home"><Wordmark v-if="siteSettings.name === 'LUMEN'" /><span v-else class="wordmark-custom">{{ siteSettings.name }}</span></router-link>
      <div class="navigation-links">
        <router-link to="/#collections">{{ locale === 'zh' ? '影集' : 'Collections' }}</router-link>
        <router-link to="/about">{{ locale === 'zh' ? '关于' : 'About' }}</router-link>
        <router-link v-if="authed" to="/admin">{{ t('nav.admin') }}</router-link>
        <router-link v-else to="/login" aria-label="Admin" class="admin-entry">·</router-link>
        <button @click="toggleLocale" :aria-label="locale === 'zh' ? 'Switch to English' : '切换中文'">{{ locale === 'zh' ? 'EN' : '中文' }}</button>
      </div>
    </nav>
  </header>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { siteSettings } from '../lib/site';
import Wordmark from './Wordmark.vue';
import { useRoute } from 'vue-router';
import { getToken } from '../api';
import { locale, t, toggleLocale } from '../lib/i18n';
const route = useRoute();
const authed = computed(() => { void route.fullPath; return !!getToken(); });
function home() { if (route.path === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }
</script>
