<template>
  <div class="grain min-h-screen">
    <SiteNav />
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <footer class="site-copyright">© {{ new Date().getFullYear() }} {{ siteSettings.author }}. <span>All rights reserved.</span></footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { siteSettings, loadSiteSettings } from './lib/site';
import SiteNav from './components/SiteNav.vue';
import { t, locale } from './lib/i18n';
const route = useRoute();
onMounted(() => { loadSiteSettings().catch(console.error); });
watch(() => [siteSettings.name, siteSettings.author, route.meta.page, locale.value], () => {
  if (route.meta.page === 'home') document.title = `${siteSettings.name} · ${siteSettings.author}`;
  else if (route.meta.page !== 'album') document.title = `${route.meta.page === 'albums' ? t('archive.title') : route.meta.page === 'about' ? 'About' : route.meta.page === 'admin' ? '管理中心' : '登录'} · ${siteSettings.name}`;
}, { immediate: true });
</script>
