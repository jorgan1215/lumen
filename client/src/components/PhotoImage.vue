<template>
  <div
    class="pi-frame"
    :style="frameStyle"
    :class="{ 'pi-frame--fill': fill, 'pi-frame--instant': instant }"
  >
    <!-- 底层：代理图 / 唯一图源 -->
    <img
      v-if="baseSrc"
      ref="baseImg"
      :key="baseAttempt"
      class="pi-layer"
      :class="fitClass"
      :src="baseSrc"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      draggable="false"
      @load="onBaseLoad"
      @error="onBaseError"
    />

    <!-- 上层：原图。加载完成后淡入覆盖代理图 -->
    <img
      v-if="fullVisible"
      ref="fullImg"
      fetchpriority="high"
      class="pi-layer"
      :class="[fitClass, { 'pi-layer--faded': !fullLoaded }]"
      :src="src"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      draggable="false"
      @load="onFullLoad"
      @error="onFullError"
    />

    <Teleport :to="controlsTarget || 'body'" :disabled="!controlsTarget">
    <!-- 原图 / 预览 标识 -->
    <button
      v-if="qualityBadge && controlsVisible"
      type="button"
      :aria-label="showingOriginal ? t('image.original') : t('image.previewHint')"
      :aria-busy="originalRequested && !showingOriginal && !fullFailed"
      @pointerdown.stop
      @dblclick.stop
      @click.stop="requestOriginal"
      class="pi-quality"
      :class="{ 'pi-quality--original': showingOriginal }"
      :title="showingOriginal ? t('image.originalHint') : t('image.previewHint')"
    >
      <svg v-if="showingOriginal" viewBox="0 0 16 16" fill="none" class="h-3 w-3" aria-hidden="true">
        <path d="M6 2H3.2A1.2 1.2 0 0 0 2 3.2V6M10 2h2.8A1.2 1.2 0 0 1 14 3.2V6M6 14H3.2A1.2 1.2 0 0 1 2 12.8V10M10 14h2.8a1.2 1.2 0 0 0 1.2-1.2V10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      </svg>
      <svg v-else viewBox="0 0 16 16" fill="none" class="h-3 w-3" aria-hidden="true">
        <path d="M1.8 9.2c2-3.1 4.4-4.6 6.2-4.6s4.2 1.5 6.2 4.6c-2 3.1-4.4 4.6-6.2 4.6S3.8 12.3 1.8 9.2Z" stroke="currentColor" stroke-width="1.1" />
        <circle cx="8" cy="9.2" r="1.6" stroke="currentColor" stroke-width="1.1" />
      </svg>
      <span class="pi-tooltip">{{ showingOriginal ? t('image.original') : originalRequested && !(fullFailed || originalErrors.has(src)) ? (locale === 'zh' ? '原图加载中…' : 'Loading…') : (fullFailed || originalErrors.has(src)) ? (locale === 'zh' ? '重试原图' : 'Retry') : t('image.preview') }}</span>
    </button>
    <button v-if="qualityBadge && controlsVisible" type="button" class="pi-download" :disabled="downloading" :aria-busy="downloading" :aria-label="locale === 'zh' ? '下载原图' : 'Download original'" :title="downloadError || (locale === 'zh' ? '下载原图' : 'Download original')" @pointerdown.stop @dblclick.stop @click.stop="download">
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
      <span class="pi-tooltip">{{ downloading ? (locale === 'zh' ? '正在开始下载…' : 'Starting download…') : (locale === 'zh' ? '下载' : 'Download') }}</span>
    </button>
    <p v-if="downloadError" class="pi-download-error" role="alert">{{ downloadError }}</p>

    </Teleport>
    <span v-if="originalStatus && showingOriginal" class="pi-original-status" :title="t('image.original')" :aria-label="t('image.original')">
      <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true"><path d="M6 2H2v4m8-4h4v4M2 10v4h4m4 0h4v-4" stroke="currentColor" stroke-width="1.2" /></svg>
    </span>
    <!-- 占位骨架：图片没来之前一直在这里，保证格子不塌、也知道这里有几张 -->
    <div v-if="!ready && !failed" class="pi-skeleton" aria-hidden="true">
      <img :src="siteSettings.logo" class="pi-aperture" alt="" />
    </div>

    <!-- 加载失败：不出现裂图，显示占位框 -->
    <div v-if="failed" class="pi-failed">
      <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6" aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="15" rx="2" stroke="currentColor" stroke-width="1.3" />
        <path d="m3.6 16.2 4.6-4.3 3.6 3.2 3.1-2.7 5.5 5.1" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
        <circle cx="9" cy="9.2" r="1.3" stroke="currentColor" stroke-width="1.1" />
      </svg>
      <span v-if="!minimal" class="pi-failed-text">{{ t('lightbox.failed') }}</span>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { originalReady, originalErrors, originals } from '../lib/originals';
import { siteSettings } from '../lib/site';
import { decodedImage } from '../lib/decodedImages';
import { startPhotoDownload } from '../lib/download';
import { t, locale } from '../lib/i18n';

const props = withDefaults(defineProps<{
  src: string;
  proxy?: string;
  width?: number;
  height?: number;
  alt?: string;
  eager?: boolean;
  fit?: 'cover' | 'contain';
  minimal?: boolean;
  instant?: boolean;
  /** 填满父容器（不按比例占位），用于头图这类固定高度的区域 */
  fill?: boolean;
  /** 只加载代理图，不预载原图（缩略图条、后台列表用） */
  previewOnly?: boolean;
  /** 显示「原图 / 预览」角标 */
  qualityBadge?: boolean;
  controlsVisible?: boolean;
  autoOriginal?: boolean;
  originalStatus?: boolean;
  upgradeOriginal?: boolean;
  photoId?: number;
  albumId?: number;
  controlsTarget?: HTMLElement | null;
}>(), {
  proxy: '',
  width: 0,
  height: 0,
  alt: '',
  eager: false,
  fit: 'cover',
  minimal: false,
  fill: false,
  previewOnly: false,
  qualityBadge: false,
  controlsVisible: true,
  autoOriginal: false,
  originalStatus: false,
});

const emit = defineEmits<{ load: []; error: [] }>();

const baseLoaded = ref(props.instant && Boolean(decodedImage(props.proxy || props.src)));
const baseFailed = ref(false);
const fullLoaded = ref(props.instant && props.src !== (props.proxy || props.src) && Boolean(decodedImage(props.src)));
const fullFailed = ref(false);
const announced = ref(false);

/** 有代理图就先用代理图的地址，否则直接用原图 */
const baseSrc = computed(() => props.proxy || props.src);
const originalRequested = ref(false);
const baseAttempt = ref(0);
const downloading = ref(false);
const downloadError = ref('');
function requestOriginal() {
  originalRequested.value = true; fullFailed.value = false;
  originals.request(props.src, true);
  if (props.src === baseSrc.value && baseFailed.value) { baseFailed.value = false; baseAttempt.value++; }
}
function download() {
  if (downloading.value || !props.src) return;
  downloading.value = true; downloadError.value = '';
  try {
    if (props.photoId) {
      startPhotoDownload(props.photoId, props.albumId, message => { downloadError.value = message; downloading.value = false; });
    } else {
      const link = document.createElement('a'); link.href=props.src; link.target='_blank'; link.rel='noopener';
      link.download='photo';document.body.appendChild(link);link.click();link.remove();
    }
  } catch {
    downloadError.value = locale.value === 'zh' ? '暂时无法下载，请稍后重试。' : 'Download unavailable. Please try again.';
  }
  window.setTimeout(() => { downloading.value = false; }, 1200);
}
const fullVisible = computed(() =>
  !fullFailed.value && Boolean(props.src) && props.src !== baseSrc.value && ((originalReady.has(props.src) && (props.qualityBadge || props.originalStatus || props.upgradeOriginal)) || (!props.previewOnly && !props.qualityBadge))); 
const fitClass = computed(() => (props.fit === 'contain' ? 'object-contain' : 'object-cover'));

const ready = computed(() => baseLoaded.value || fullLoaded.value);

/** 当前画面上是原图，还是代理图 */
const showingOriginal = computed(() => {
  if (!ready.value) return false;
  if (fullLoaded.value) return true;
  return !fullVisible.value && props.src === baseSrc.value;
});

const failed = computed(() => {
  if (ready.value) return false;
  // 纯占位（还没给地址）不算失败，保持骨架
  if (!baseSrc.value) return false;
  if (!baseFailed.value) return false;
  return !fullVisible.value || fullFailed.value;
});

/** 没有宽高信息时先占一个 4:3 的框，图片到了再按真实比例调整 */
const naturalRatio = ref('');
const ratio = computed(() => {
  const w = Number(props.width) || 0;
  const h = Number(props.height) || 0;
  if (w > 0 && h > 0) return `${w} / ${h}`;
  return naturalRatio.value || '4 / 3';
});

const frameStyle = computed(() => (props.fill ? undefined : { aspectRatio: ratio.value }));

function readNatural(e: Event) {
  const img = e.target as HTMLImageElement;
  if (props.width && props.height) return;
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    naturalRatio.value = `${img.naturalWidth} / ${img.naturalHeight}`;
  }
}

function announce() {
  if (announced.value) return;
  if (ready.value) {
    announced.value = true;
    emit('load');
  } else if (failed.value) {
    announced.value = true;
    emit('error');
  }
}

function reset() {
  originalRequested.value = false;
  downloadError.value = '';
  baseLoaded.value = false;
  baseFailed.value = false;
  fullLoaded.value = false;
  fullFailed.value = false;
  announced.value = false;
  naturalRatio.value = '';
}

function onBaseLoad(e: Event) {
  baseLoaded.value = true;
  if (props.src === baseSrc.value) { originalReady.add(props.src); originals.ready.add(props.src); }
  readNatural(e);
  announce();
}
function onBaseError() {
  baseFailed.value = true;
  announce();
}
function onFullLoad(e: Event) {
  fullLoaded.value = true;
  readNatural(e);
  announce();
}
function onFullError() {
  fullFailed.value = true;
  announce();
}

watch(() => [props.src, props.proxy], async () => { reset(); await nextTick(); syncCompleteState(); });

// 兜底：缓存命中时图片可能在监听器挂上之前就已经 complete，
// 这里补一次检查，避免永远停在 0 透明度/骨架状态。
const baseImg = ref<HTMLImageElement | null>(null);
const fullImg = ref<HTMLImageElement | null>(null);

function syncCompleteState() {
  const base = baseImg.value;
  if (base?.complete && base.naturalWidth > 0 && !baseLoaded.value) {
    baseLoaded.value = true;
    if (props.src === baseSrc.value) { originalReady.add(props.src); originals.ready.add(props.src); }
    if (!props.width || !props.height) naturalRatio.value = `${base.naturalWidth} / ${base.naturalHeight}`;
    announce();
  }
  const full = fullImg.value;
  if (full?.complete && full.naturalWidth > 0 && !fullLoaded.value) {
    fullLoaded.value = true;
    announce();
  }
}

watch(() => [props.src, props.autoOriginal], () => { if (props.autoOriginal && props.src) requestOriginal(); }, { immediate: true });
onMounted(() => {
  syncCompleteState();
  window.setTimeout(syncCompleteState, 60);
});
</script>
