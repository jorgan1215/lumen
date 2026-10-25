<template>
  <div class="grain min-h-screen">
    <SiteNav />
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import SiteNav from './components/SiteNav.vue';
</script>
