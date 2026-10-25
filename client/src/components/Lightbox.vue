<template>
  <transition name="lightbox">
    <div
      v-if="photo"
      class="fixed inset-0 z-[70] overflow-hidden bg-ink/[0.97] backdrop-blur-xl"
      @wheel.prevent="onWheel"
    >
      <!-- 背景光晕 -->
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,169,106,0.07)_0%,transparent_62%)]" />

      <!-- 顶栏 -->
      <header class="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 px-4 pb-4 pt-4 md:px-8">
        <div class="min-w-0">
          <p v-if="titleText" class="mt-1.5 truncate font-serif text-sm text-bone/90">{{ titleText }}</p>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <div class="mr-1 hidden items-center gap-1 rounded-full border border-gold/10 bg-ink/60 px-1.5 py-1 backdrop-blur sm:flex">
            <button class="lb-tool" :title="`${t('lightbox.zoomOut')} (-)`" @click="zoomBy(1 / 1.3)">−</button>
            <button
              class="min-w-[3.1rem] px-1 font-mono text-[10px] tabular-nums text-bone/55 transition hover:text-gold"
              :title="`${t('lightbox.reset')} (0)`"
              @click="resetZoom"
            >{{ Math.round(scale * 100) }}%</button>
            <button class="lb-tool" :title="`${t('lightbox.zoomIn')} (+)`" @click="zoomBy(1.3)">+</button>
          </div>
          <button class="lb-tool !h-10 !w-10" :title="`${t('common.close')} (Esc)`" @click="$emit('close')">✕</button>
        </div>
      </header>

      <!-- 舞台 -->
      <div
        ref="stage"
        style="touch-action: none"
        role="dialog" aria-modal="true" :aria-label="titleText || (locale === 'zh' ? '照片查看器' : 'Photo viewer')"
        class="absolute inset-0 flex items-center justify-center px-4 pb-[9.5rem] pt-16 md:pb-[10.5rem]"
        :class="{ 'lb-stage-zoomed': scale > 1 }"
        @dblclick="onDoubleClick"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @click="onStageClick"
      >
        <GalleryArrow direction="prev" class="lightbox-nav previous" @pointerdown.stop @click.stop="$emit('prev')" :aria-label="t('lightbox.prev')" />
        <GalleryArrow direction="next" class="lightbox-nav next" @pointerdown.stop @click.stop="$emit('next')" :aria-label="t('lightbox.next')" />

        <!-- 视口：放大后的图片裁切在这里，不会盖住顶部工具条和底部信息 -->
        <div
          ref="viewport"
          style="touch-action: none"
          class="lb-viewport relative flex h-full w-full items-center justify-center overflow-hidden"
          @click.self="onStageClick"
        >
          <div
            ref="imageBox"
            class="lb-box relative rounded-sm shadow-[0_20px_70px_-30px_rgba(70,55,25,0.2)]"
            :class="[scale > 1 ? 'cursor-grab active:cursor-grabbing' : '', { 'is-dragging': dragging }]"
            :style="[boxStyle, transformStyle]"
          >
            <PhotoImage
              :key="photo.id"
              :photo-id="photo.id"
              :album-id="photo.album_id"
              :controls-target="controlHost"
              :src="photo.url"
              :proxy="photo.proxy_url"
              :width="photo.width"
              :height="photo.height"
              :alt="titleText || descriptionText || t('common.photo')"
              fit="contain"
              fill
              eager
              quality-badge
              auto-original
              :controls-visible="scale <= 1.01"
            />
          </div>
          <div ref="controlHost" class="lb-controls" :style="boxStyle" />
        </div>
      </div>

      <!-- 底部信息 + 缩略图条 -->
      <footer class="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink via-ink/90 to-transparent px-4 pb-4 pt-8 md:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <p v-if="descriptionText" class="mx-auto max-w-xl text-[13px] leading-relaxed text-bone/60">
            {{ descriptionText }}
          </p>

          <div class="lb-metadata mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-[11px] tracking-wider text-gold/90">
            <div class="lb-exposure">
            <span v-if="photo.aperture">{{ photo.aperture.replace(/^f/i, 'F') }}</span>
            <span v-if="photo.shutter">{{ photo.shutter }}</span>
            <span v-if="photo.iso">{{ isoText }}</span>
            <span v-if="photo.focal_length">{{ photo.focal_length }}</span>
            </div>
            <div class="lb-equipment">
            <span v-if="photo.camera" class="text-bone/45">{{ cameraText }}</span>
            <span v-if="photo.lens" class="text-bone/45">{{ photo.lens }}</span>
            <span v-if="photo.taken_at" class="text-bone/45">{{ photo.taken_at }}</span>
            </div>
          </div>


        </div>

        <!-- 缩略图条 -->
        <div v-if="items.length > 1" class="mt-4">
          <div ref="strip" class="lb-thumbnail-strip mx-auto flex max-w-4xl gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              v-for="(item, i) in items"
              :key="item.id"
              class="relative h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-sm border transition-all duration-300"
              :class="i === index ? 'border-gold/80 opacity-100' : 'border-gold/10 opacity-45 hover:opacity-80'"
              @click="$emit('select', i)"
            >
              <PhotoImage
                :src="item.url"
                :proxy="item.proxy_url"
                fill
                preview-only
                minimal
                :alt="`${i + 1}`"
              />
            </button>
          </div>
        </div>
      </footer>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import type { Photo } from '../api';
import PhotoImage from './PhotoImage.vue';
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
let resizeObserver: ResizeObserver | undefined;
watch(viewport, el => { resizeObserver?.disconnect(); if (el) { resizeObserver = new ResizeObserver(([entry]) => { viewportSize.value = { width: entry.contentRect.width, height: entry.contentRect.height }; clampPan(); }); resizeObserver.observe(el); } });

// ---------- 缩放 / 平移 ----------
const scale = ref(1);
const tx = ref(0);
const ty = ref(0);
const dragging = ref(false);

const boxStyle = computed(() => {
  const w = Number(props.photo?.width) || 0;
  const h = Number(props.photo?.height) || 0;
  const ratio = w > 0 && h > 0 ? w / h : 1.5;
  const area = viewportSize.value;
  const width = Math.min(area.width || window.innerWidth * .92, (area.height || window.innerHeight * .6) * ratio);
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

let lastWheelSwitch = 0;
let wheelSwitchAmount = 0;
let lastWheelEvent = 0;
function onWheel(e: WheelEvent) {
  const el = viewport.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) {
    const now = performance.now();
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
    if (now - lastWheelEvent > 200 || Math.sign(delta) !== Math.sign(wheelSwitchAmount)) wheelSwitchAmount = 0;
    lastWheelEvent = now;
    if (now - lastWheelSwitch < 450) return;
    wheelSwitchAmount += delta;
    if (Math.abs(wheelSwitchAmount) >= 45 && items.value.length > 1) {
      emit(wheelSwitchAmount > 0 ? 'next' : 'prev');
      lastWheelSwitch = now; wheelSwitchAmount = 0;
    }
    return;
  }
  wheelSwitchAmount = 0;
  const pointX = e.clientX - rect.left - rect.width / 2;
  const pointY = e.clientY - rect.top - rect.height / 2;
  // 按滚动量缩放：鼠标滚轮一格约 15%，触控板连续滚动更细腻
  const factor = Math.min(1.4, Math.max(0.7, Math.exp(-e.deltaY * 0.0012)));
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

async function scrollActiveThumb() {
  await nextTick();
  const el = strip.value?.children?.[props.index] as HTMLElement | undefined;
  el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

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
  scrollActiveThumb();
}, { immediate: true });

watch(() => props.index, scrollActiveThumb);

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.lb-tool {
  @apply flex h-8 w-8 items-center justify-center rounded-full text-sm text-bone/60 transition hover:bg-gold/5 hover:text-gold;
}
.lb-controls { position: absolute; pointer-events: none; }
.lb-controls :deep(button) { pointer-events: auto; }
.lb-box {
  transition: none;
  will-change: transform;
  transform-origin: center;
  max-width: 92vw;
  max-height: 76vh;
  touch-action: none;
}
.lb-box.is-dragging { transition: none; }

</style>
