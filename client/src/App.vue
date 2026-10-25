<template>
  <div class="grain min-h-screen">
    <SiteNav />
    <BackgroundMusic />
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
import BackgroundMusic from './components/BackgroundMusic.vue';
const route = useRoute();
onMounted(() => { loadSiteSettings().catch(console.error); });
watch(() => [siteSettings.name, siteSettings.author, route.name], () => {
  if (route.name === 'home') document.title = `${siteSettings.name} · ${siteSettings.author}`;
  else if (route.name !== 'album') document.title = `${route.name === 'about' ? 'About' : route.name === 'admin' ? '管理中心' : '登录'} · ${siteSettings.name}`;
}, { immediate: true });
</script>
