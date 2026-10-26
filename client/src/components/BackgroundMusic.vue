<template>
  <div v-if="source" class="music-player" :class="{ 'is-buffering': pending }">
    <audio ref="audio" :src="source" loop preload="auto" @playing="onPlaying" @pause="playing = false" @waiting="onWaiting" @error="onError" />
    <button :aria-label="playing || pending ? (locale === 'zh' ? '暂停背景音乐' : 'Pause background music') : (locale === 'zh' ? '播放背景音乐' : 'Play background music')" :aria-pressed="playing || pending" :aria-busy="pending" :title="failed ? '音源无法播放，请检查地址' : pending ? '音乐加载中，点击暂停' : playing ? '暂停背景音乐' : '播放背景音乐'" @click="toggle">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 18V5l10-2v13M10 8l10-2" stroke="currentColor" stroke-width="1.3"/><ellipse cx="6.5" cy="18" rx="3.5" ry="2.5" stroke="currentColor" stroke-width="1.3"/><ellipse cx="16.5" cy="16" rx="3.5" ry="2.5" stroke="currentColor" stroke-width="1.3"/><path v-if="!playing && !pending" d="m3 3 18 18" stroke="currentColor" stroke-width="1.2"/></svg>
    </button>
    <span v-if="failed" role="status" class="music-error">{{ locale === 'zh' ? '音源暂不可用，点击重试' : 'Audio unavailable. Tap to retry.' }}</span>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { api } from '../api';
import { DEFAULT_MUSIC_URL } from '../lib/music';
import { locale } from '../lib/i18n';
const source = ref(DEFAULT_MUSIC_URL), volume = ref(.25), audio = ref<HTMLAudioElement | null>(null), playing = ref(false), pending = ref(false), failed = ref(false);
let wanted = true, needsGesture = true, attempt = 0;
function play() {
  const el = audio.value;
  if (!el || !source.value || pending.value) return;
  wanted = true; failed.value = false; pending.value = true;
  el.volume = volume.value;
  const id = ++attempt;
  // Call play synchronously inside the user's gesture; don't wait for another event or API call.
  el.play().then(() => {
    if (id !== attempt || !wanted) return;
    playing.value = true; pending.value = false; needsGesture = false;
  }).catch((error: DOMException) => {
    if (id !== attempt) return;
    pending.value = false; playing.value = false;
    needsGesture = error.name === 'NotAllowedError';
    failed.value = !needsGesture && error.name !== 'AbortError';
  });
}
function toggle() {
  if (playing.value || pending.value) {
    wanted = false; needsGesture = false; attempt++;
    pending.value = false; playing.value = false; audio.value?.pause();
  } else { play(); }
}
function onPlaying() { if (!wanted) { audio.value?.pause(); return; } playing.value = true; pending.value = false; needsGesture = false; }
function onWaiting() { if (wanted && audio.value && !audio.value.paused) pending.value = true; }
function onError() { attempt++; failed.value = true; playing.value = false; pending.value = false; }
function unlockPlayback(e: Event) {
  if ((e.target as Element)?.closest?.('.music-player')) return;
  if (wanted && needsGesture && !playing.value && !pending.value) play();
}
async function load() {
  try {
    const site = await api.site();
    const changed = source.value !== (site.musicUrl || DEFAULT_MUSIC_URL);
    if (changed) { attempt++; audio.value?.pause(); playing.value = false; pending.value = false; failed.value = false; source.value = site.musicUrl || DEFAULT_MUSIC_URL; }
    volume.value = Math.max(0, Math.min(1, site.musicVolume ?? .25));
    await nextTick();
    if (audio.value) audio.value.volume = volume.value;
    if (source.value && wanted && (changed || !playing.value)) play();
  } catch {}
}
watch(audio, el => { if (el) el.volume = volume.value; });
onMounted(() => { load(); window.addEventListener('lumen:settings-updated', load); window.addEventListener('pointerdown', unlockPlayback, {passive:true}); window.addEventListener('keydown', unlockPlayback); });
onUnmounted(() => { attempt++; audio.value?.pause(); window.removeEventListener('lumen:settings-updated', load); window.removeEventListener('pointerdown', unlockPlayback); window.removeEventListener('keydown', unlockPlayback); });
</script>
