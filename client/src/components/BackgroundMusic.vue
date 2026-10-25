<template>
  <div v-if="source" class="music-player">
    <audio ref="audio" :src="source" :volume="volume" loop preload="none" @error="failed = true; playing = false" @ended="playing = false" />
    <button :aria-label="playing ? '暂停背景音乐' : '播放背景音乐'" :aria-pressed="playing" :title="failed ? '音源无法播放，请检查地址' : playing ? '暂停背景音乐' : '播放背景音乐'" @click="toggle">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 18V5l10-2v13M10 8l10-2" stroke="currentColor" stroke-width="1.3"/><ellipse cx="6.5" cy="18" rx="3.5" ry="2.5" stroke="currentColor" stroke-width="1.3"/><ellipse cx="16.5" cy="16" rx="3.5" ry="2.5" stroke="currentColor" stroke-width="1.3"/><path v-if="!playing" d="m3 3 18 18" stroke="currentColor" stroke-width="1.2"/></svg>
    </button>
    <span v-if="failed" role="status">音源暂不可用</span>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { api } from '../api';
const source = ref(''), volume = ref(.25), audio = ref<HTMLAudioElement | null>(null), playing = ref(false), failed = ref(false);
async function load() { try { const site = await api.site(); if (source.value !== site.musicUrl) { audio.value?.pause(); playing.value = false; failed.value = false; source.value = site.musicUrl || ''; } volume.value = Math.max(0, Math.min(1, site.musicVolume ?? .25)); await nextTick(); if (audio.value) audio.value.volume = volume.value; } catch {} }
async function toggle() { if (!audio.value) return; failed.value = false; if (playing.value) { audio.value.pause(); playing.value = false; } else { try { await audio.value.play(); playing.value = true; } catch { failed.value = true; playing.value = false; } } }
watch(audio, el => { if (el) el.volume = volume.value; });
onMounted(() => { load(); window.addEventListener('lumen:settings-updated', load); });
onUnmounted(() => { audio.value?.pause(); window.removeEventListener('lumen:settings-updated', load); });
</script>
