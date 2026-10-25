<template>
  <transition name="lightbox">
    <div
      v-if="photo"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-ink/95 backdrop-blur-xl"
      @click.self="$emit('close')"
    >
      <!-- 关闭 -->
      <button
        class="absolute right-6 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-bone/70 transition hover:border-gold hover:text-gold"
        @click="$emit('close')"
        aria-label="关闭"
      >✕</button>

      <!-- 上一张 / 下一张 -->
      <button
        class="absolute left-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-2xl text-bone/70 transition hover:border-gold hover:text-gold md:flex"
        @click="$emit('prev')" aria-label="上一张"
      >‹</button>
      <button
        class="absolute right-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-2xl text-bone/70 transition hover:border-gold hover:text-gold md:flex"
        @click="$emit('next')" aria-label="下一张"
      >›</button>

      <div class="lb-stage flex max-h-[92vh] w-full max-w-7xl flex-col items-center gap-5 px-4 md:px-20">
        <img
          :key="photo.id"
          :src="photo.url"
          :alt="photo.title || photo.description || '照片'"
          class="max-h-[62vh] w-auto max-w-full rounded-sm object-contain shadow-2xl shadow-black/60"
        />

        <!-- EXIF 信息条 -->
        <div class="w-full max-w-3xl text-center">
          <p v-if="photo.title" class="font-serif text-lg text-bone">{{ photo.title }}</p>
          <p v-if="photo.description" class="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-bone/60">
            {{ photo.description }}
          </p>

          <div class="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] tracking-wider text-gold/90">
            <span v-if="photo.aperture">◉ {{ photo.aperture }}</span>
            <span v-if="photo.shutter">⏱ {{ photo.shutter }}</span>
            <span v-if="photo.iso">{{ photo.iso.toUpperCase().startsWith('ISO') ? photo.iso.toUpperCase() : 'ISO ' + photo.iso }}</span>
            <span v-if="photo.focal_length">{{ photo.focal_length }}</span>
            <span v-if="photo.camera" class="text-bone/50">{{ photo.camera }}</span>
            <span v-if="photo.taken_at" class="text-bone/50">{{ photo.taken_at }}</span>
          </div>

          <p class="mt-3 font-mono text-[10px] tracking-[0.3em] text-bone/30">
            {{ index + 1 }} / {{ total }}
          </p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue';
import type { Photo } from '../api';

const props = defineProps<{
  photo: Photo | null;
  index: number;
  total: number;
}>();
const emit = defineEmits<{ close: []; prev: []; next: [] }>();

function onKey(e: KeyboardEvent) {
  if (!props.photo) return;
  if (e.key === 'Escape') emit('close');
  if (e.key === 'ArrowLeft') emit('prev');
  if (e.key === 'ArrowRight') emit('next');
}

watch(() => props.photo, (p) => {
  if (p) {
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
  } else {
    window.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>
