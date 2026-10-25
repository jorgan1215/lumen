<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-all duration-500"
    :class="scrolled ? 'bg-ink/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'"
  >
    <nav class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <router-link to="/" class="group flex items-baseline gap-2">
        <span class="font-serif text-xl font-black tracking-[0.25em] text-bone group-hover:text-gold transition-colors">
          LUMEN
        </span>
        <span class="text-[10px] uppercase tracking-[0.3em] text-bone/40">光影集</span>
      </router-link>

      <div class="flex items-center gap-6 text-xs uppercase tracking-[0.25em]">
        <router-link to="/" class="text-bone/60 transition-colors hover:text-gold">影集</router-link>
        <router-link
          v-if="authed"
          to="/admin"
          class="text-bone/60 transition-colors hover:text-gold"
        >
          管理
        </router-link>
        <router-link
          v-else
          to="/login"
          class="text-bone/30 transition-colors hover:text-gold"
          title="管理入口"
        >
          ·
        </router-link>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getToken } from '../api';

const scrolled = ref(false);
const tick = ref(0);
const authed = computed(() => (tick.value, !!getToken()));

const onScroll = () => { scrolled.value = window.scrollY > 40; };
const onStorage = () => { tick.value++; };

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('storage', onStorage);
  onScroll();
});
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('storage', onStorage);
});
</script>
