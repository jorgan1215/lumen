<template>
  <main class="min-h-screen">
    <!-- 影集头图 -->
    <section class="relative flex h-[70vh] items-end overflow-hidden">
      <div class="absolute inset-0 bg-coal">
        <img
          v-if="album?.cover_url"
          :src="album.cover_url"
          :alt="album.title"
          class="h-full w-full object-cover"
          style="animation: slow-pan 18s ease-in-out infinite alternate"
        />
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40" />

      <div class="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16">
        <p v-if="album" class="fade-up font-mono text-[10px] uppercase tracking-[0.4em] text-gold/80">
          {{ album.subtitle || 'Collection' }}
        </p>
        <h1 v-if="album" class="fade-up mt-3 font-serif text-5xl font-black md:text-7xl" style="animation-delay:0.15s">
          {{ album.title }}
        </h1>
        <div v-if="album" class="fade-up mt-5 flex flex-wrap items-center gap-4 font-mono text-[11px] text-bone/60" style="animation-delay:0.3s">
          <span v-if="album.location">{{ album.location }}</span>
          <span v-if="album.shot_at">· {{ album.shot_at }}</span>
          <span>· {{ album.photos.length }} 张照片</span>
        </div>
      </div>
    </section>

    <!-- 描述 -->
    <section v-if="album?.description" class="mx-auto max-w-3xl px-6 py-16">
      <p v-reveal class="text-center font-serif text-lg leading-loose text-bone/75 md:text-xl">
        {{ album.description }}
      </p>
    </section>

    <!-- 照片墙（瀑布流） -->
    <section class="mx-auto max-w-7xl px-6 pb-32">
      <div v-if="loading" class="py-24 text-center font-mono text-xs tracking-[0.4em] text-bone/40">LOADING…</div>

      <div v-else class="columns-1 gap-5 sm:columns-2 lg:columns-3">
        <figure
          v-for="(photo, i) in album?.photos ?? []"
          :key="photo.id"
          v-reveal:(i % 3) * 100
          class="group relative mb-5 cursor-zoom-in break-inside-avoid overflow-hidden rounded-sm bg-coal"
          @click="open(i)"
        >
          <img
            :src="photo.url"
            :alt="photo.title || photo.description || '照片'"
            loading="lazy"
            class="w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <figcaption
            class="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/85 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          >
            <p v-if="photo.description" class="text-xs text-bone/85">{{ photo.description }}</p>
            <p class="mt-1.5 font-mono text-[10px] tracking-wider text-gold/90">
              {{ [photo.aperture, photo.shutter, photo.iso].filter(Boolean).join(' · ') }}
            </p>
          </figcaption>
        </figure>
      </div>

      <div class="mt-20 text-center">
        <router-link to="/" class="btn-ghost">← 返回全部影集</router-link>
      </div>
    </section>

    <Lightbox
      :photo="current"
      :index="index"
      :total="album?.photos.length ?? 0"
      @close="index = -1"
      @prev="step(-1)"
      @next="step(1)"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api, type AlbumDetail, type Photo } from '../api';
import Lightbox from '../components/Lightbox.vue';

const route = useRoute();
const album = ref<AlbumDetail | null>(null);
const loading = ref(true);
const index = ref(-1);

const current = computed<Photo | null>(() =>
  album.value && index.value >= 0 ? album.value.photos[index.value] : null,
);

function open(i: number) { index.value = i; }
function step(d: number) {
  if (!album.value) return;
  const n = album.value.photos.length;
  index.value = (index.value + d + n) % n;
}

async function load() {
  loading.value = true;
  index.value = -1;
  try {
    album.value = await api.album(route.params.id as string);
    document.title = `${album.value.title} · LUMEN`;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.id, load, { immediate: true });
</script>
