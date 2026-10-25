<template>
  <main class="mx-auto min-h-screen max-w-7xl px-6 pb-24 pt-28">
    <div class="mb-10 flex items-end justify-between">
      <div>
        <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/70">Dashboard</p>
        <h1 class="mt-2 font-serif text-3xl font-semibold">影集管理</h1>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="!qiniuReady" class="rounded border border-ember/50 px-3 py-1.5 text-xs text-ember">
          七牛云未配置，无法上传
        </span>
        <button class="btn-ghost" @click="logout">退出登录</button>
      </div>
    </div>

    <div class="grid gap-8 lg:grid-cols-12">
      <!-- 左列：影集列表 + 新建 -->
      <aside class="space-y-6 lg:col-span-4">
        <section class="rounded-lg border border-white/10 bg-coal/50 p-5">
          <h2 class="mb-4 text-sm font-medium tracking-wider text-bone/70">新建影集</h2>
          <form class="space-y-3" @submit.prevent="createAlbum">
            <input v-model="newAlbum.title" class="field" placeholder="影集标题 *" />
            <input v-model="newAlbum.subtitle" class="field" placeholder="英文副标题（可选）" />
            <textarea v-model="newAlbum.description" class="field min-h-[72px]" placeholder="描述（可选）" />
            <button class="btn-gold w-full" :disabled="!newAlbum.title.trim() || saving">创建影集</button>
          </form>
        </section>

        <section class="rounded-lg border border-white/10 bg-coal/50 p-5">
          <h2 class="mb-4 text-sm font-medium tracking-wider text-bone/70">全部影集（{{ albums.length }}）</h2>
          <ul class="space-y-1">
            <li v-for="a in albums" :key="a.id">
              <button
                class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors"
                :class="current?.id === a.id ? 'bg-gold/15 text-gold' : 'text-bone/70 hover:bg-white/5'"
                @click="selectAlbum(a.id)"
              >
                <img :src="a.cover_url" class="h-9 w-14 rounded-sm object-cover" :alt="a.title" />
                <span class="flex-1 truncate text-sm">{{ a.title }}</span>
                <span class="font-mono text-[10px] text-bone/40">{{ a.photo_count }}</span>
              </button>
            </li>
          </ul>
        </section>
      </aside>

      <!-- 右列：当前影集编辑 + 照片管理 -->
      <section class="lg:col-span-8">
        <div v-if="!current" class="flex h-64 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-bone/40">
          选择左侧影集，或新建一个影集开始上传照片
        </div>

        <template v-else>
          <!-- 影集信息 -->
          <div class="rounded-lg border border-white/10 bg-coal/50 p-5">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-sm font-medium tracking-wider text-bone/70">影集信息</h2>
              <div class="flex gap-2">
                <button class="btn-ghost !px-3 !py-1.5 text-xs" @click="saveAlbum" :disabled="saving">保存修改</button>
                <button class="btn-ghost !px-3 !py-1.5 text-xs !text-ember hover:!border-ember" @click="removeAlbum">删除影集</button>
              </div>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <input v-model="current.title" class="field" placeholder="标题" />
              <input v-model="current.subtitle" class="field" placeholder="英文副标题" />
              <input v-model="current.location" class="field" placeholder="拍摄地点" />
              <input v-model="current.shot_at" class="field" placeholder="拍摄时间，如 2026-04" />
              <textarea v-model="current.description" class="field min-h-[72px] md:col-span-2" placeholder="影集描述" />
              <div class="md:col-span-2">
                <input v-model="current.cover_url" class="field" placeholder="封面图 URL（也可点击下方照片设为封面）" />
              </div>
            </div>
          </div>

          <!-- 上传区 -->
          <div
            class="mt-6 rounded-lg border-2 border-dashed p-8 text-center transition-colors"
            :class="dragging ? 'border-gold bg-gold/5' : 'border-white/15 hover:border-white/30'"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="onDrop"
          >
            <p class="text-sm text-bone/70">拖拽照片到这里，或
              <label class="cursor-pointer text-gold underline underline-offset-4">
                点击选择
                <input type="file" accept="image/*" multiple class="hidden" @change="onPick" />
              </label>
            </p>
            <p class="mt-2 font-mono text-[10px] tracking-wider text-bone/35">
              直传七牛云 · 自动读取光圈 / 快门 / ISO / 焦距 / 拍摄时间
            </p>
          </div>

          <!-- 上传队列 -->
          <div v-if="queue.length" class="mt-4 space-y-2">
            <div
              v-for="task in queue" :key="task.id"
              class="flex items-center gap-3 rounded-md border border-white/10 bg-coal/50 px-4 py-2.5 text-xs"
            >
              <span class="flex-1 truncate text-bone/80">{{ task.name }}</span>
              <span class="font-mono text-bone/40">{{ task.exifHint }}</span>
              <span
                class="font-mono"
                :class="task.status === 'done' ? 'text-gold' : task.status === 'error' ? 'text-ember' : 'text-bone/50'"
              >
                {{ task.status === 'done' ? '✓ 完成' : task.status === 'error' ? task.error : task.progress + '%' }}
              </span>
              <div v-if="task.status === 'uploading'" class="h-1 w-24 overflow-hidden rounded bg-white/10">
                <div class="h-full bg-gold transition-all" :style="{ width: task.progress + '%' }" />
              </div>
            </div>
          </div>

          <!-- 照片列表 -->
          <div class="mt-8">
            <h2 class="mb-4 text-sm font-medium tracking-wider text-bone/70">
              照片（{{ current.photos.length }}）
            </h2>
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="p in current.photos" :key="p.id"
                class="overflow-hidden rounded-lg border border-white/10 bg-coal/50"
              >
                <div class="relative aspect-[4/3] bg-ink">
                  <img :src="p.url" class="h-full w-full object-cover" loading="lazy" :alt="p.description || '照片'" />
                  <button
                    class="absolute left-2 top-2 rounded bg-ink/70 px-2 py-1 text-[10px] text-gold backdrop-blur transition hover:bg-gold hover:text-ink"
                    @click="setCover(p.url)"
                  >设为封面</button>
                </div>
                <div class="space-y-2 p-3">
                  <p class="font-mono text-[10px] text-gold/80">
                    {{ [p.aperture, p.shutter, p.iso, p.focal_length].filter(Boolean).join(' · ') || '无 EXIF' }}
                  </p>
                  <p class="font-mono text-[10px] text-bone/40">{{ p.taken_at }} {{ p.camera }}</p>
                  <textarea
                    v-model="p.description"
                    class="field min-h-[52px] !text-xs"
                    placeholder="照片描述…"
                    @change="savePhoto(p)"
                  />
                  <div class="flex justify-between">
                    <button class="text-[11px] text-bone/40 hover:text-gold" @click="savePhoto(p)">保存</button>
                    <button class="text-[11px] text-bone/40 hover:text-ember" @click="removePhoto(p)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import * as qiniu from 'qiniu-js';
import exifr from 'exifr';
import { api, clearToken, type Album, type AlbumDetail, type Photo } from '../api';

interface UploadTask {
  id: number;
  name: string;
  status: 'pending' | 'uploading' | 'saving' | 'done' | 'error';
  progress: number;
  error?: string;
  exifHint: string;
}

const router = useRouter();
const albums = ref<Album[]>([]);
const current = ref<AlbumDetail | null>(null);
const newAlbum = ref({ title: '', subtitle: '', description: '' });
const queue = ref<UploadTask[]>([]);
const dragging = ref(false);
const saving = ref(false);
const qiniuReady = ref(true);
let taskSeq = 0;

function logout() {
  clearToken();
  router.push('/login');
}

async function refreshAlbums(keepSelected = true) {
  albums.value = await api.albums();
  if (current.value && keepSelected) {
    const still = albums.value.find((a) => a.id === current.value!.id);
    if (still) await selectAlbum(still.id);
  }
}

async function selectAlbum(id: number) {
  current.value = await api.album(id);
}

async function createAlbum() {
  saving.value = true;
  try {
    const a = await api.createAlbum(newAlbum.value);
    newAlbum.value = { title: '', subtitle: '', description: '' };
    await refreshAlbums(false);
    await selectAlbum(a.id);
  } catch (e: any) {
    alert(e.message);
  } finally {
    saving.value = false;
  }
}

async function saveAlbum() {
  if (!current.value) return;
  saving.value = true;
  try {
    const { photos, ...body } = current.value;
    await api.updateAlbum(current.value.id, body);
    await refreshAlbums();
  } catch (e: any) {
    alert(e.message);
  } finally {
    saving.value = false;
  }
}

async function removeAlbum() {
  if (!current.value) return;
  if (!confirm(`确定删除影集「${current.value.title}」及其全部照片记录吗？（七牛云上的文件不会删除）`)) return;
  await api.deleteAlbum(current.value.id);
  current.value = null;
  await refreshAlbums(false);
}

function setCover(url: string) {
  if (current.value) current.value.cover_url = url;
}

async function savePhoto(p: Photo) {
  try {
    await api.updatePhoto(p.id, {
      title: p.title, description: p.description, aperture: p.aperture, shutter: p.shutter,
      iso: p.iso, focal_length: p.focal_length, camera: p.camera, taken_at: p.taken_at,
    });
  } catch (e: any) {
    alert(e.message);
  }
}

async function removePhoto(p: Photo) {
  if (!confirm('确定删除这张照片的记录吗？（七牛云上的文件不会删除）')) return;
  await api.deletePhoto(p.id);
  if (current.value) {
    current.value.photos = current.value.photos.filter((x) => x.id !== p.id);
  }
  await refreshAlbums();
}

// ---------- 上传 ----------

function onDrop(e: DragEvent) {
  dragging.value = false;
  const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
  if (files.length) uploadFiles(files);
}
function onPick(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? []);
  if (files.length) uploadFiles(files);
  (e.target as HTMLInputElement).value = '';
}

function formatExif(exif: any) {
  const aperture = exif?.FNumber ? `f/${Number(exif.FNumber.toFixed(1))}` : '';
  let shutter = '';
  if (exif?.ExposureTime) {
    const t = Number(exif.ExposureTime);
    shutter = t >= 1 ? `${t}s` : `1/${Math.round(1 / t)}s`;
  }
  const iso = exif?.ISO ? `ISO ${exif.ISO}` : '';
  const focal = exif?.FocalLength ? `${Math.round(exif.FocalLength)}mm` : '';
  const camera = [exif?.Make, exif?.Model].filter(Boolean).join(' ').trim().replace(/\s+/g, ' ');
  let taken_at = '';
  if (exif?.DateTimeOriginal instanceof Date) {
    const d = exif.DateTimeOriginal;
    const pad = (n: number) => String(n).padStart(2, '0');
    taken_at = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return { aperture, shutter, iso, focal, camera, taken_at };
}

async function uploadFiles(files: File[]) {
  if (!current.value) return;
  for (const file of files) {
    const task: UploadTask = { id: ++taskSeq, name: file.name, status: 'pending', progress: 0, exifHint: '解析 EXIF…' };
    queue.value.push(task);

    try {
      // 1. 读取 EXIF 与尺寸
      const exif = await exifr.parse(file).catch(() => null);
      const meta = formatExif(exif);
      task.exifHint = [meta.aperture, meta.shutter, meta.iso].filter(Boolean).join(' ') || '无 EXIF';
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = url;
      });

      // 2. 获取七牛上传凭证
      const { token, key, domain } = await api.uploadToken(file.name);

      // 3. 直传七牛
      task.status = 'uploading';
      await new Promise<void>((resolve, reject) => {
        qiniu.upload(file, key, token, {}, {}).subscribe({
          next(res) { task.progress = Math.round(res.total.percent); },
          error(err) { reject(err); },
          complete() { resolve(); },
        });
      });

      // 4. 写入数据库
      task.status = 'saving';
      const photo = await api.createPhoto({
        album_id: current.value.id,
        url: `${domain}/${key}`,
        qiniu_key: key,
        aperture: meta.aperture, shutter: meta.shutter, iso: meta.iso,
        focal_length: meta.focal, camera: meta.camera, taken_at: meta.taken_at,
        width: dims.w, height: dims.h,
      });
      current.value.photos.push(photo);

      // 影集还没有封面时，自动用第一张做封面
      if (!current.value.cover_url) {
        current.value.cover_url = photo.url;
        await saveAlbum();
      }
      task.status = 'done';
    } catch (e: any) {
      task.status = 'error';
      task.error = e?.message?.includes('未配置') ? '七牛未配置' : '失败';
      console.error(e);
    }
  }
  await refreshAlbums();
  // 3 秒后清掉已完成的任务
  setTimeout(() => { queue.value = queue.value.filter((t) => t.status !== 'done'); }, 3000);
}

onMounted(async () => {
  try {
    const site = await api.site();
    qiniuReady.value = site.qiniuReady;
    await refreshAlbums(false);
    if (albums.value.length) await selectAlbum(albums.value[0].id);
  } catch (e: any) {
    if (e.message.includes('未登录')) router.push('/login');
    else alert(e.message);
  }
});
</script>
