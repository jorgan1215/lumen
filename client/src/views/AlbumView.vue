<template>
  <main class="min-h-screen">
    <!-- 加密相册：解锁 -->
    <section v-if="locked" class="flex min-h-screen items-center justify-center px-6">
      <div class="w-full max-w-sm text-center">
        <img src="/logo.svg" alt="" class="mx-auto h-12 w-12 opacity-80" />
        <p class="mt-6 font-mono text-[10px] uppercase tracking-[0.42em] text-gold/70">Protected</p>
        <h1 class="mt-3 font-serif text-3xl font-semibold">
          {{ pick(lockedAlbum?.title, lockedAlbum?.title_en) || t('album.lockedTitle') }}
        </h1>
        <p class="mt-3 text-sm text-bone/45">{{ t('album.lockedHint') }}</p>

        <form class="mt-8 space-y-3" @submit.prevent="unlock">
          <input
            v-model="password"
            type="password"
            class="field text-center tracking-[0.3em]"
            :placeholder="t('album.password')"
            autocomplete="current-password"
          />
          <p v-if="unlockError" class="text-xs text-ember">{{ unlockError }}</p>
          <button type="submit" class="btn-gold w-full" :disabled="unlocking || !password">
            {{ unlocking ? t('album.unlocking') : t('album.unlock') }}
          </button>
        </form>

        <router-link to="/" class="mt-8 inline-block font-mono text-[10px] uppercase tracking-[0.3em] text-bone/30 transition hover:text-gold">
          ← {{ t('album.backAll') }}
        </router-link>
      </div>
    </section>

    <template v-else>
      <!-- 影集头图 -->
      <section class="relative flex h-[72vh] items-end overflow-hidden">
        <div class="absolute inset-0 bg-coal">
          <PhotoImage
            v-if="album?.cover_url"
            :src="album.cover_url"
            :proxy="coverProxy"
            fill
            eager
            preview-only
            class="absolute inset-0"
            :alt="titleText"
            :style="{ animation: 'slow-pan 22s ease-in-out infinite alternate' }"
          />
          <div v-else class="h-full w-full bg-[radial-gradient(ellipse_at_center,#ede6d8_0%,#fffefa_70%)]" />
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/35" />
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />

        <div class="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16">
          <p v-if="album" class="fade-up font-mono text-[10px] uppercase tracking-[0.45em] text-gold/80">
            {{ album.subtitle || t('album.collection') }}
          </p>
          <h1 v-if="album" class="fade-up mt-3 break-words font-serif text-5xl font-black leading-tight md:text-7xl" style="animation-delay:0.15s">
            {{ titleText }}
          </h1>
          <div
            v-if="album"
            class="fade-up mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] tracking-wider text-bone/55"
            style="animation-delay:0.3s"
          >
            <span v-if="locationText" class="rounded-full border border-gold/10 px-3 py-1">{{ locationText }}</span>
            <span v-if="album.shot_at" class="rounded-full border border-gold/10 px-3 py-1">{{ album.shot_at }}</span>
            <span class="rounded-full border border-gold/25 px-3 py-1 text-gold/80">
              {{ t('album.photos', { n: photos.length }) }}
            </span>
            <span v-if="album.has_password" class="rounded-full border border-gold/10 px-3 py-1 text-bone/45">🔒</span>
          </div>
        </div>
      </section>

      <!-- 描述 -->
      <section v-if="descriptionText" class="mx-auto max-w-3xl px-6 py-16">
        <p v-reveal class="text-center font-serif text-lg leading-loose text-bone/75 md:text-xl">
          {{ descriptionText }}
        </p>
        <div v-reveal:150 class="mx-auto mt-10 h-px w-16 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </section>

      <!-- 照片墙（等宽瀑布流） -->
      <section class="mx-auto max-w-7xl px-6 pb-32">
        <div v-if="loading" class="flex gap-4">
          <div v-for="c in columnCount" :key="c" class="flex flex-1 flex-col gap-4">
            <PhotoImage v-for="n in 2" :key="n" src="" :minimal="true" />
          </div>
        </div>

        <template v-else>
          <div v-if="!photos.length" class="py-24 text-center">
            <p class="font-mono text-xs tracking-[0.3em] text-bone/35">{{ t('album.empty') }}</p>
          </div>

          <div v-else class="flex items-start gap-4">
            <div v-for="(col, ci) in photoColumns" :key="ci" class="flex min-w-0 flex-1 flex-col gap-4">
              <figure
                v-for="(photo, rowIndex) in col"
                :key="photo.id"
                v-reveal
                :style="{ '--reveal-delay': `${Math.min(rowIndex, 4) * 80}ms` }"
                class="group relative cursor-pointer overflow-hidden rounded-sm bg-coal ring-1 ring-gold/[0.04] transition-shadow duration-500 hover:ring-gold/25"
                @click="open(photo)"
              >
                <PhotoImage
                  :src="photo.url"
                  :proxy="photo.proxy_url"
                  preview-only
                  eager
                  upgrade-original
                  :width="photo.width"
                  :height="photo.height"
                  :alt="pick(photo.title, photo.title_en) || pick(photo.description, photo.description_en) || titleText"
                  class="w-full transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
                  @load="markLoaded(photo.id)"
                  @error="markLoaded(photo.id)"
                />

                <figcaption
                  class="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/90 via-ink/10 to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                >
                  <p v-if="photo.description || photo.description_en" class="text-xs leading-relaxed text-bone/85">
                    {{ pick(photo.description, photo.description_en) }}
                  </p>
                  <p class="mt-1.5 font-mono text-[10px] tracking-wider text-gold/90">{{ metaLine(photo) }}</p>
                  <p v-if="photo.author" class="mt-1 font-mono text-[10px] text-bone/45">© {{ photo.author }}</p>
                </figcaption>


              </figure>
            </div>
          </div>
        </template>

        <nav class="album-pagination" aria-label="切换影集">
          <router-link v-if="adjacentAlbums.prev" :to="`/album/${adjacentAlbums.prev.slug || adjacentAlbums.prev.id}`"><span>← {{ locale === 'zh' ? '上一影集' : 'Previous collection' }}</span><strong>{{ pick(adjacentAlbums.prev.title, adjacentAlbums.prev.title_en) }}</strong></router-link>
          <span v-else />
          <router-link v-if="adjacentAlbums.next" :to="`/album/${adjacentAlbums.next.slug || adjacentAlbums.next.id}`" class="text-right"><span>{{ locale === 'zh' ? '下一影集' : 'Next collection' }} →</span><strong>{{ pick(adjacentAlbums.next.title, adjacentAlbums.next.title_en) }}</strong></router-link>
        </nav>
        <div class="mt-10 flex justify-center">
          <router-link to="/" class="btn-ghost">← {{ t('album.backAll') }}</router-link>
        </div>
      </section>

      <!-- 加载进度 -->
      <transition name="page">
        <div
          v-if="showProgress"
          class="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border border-gold/10 bg-ink/85 px-4 py-2 backdrop-blur-md"
        >
          <span class="font-mono text-[10px] tracking-[0.2em] text-bone/60">
            {{ t('album.loadingPhotos', { n: loadedCount, total: photos.length }) }}
          </span>
          <span class="h-1 w-20 overflow-hidden rounded-full bg-gold/10">
            <span
              class="block h-full rounded-full bg-gold/80 transition-all duration-500"
              :style="{ width: `${photos.length ? (loadedCount / photos.length) * 100 : 0}%` }"
            />
          </span>
        </div>
      </transition>

      <Lightbox
        :photo="current"
        :index="currentIndex"
        :total="photos.length"
        :items="photos"
        @close="closeLightbox"
        @prev="step(-1)"
        @next="step(1)"
        @select="openIndex"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  type Album, api, getAlbumToken, setAlbumToken, isLocked, type AlbumResponse, type LockedAlbum, type Photo,
} from '../api';
import PhotoImage from '../components/PhotoImage.vue';
import Lightbox from '../components/Lightbox.vue';
import { siteSettings } from '../lib/site';
import { originals } from '../lib/originals';
import { locale, pick, t } from '../lib/i18n';

const route = useRoute();
const albumList = ref<Album[]>([]);
const adjacentAlbums = computed(() => { const i = albumList.value.findIndex(a => a.id === album.value?.id); return { prev: i > 0 ? albumList.value[i - 1] : null, next: i >= 0 ? albumList.value[i + 1] : null }; });
const album = ref<AlbumResponse | null>(null);
const loading = ref(true);
const openId = ref<number | null>(null);
const loadedIds = ref<Set<number>>(new Set());
const settled = ref(false);
const columnCount = ref(3);

// 解锁
const password = ref('');
const unlockError = ref('');
const unlocking = ref(false);

const routeKey = computed(() => String(route.params.id));
const lockedAlbum = computed<LockedAlbum | null>(() => (isLocked(album.value) ? album.value : null));
const locked = computed(() => Boolean(lockedAlbum.value));
const photos = computed<Photo[]>(() => (album.value && !locked.value ? album.value.photos : []));

const titleText = computed(() => pick(album.value?.title, album.value?.title_en));
const descriptionText = computed(() => pick(album.value?.description, album.value?.description_en));
const locationText = computed(() => pick(album.value?.location, album.value?.location_en));

const current = computed<Photo | null>(() => {
  if (!openId.value) return null;
  return photos.value.find((p) => p.id === openId.value) ?? null;
});
const currentIndex = computed(() => {
  if (!openId.value) return -1;
  return photos.value.findIndex((p) => p.id === openId.value);
});

const coverProxy = computed(() => {
  const cover = album.value?.cover_url;
  if (!cover) return '';
  return photos.value.find((p) => p.url === cover)?.proxy_url || '';
});

const loadedCount = computed(() => loadedIds.value.size);
const showProgress = computed(() => photos.value.length > 0 && !settled.value);

/** 按估算高度分配列，避免 CSS 多列在部分浏览器里出现「图片不绘制」的问题 */
const photoColumns = computed<Photo[][]>(() => {
  const n = Math.max(1, columnCount.value);
  const cols: Photo[][] = Array.from({ length: n }, () => []);
  const heights = new Array(n).fill(0);
  for (const photo of photos.value) {
    let target = 0;
    for (let i = 1; i < n; i += 1) {
      if (heights[i] < heights[target] - 0.001) target = i;
    }
    cols[target].push(photo);
    const ratio = photo.width > 0 && photo.height > 0 ? photo.height / photo.width : 0.75;
    heights[target] += ratio + 0.04;
  }
  return cols;
});

function updateColumns() {
  const w = window.innerWidth;
  columnCount.value = w < 640 ? 1 : w < 1024 ? 2 : 3;
}

function markLoaded(id: number) {
  if (!photos.value.some(p => p.id === id)) return;
  if (loadedIds.value.has(id)) return;
  const next = new Set(loadedIds.value);
  next.add(id);
  loadedIds.value = next;
  if (next.size >= photos.value.length) {
    settled.value = true;
    for (const photo of photos.value) if (photo.proxy_url && photo.proxy_url !== photo.url) originals.request(photo.url);
  }
}

function metaLine(photo: Photo) {
  return [photo.aperture.replace(/^f/i, 'F'), photo.shutter, photo.iso, photo.focal_length].filter(Boolean).join(' · ');
}

function open(photo: Photo) { openId.value = photo.id; }
function openIndex(i: number) { openId.value = photos.value[i]?.id ?? null; }
function closeLightbox() { openId.value = null; }
function step(d: number) {
  const n = photos.value.length;
  if (!n) return;
  const i = currentIndex.value;
  openId.value = photos.value[(i + d + n) % n].id;
}

async function unlock() {
  if (!lockedAlbum.value || !password.value) return;
  unlocking.value = true;
  unlockError.value = '';
  try {
    const { token } = await api.unlockAlbum(routeKey.value, password.value);
    setAlbumToken(lockedAlbum.value.id, token);
    password.value = '';
    await load();
  } catch (e: any) {
    const msg = String(e?.message || '');
    unlockError.value = /密码/.test(msg) ? t('album.wrongPassword') : (msg || t('album.wrongPassword'));
  } finally {
    unlocking.value = false;
  }
}

async function load() {
  originals.cancelBackground();
  album.value = null;
  loading.value = true;
  openId.value = null;
  settled.value = false;
  loadedIds.value = new Set();
  try {
    let res = await api.album(routeKey.value);
    if (isLocked(res)) {
      // 之前解锁过就直接重试，避免重复输密码
      const saved = getAlbumToken(res.id);
      if (saved) res = await api.album(routeKey.value, saved);
    }
    album.value = res;
    if (!isLocked(res)) {
      document.title = `${pick(res.title, res.title_en)} · ${siteSettings.name}`;
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  api.albums().then(list => { albumList.value = list; }).catch(console.error);
  updateColumns();
  window.addEventListener('resize', updateColumns, { passive: true });
});
onUnmounted(() => { originals.cancelBackground(); window.removeEventListener('resize', updateColumns); });

watch(routeKey, load, { immediate: true });
watch([locale, () => siteSettings.name], () => {
  const a = album.value;
  if (a && !isLocked(a)) document.title = `${pick(a.title, a.title_en)} · ${siteSettings.name}`;
});
</script>
