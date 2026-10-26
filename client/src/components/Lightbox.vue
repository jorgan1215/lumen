<template>
  <transition name="lightbox">
    <div v-if="photo" class="photo-lightbox fixed inset-0 z-[70] overflow-hidden" :class="{'has-filmstrip': items.length > 1}">
      <header class="lb-header" @wheel.prevent="onWheel">
        <p v-if="titleText" class="lb-title">{{ titleText }}</p>
        <div class="lb-toolbar">
          <div class="lb-zoom-tools">
            <button class="lb-tool" :title="`${t('lightbox.zoomOut')} (-)`" @click="zoomBy(1 / 1.3)">−</button>
            <button class="lb-zoom-value" :title="`${t('lightbox.reset')} (0)`" @click="resetZoom">{{ Math.round(scale * 100) }}%</button>
            <button class="lb-tool" :title="`${t('lightbox.zoomIn')} (+)`" @click="zoomBy(1.3)">+</button>
          </div>
          <button class="lb-tool lb-close-tool" :title="`${t('common.close')} (Esc)`" @click="$emit('close')">✕</button>
        </div>
      </header>

      <div ref="stage" style="touch-action:none" role="dialog" aria-modal="true" :aria-label="titleText || (locale === 'zh' ? '照片查看器' : 'Photo viewer')" class="lb-stage" :class="{'lb-stage-zoomed': scale > 1}"
        @wheel.prevent="onWheel" @dblclick="onDoubleClick" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp" @click="onStageClick">
        <div ref="viewport" class="lb-viewport" @click.self="onStageClick">
          <div ref="imageBox" class="lb-box" :class="{'is-dragging':dragging}" :style="[boxStyle,transformStyle]">
            <PhotoImage :key="photo.id" :photo-id="photo.id" :album-id="photo.album_id" :controls-target="controlHost" :src="photo.url" :proxy="photo.proxy_url" :width="photo.width" :height="photo.height" :alt="titleText || descriptionText || t('common.photo')" fit="contain" fill eager instant quality-badge auto-original @load="onViewerImageLoad" :controls-visible="scale <= 1.01" />
          </div>
          <div ref="controlHost" class="lb-controls" style="width:100%;height:100%" />
        </div>
        <GalleryArrow direction="prev" class="lightbox-nav previous" @pointerdown.stop @click.stop="$emit('prev')" :aria-label="t('lightbox.prev')" />
        <GalleryArrow direction="next" class="lightbox-nav next" @pointerdown.stop @click.stop="$emit('next')" :aria-label="t('lightbox.next')" />
      </div>

      <div v-show="scale <= 1.01" class="lb-information" @wheel.prevent="onWheel">
        <p v-if="descriptionText" class="lb-description">{{ descriptionText }}</p>
        <div class="lb-metadata">
          <div class="lb-exposure">
            <span v-if="photo.aperture">{{ photo.aperture.replace(/^f/i,'f') }}</span>
            <span v-if="photo.shutter">{{ photo.shutter }}</span>
            <span v-if="photo.iso">{{ isoText }}</span>
            <span v-if="photo.focal_length">{{ photo.focal_length }}</span>
          </div>
          <div class="lb-equipment">
            <span v-if="photo.camera">{{ cameraText }}</span>
            <span v-if="photo.lens">{{ photo.lens }}</span>
            <span v-if="photo.taken_at">{{ photo.taken_at }}</span>
          </div>
        </div>
      </div>
      <footer v-if="items.length > 1" v-show="scale <= 1.01" class="lb-filmstrip" :style="filmstripStyle" @wheel.prevent.stop="onFilmstripWheel">
        <div ref="strip" class="lb-thumbnail-strip">
          <button v-for="(item,i) in items" :key="item.id" class="lb-thumbnail" :class="{'is-current':i === index}" :aria-label="`${locale === 'zh' ? '查看照片' : 'View photo'} ${i+1}`" :aria-current="i === index ? 'true' : undefined" @click="$emit('select',i)">
            <PhotoImage :src="item.url" :proxy="item.proxy_url" fill preview-only minimal instant :alt="`${i+1}`" />
          </button>
        </div>
      </footer>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import type { Photo } from '../api';
import PhotoImage from './PhotoImage.vue';
import { originalReady } from '../lib/originals';
import { warmImage, decodedImage } from '../lib/decodedImages';
import GalleryArrow from './GalleryArrow.vue';
import { anchoredTranslation, pinchTranslation, swipeDirection } from '../lib/viewerMath';
import { cleanCamera, formatIso } from '../lib/format';
import { pick, t, locale } from '../lib/i18n';

const props = defineProps<{
  photo: Photo | null;
  index: number;
  total: number;
  items?: Photo[];
}>();

const emit = defineEmits<{ close: []; prev: []; next: []; select: [index: number] }>();

const items = computed(() => props.items ?? []);
const isoText = computed(() => formatIso(props.photo?.iso));
const titleText = computed(() => pick(props.photo?.title, props.photo?.title_en));
const descriptionText = computed(() => pick(props.photo?.description, props.photo?.description_en));
const cameraText = computed(() => cleanCamera(props.photo?.camera));

const stage = ref<HTMLElement | null>(null);
const viewport = ref<HTMLElement | null>(null);
const strip = ref<HTMLElement | null>(null);
const imageBox = ref<HTMLElement | null>(null);
const controlHost = ref<HTMLElement | null>(null);
const viewportSize = ref({ width: 0, height: 0 });
const naturalSize = ref({ width: 0, height: 0 });
function onViewerImageLoad() {
  const image = imageBox.value?.querySelector<HTMLImageElement>('img.pi-layer');
  if (image?.naturalWidth && image.naturalHeight) naturalSize.value = {width:image.naturalWidth,height:image.naturalHeight};
}
watch(() => props.photo?.id, () => { naturalSize.value = {width:0,height:0}; }, {flush:'sync'});
let resizeObserver: ResizeObserver | undefined;
watch(viewport, el => { resizeObserver?.disconnect(); if (el) { resizeObserver = new ResizeObserver(([entry]) => { viewportSize.value = { width: entry.contentRect.width, height: entry.contentRect.height }; clampPan(); }); resizeObserver.observe(el); } });

const filmstripStyle = computed(() => {
  const mobile = viewportSize.value.width < 768;
  const width = items.value.length * (mobile ? 36 : 44) + Math.max(0, items.value.length - 1) * 5 + 16;
  return {width: `min(${width}px, ${mobile ? 82 : 88}vw)`};
});

// ---------- 缩放 / 平移 ----------
const scale = ref(1);
const tx = ref(0);
const ty = ref(0);
const dragging = ref(false);

const boxStyle = computed(() => {
  const w = Number(props.photo?.width) || naturalSize.value.width;
  const h = Number(props.photo?.height) || naturalSize.value.height;
  const cached = decodedImage(props.photo?.url || '') || decodedImage(props.photo?.proxy_url || '');
  const ratio = w > 0 && h > 0 ? w / h : cached ? cached.naturalWidth / cached.naturalHeight : 1.5;
  const area = viewportSize.value;
  const width = Math.min(area.width || window.innerWidth, (area.height || window.innerHeight) * ratio);
  return { width: `${width}px`, height: `${width / ratio}px` };

});

const transformStyle = computed(() => ({
  transform: `translate3d(${tx.value}px, ${ty.value}px, 0) scale(${scale.value})`,
}));

const MAX_SCALE = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampPan() {
  const el = viewport.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const mx = Math.max(0, ((imageBox.value?.offsetWidth || rect.width) * scale.value - rect.width) / 2);
  const my = Math.max(0, ((imageBox.value?.offsetHeight || rect.height) * scale.value - rect.height) / 2);
  tx.value = clamp(tx.value, -mx, mx);
  ty.value = clamp(ty.value, -my, my);
}

function resetZoom() {
  scale.value = 1;
  tx.value = 0;
  ty.value = 0;
}

/** 以舞台中心为原点的缩放，point 为相对中心的坐标 */
function zoomAt(next: number, pointX = 0, pointY = 0) {
  const target = clamp(next, 1, MAX_SCALE);
  if (target === scale.value) return;
  tx.value = anchoredTranslation(pointX, tx.value, scale.value, target);
  ty.value = anchoredTranslation(pointY, ty.value, scale.value, target);
  scale.value = target;
  if (target === 1) {
    tx.value = 0;
    ty.value = 0;
  } else {
    clampPan();
  }
}

function zoomBy(factor: number) {
  zoomAt(scale.value * factor);
}

let wheelSwitchAmount = 0;
let lastWheelEvent = 0;
let lastWheelSwitch = -Infinity;
let wheelFrame = 0;
let queuedDirection = 0;
function onFilmstripWheel(e: WheelEvent) {
  const now = performance.now();
  const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 500 : 1);
  if (!delta || items.value.length < 2) return;
  if (now - lastWheelEvent > 160 || Math.sign(delta) !== Math.sign(wheelSwitchAmount)) wheelSwitchAmount = 0;
  lastWheelEvent = now;
  wheelSwitchAmount += delta;
  // A wheel detent changes a photo immediately; a trackpad needs a short intentional movement.
  if (Math.abs(wheelSwitchAmount) < 24 || now - lastWheelSwitch < 110) return;
  queuedDirection = Math.sign(wheelSwitchAmount); wheelSwitchAmount = 0;
  if (!wheelFrame) wheelFrame = requestAnimationFrame(() => {
    wheelFrame = 0; lastWheelSwitch = performance.now();
    emit(queuedDirection > 0 ? 'next' : 'prev');
  });
}
function onWheel(e: WheelEvent) {
  const el = viewport.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
  const pointX = e.clientX - rect.left - rect.width / 2;
  const pointY = e.clientY - rect.top - rect.height / 2;
  const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
  const factor = Math.min(1.4, Math.max(0.7, Math.exp(-delta * 0.0012)));
  zoomAt(scale.value * factor, pointX, pointY);
}

function onDoubleClick(e: MouseEvent) {
  const el = viewport.value;
  if (!el) return;
  if (scale.value > 1.05) {
    resetZoom();
    return;
  }
  const rect = el.getBoundingClientRect();
  zoomAt(2.5, e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2);
}

// ---------- 指针：拖动 + 双指捏合 ----------
const pointers = new Map<number, { x: number; y: number }>();
let dragStart = { x: 0, y: 0, tx: 0, ty: 0 };
let hadPinch = false;
let startedOnBackdrop = false;
let pinchStart: { dist: number; scale: number; tx: number; ty: number; cx: number; cy: number } | null = null;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function stageCenter() {
  const rect = viewport.value?.getBoundingClientRect();
  if (!rect) return { cx: 0, cy: 0 };
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  startedOnBackdrop = e.target === stage.value || e.target === viewport.value;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

  if (pointers.size === 2) {
    // 双指捏合时接管指针，避免误触背景关闭
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  if (scale.value > 1) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  if (pointers.size === 1) {
    hadPinch = false;
    dragging.value = false;
    dragStart = { x: e.clientX, y: e.clientY, tx: tx.value, ty: ty.value };
  } else if (pointers.size === 2) {
    hadPinch = true;
    const [a, b] = [...pointers.values()];
    const { cx, cy } = stageCenter();
    pinchStart = {
      dist: distance(a, b) || 1,
      scale: scale.value,
      tx: tx.value,
      ty: ty.value,
      cx: (a.x + b.x) / 2 - cx,
      cy: (a.y + b.y) / 2 - cy,
    };
    dragging.value = false;
  }
}

function onPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size >= 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    const next = clamp(pinchStart.scale * (distance(a, b) / pinchStart.dist), 1, MAX_SCALE);
    scale.value = next;
    const { cx, cy } = stageCenter();
    tx.value = pinchTranslation(pinchStart.cx, (a.x + b.x) / 2 - cx, pinchStart.tx, pinchStart.scale, next);
    ty.value = pinchTranslation(pinchStart.cy, (a.y + b.y) / 2 - cy, pinchStart.ty, pinchStart.scale, next);
    clampPan();
    return;
  }

  if (scale.value > 1) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragging.value = true;
    tx.value = dragStart.tx + dx;
    ty.value = dragStart.ty + dy;
    clampPan();
  }
}

function onPointerUp(e: PointerEvent) {
  if (e.type !== 'pointercancel' && e.pointerType === 'touch' && pointers.size === 1 && !hadPinch && scale.value <= 1.01) {
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    const direction = swipeDirection(dx, dy, scale.value, hadPinch);
    if (direction) { dragging.value = true; emit(direction > 0 ? 'next' : 'prev'); }
  }
  pointers.delete(e.pointerId);
  const el = e.currentTarget as HTMLElement;
  if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  if (pointers.size < 2) {
    pinchStart = null;
    const remaining = [...pointers.values()][0];
    if (remaining) dragStart = { x: remaining.x, y: remaining.y, tx: tx.value, ty: ty.value };
  }
  if (pointers.size === 0) {
    window.setTimeout(() => { dragging.value = false; }, 0);
  }
}

function onStageClick(e: MouseEvent) {
  if (dragging.value) return;
  if (startedOnBackdrop && e.target === stage.value) emit('close');
}

// ---------- 键盘 ----------
function onKey(e: KeyboardEvent) {
  if (!props.photo) return;
  switch (e.key) {
    case 'Escape': emit('close'); break;
    case 'ArrowLeft': emit('prev'); break;
    case 'ArrowRight': emit('next'); break;
    case '+':
    case '=': zoomBy(1.3); break;
    case '-':
    case '_': zoomBy(1 / 1.3); break;
    case '0': resetZoom(); break;
    default: break;
  }
}

let thumbFrame = 0;
function scrollActiveThumb() {
  if (thumbFrame) cancelAnimationFrame(thumbFrame);
  thumbFrame = requestAnimationFrame(() => {
    thumbFrame = 0;
    const host = strip.value;
    const el = host?.children[props.index] as HTMLElement | undefined;
    if (!host || !el) return;
    const left = el.offsetLeft, right = left + el.offsetWidth;
    if (left < host.scrollLeft || right > host.scrollLeft + host.clientWidth) {
      host.scrollTo({left: left - (host.clientWidth-el.offsetWidth)/2, behavior:'instant' as ScrollBehavior});
    }
  });
}
// Decode only current/adjacent cached originals (or their proxies), with a bounded decoded-image budget.
watch(() => [props.photo?.id, ...[-1,0,1].map(offset => {
  const n = items.value.length;
  const p = n ? items.value[(props.index+offset+n)%n] : undefined;
  return p ? (originalReady.has(p.url) ? p.url : p.proxy_url || p.url) : '';
})], ([id,...urls]) => { if (id) for (const url of urls) if (typeof url === 'string') warmImage(url); }, {immediate:true});

watch(() => props.photo?.id, (id, prev) => {
  if (id && !prev) {
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
  } else if (!id) {
    window.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
  pointers.clear(); pinchStart = null; hadPinch = false;
  resetZoom();
  nextTick(scrollActiveThumb);
}, { immediate: true });


onUnmounted(() => {
  cancelAnimationFrame(wheelFrame); cancelAnimationFrame(thumbFrame);
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.lb-tool {
  display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;color:#fff;font-size:18px;
}
.lb-controls { position: absolute; pointer-events: none; }
.lb-controls :deep(button) { pointer-events: auto; }
.lb-box {
  transition: none;
  will-change: transform;
  transform-origin: center;
  flex:none;
  touch-action: none;
}
.lb-box.is-dragging { transition: none; }

</style>
