<template>
  <main>
    <!-- HERO -->
    <section class="relative flex h-screen items-center justify-center overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#16161c_0%,#0b0b0e_70%)]" />
      <HeroCanvas />

      <div class="relative z-10 px-6 text-center">
        <p class="fade-up mb-6 font-mono text-[11px] uppercase tracking-[0.5em] text-gold/80" style="animation-delay:0.2s">
          Photography Portfolio
        </p>
        <h1 class="hero-title-in font-serif text-6xl font-black text-bone md:text-8xl" style="animation-delay:0.4s">
          LUMEN
        </h1>
        <p class="fade-up mx-auto mt-8 max-w-md text-sm leading-loose text-bone/55 md:text-base" style="animation-delay:1s">
          光比语言先到达。<br />这里是一些被时间留住的光。
        </p>
      </div>

      <div class="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-center">
        <p class="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-bone/40">Scroll</p>
        <div class="scroll-hint mx-auto h-10 w-px bg-gradient-to-b from-gold to-transparent" />
      </div>

      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
    </section>

    <!-- 影集列表 -->
    <section class="mx-auto max-w-7xl px-6 pb-32 pt-10">
      <div v-reveal class="mb-20 flex items-end justify-between border-b border-white/10 pb-6">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/70">Collections</p>
          <h2 class="mt-2 font-serif text-3xl font-semibold md:text-4xl">影集</h2>
        </div>
        <p class="font-mono text-xs text-bone/40">{{ albums.length }} 集 · {{ totalPhotos }} 张</p>
      </div>

      <div v-if="loading" class="py-32 text-center font-mono text-xs tracking-[0.4em] text-bone/40">LOADING…</div>

      <div v-else-if="!albums.length" class="py-32 text-center text-bone/40">
        还没有影集。到 <router-link to="/admin" class="text-gold underline">后台</router-link> 创建第一个吧。
      </div>

      <div v-else class="space-y-28 md:space-y-40">
        <article
          v-for="(album, i) in albums"
          :key="album.id"
          v-reveal
          class="group grid items-center gap-8 md:grid-cols-12"
        >
          <!-- 封面 -->
          <router-link
            :to="`/album/${album.id}`"
            class="relative block overflow-hidden rounded-sm md:col-span-7"
            :class="i % 2 === 1 ? 'md:order-2' : ''"
          >
            <div class="aspect-[16/10] overflow-hidden bg-coal">
              <img
                :src="album.cover_url"
                :alt="album.title"
                loading="lazy"
                class="h-full w-full object-cover transition-all duration-[1200ms] ease-out group-hover:scale-105"
                :style="{ transform: `translateY(${parallax[i] || 0}px) scale(1.12)` }"
              />
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-60 transition-opacity duration-700 group-hover:opacity-20" />
            <div class="absolute bottom-5 left-5 font-mono text-[10px] tracking-[0.3em] text-bone/80">
              {{ String(album.photo_count ?? 0).padStart(2, '0') }} PHOTOS
            </div>
          </router-link>

          <!-- 文案 -->
          <div class="md:col-span-5" :class="i % 2 === 1 ? 'md:order-1 md:text-right' : ''">
            <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/70">
              {{ album.subtitle || 'Collection' }}
            </p>
            <router-link :to="`/album/${album.id}`">
              <h3 class="mt-3 font-serif text-4xl font-semibold text-bone transition-colors duration-500 hover:text-gold md:text-5xl">
                {{ album.title }}
              </h3>
            </router-link>
            <p class="mt-5 line-clamp-3 text-sm leading-loose text-bone/55">{{ album.description }}</p>
            <div class="mt-6 flex items-center gap-4 font-mono text-[11px] text-bone/40" :class="i % 2 === 1 ? 'md:justify-end' : ''">
              <span v-if="album.location">{{ album.location }}</span>
              <span v-if="album.location && album.shot_at">·</span>
              <span v-if="album.shot_at">{{ album.shot_at }}</span>
            </div>
            <router-link
              :to="`/album/${album.id}`"
              class="mt-8 inline-flex items-center gap-3 border-b border-gold/40 pb-1 text-xs uppercase tracking-[0.3em] text-gold transition-all hover:gap-5 hover:border-gold"
            >
              进入影集 <span aria-hidden="true">→</span>
            </router-link>
          </div>
        </article>
      </div>
    </section>

    <footer class="border-t border-white/5 py-12 text-center">
      <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-bone/30">
        LUMEN · 光影集 — 记录光到达的地方
      </p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { api, type Album } from '../api';
import HeroCanvas from '../components/HeroCanvas.vue';

const albums = ref<Album[]>([]);
const loading = ref(true);
const parallax = ref<Record<number, number>>({});

const totalPhotos = computed(() => albums.value.reduce((s, a) => s + (a.photo_count ?? 0), 0));

let raf = 0;
function onScroll() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const vh = window.innerHeight;
    albums.value.forEach((a, i) => {
      const el = document.querySelectorAll('article')[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const progress = (r.top + r.height / 2 - vh / 2) / vh; // -0.5 ~ 0.5 附近
      parallax.value[a.id] = Math.max(-30, Math.min(30, progress * -36));
    });
  });
}

onMounted(async () => {
  try {
    albums.value = await api.albums();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(raf);
});
</script>
