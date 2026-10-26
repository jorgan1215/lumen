<template>
  <main class="mx-auto min-h-screen max-w-[1500px] px-5 pb-24 pt-24">
    <!-- 顶部 -->
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/70">{{ t('admin.dashboard') }}</p>
        <h1 class="mt-1 font-serif text-2xl font-semibold">管理中心</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="!qiniuReady" class="rounded-full border border-ember/50 px-3 py-1.5 text-[11px] text-ember">
          {{ t('admin.qiniuMissing') }}
        </span>
        <router-link :to="localePath('/')" class="btn-ghost !px-3 !py-1.5 text-xs">{{ t('admin.viewSite') }}</router-link>
        <button class="btn-ghost !px-3 !py-1.5 text-xs" @click="logout">{{ t('admin.logout') }}</button>
      </div>
    </header>

    <nav class="admin-tabs" role="tablist" aria-label="管理子页">
      <button v-for="tab in adminTabs" :key="tab.key" role="tab" :id="`tab-${tab.key}`" :aria-selected="activeTab === tab.key" :aria-controls="`panel-${tab.key}`" :class="{ active: activeTab === tab.key }" @click="setTab(tab.key)">{{ tab.label }}<span v-if="tab.key === 'trash' && trashCount">{{ trashCount }}</span></button>
    </nav>

    <section v-show="activeTab === 'site'" id="panel-site" role="tabpanel" aria-labelledby="tab-site" class="admin-config-page">
      <div class="admin-statistics"><div><strong>{{ albums.length }}</strong><span>影集</span></div><div><strong>{{ totalPhotos }}</strong><span>照片</span></div><div><strong>{{ trashCount }}</strong><span>回收站</span></div></div>
      <div class="settings-card">
        <h2>网站信息</h2>
        <div class="admin-form-grid">
          <label>网站名称<input v-model="identityForm.name" class="field" maxlength="80" placeholder="例如 LUMEN" /></label>
          <label>网站副标题<input v-model="identityForm.subtitle" class="field" maxlength="160" placeholder="显示在网站标题右侧，可留空" /></label>
          <label>作者名称<input v-model="identityForm.author" class="field" maxlength="120" placeholder="用于页脚版权及默认上传作者" /></label>
          <label class="admin-wide">网站简介<textarea v-model="identityForm.description" class="field" maxlength="500" placeholder="用于搜索引擎和分享摘要" /></label>
          <label>网站图标 URL<input v-model="identityForm.logo" class="field" placeholder="留空使用默认图标" /></label>
          <label>网站时区<input v-model="identityForm.timeZone" class="field" placeholder="Asia/Shanghai" /></label>
        </div>
        <p class="settings-note">页脚版权作者和导航网站名会跟随这里的配置。AI 生成的“今天”及相对时间按网站时区计算。</p>
        <h2>关于页面</h2>
        <label>页面标题<input v-model="aboutForm.title" class="field" placeholder="留空使用作者名称" /></label>
        <label>肖像图片 URL<input v-model="aboutForm.image" class="field" placeholder="可选" /></label>
        <label>介绍内容<textarea v-model="aboutForm.body" class="field min-h-[180px]" placeholder="介绍自己与摄影理念" /></label>
        <button class="btn-gold self-start" :disabled="heroSaving" @click="saveSettingsPage('site')">{{ heroSaving ? '保存中…' : '保存网站设置' }}</button>
      </div>
    </section>
    <section v-show="activeTab === 'slides'" id="panel-slides" role="tabpanel" aria-labelledby="tab-slides" class="admin-config-page settings-card">
      <h2>首页轮播图</h2>
          <div v-for="(slide, i) in siteSlides" :key="i" class="space-y-2 border-b border-gold/15 pb-3">
            <img v-if="slide.url" :src="slide.url" alt="精选图预览" class="aspect-video w-full object-cover" />
            <input v-model="slide.url" class="field" placeholder="图片 URL" />
            <textarea v-model="slide.caption" class="field" placeholder="右下角的一句话" />
            <input v-model="slide.caption_en" class="field" placeholder="English caption (optional)" />
            <div class="flex gap-3 text-xs text-gold">
              <button :disabled="i === 0" @click="moveSlide(i, -1)">上移</button>
              <button :disabled="i === siteSlides.length - 1" @click="moveSlide(i, 1)">下移</button>
              <button @click="siteSlides.splice(i, 1)">移除</button>
            </div>
          </div>
          <button class="btn-ghost w-full" @click="siteSlides.push({ url: '', caption: '' })">＋ 添加精选图</button>
          <button class="text-xs text-gold" @click="siteSlides.push(...albums.filter(a => a.cover_url).map(a => ({ url: a.cover_url, caption: a.description })))">从影集封面添加</button>
          <label class="block text-xs">轮播间隔（秒）<input v-model.number="siteInterval" type="number" min="2" max="120" class="field mt-2" /></label>
      <button class="btn-gold self-start" :disabled="heroSaving" @click="saveSettingsPage('slides')">{{ heroSaving ? '保存中…' : '保存轮播图设置' }}</button>
    </section>
    <section v-show="activeTab === 'music'" id="panel-music" role="tabpanel" aria-labelledby="tab-music" class="admin-config-page settings-card">
      <h2>背景音乐</h2>
      <label>音源 URL<input v-model="musicForm.url" class="field" placeholder="https://…/music.mp3（留空使用默认钢琴曲）" /></label>
      <label>音量 {{ Math.round(musicForm.volume * 100) }}%<input v-model.number="musicForm.volume" type="range" min="0" max="1" step="0.01" class="mt-3 w-full accent-[#a48140]" /></label>
      <p class="settings-note">导航栏音符控制播放与暂停。留空使用内置钢琴曲，音量设为 0 可静音；切换页面不中断。</p>
      <button class="btn-gold self-start" :disabled="heroSaving" @click="saveSettingsPage('music')">{{ heroSaving ? '保存中…' : '保存背景音乐设置' }}</button>
    </section>
    <section v-show="activeTab === 'model'" id="panel-model" role="tabpanel" aria-labelledby="tab-model" class="admin-config-page"><div class="space-y-6"><ServerSettings @saved="refreshStorageStatus" /><AISettings /></div></section>

    <div v-show="activeTab === 'albums' || activeTab === 'trash'" :id="`panel-${activeTab}`" role="tabpanel" :aria-labelledby="`tab-${activeTab}`" class="grid gap-6 lg:grid-cols-12">
      <aside v-show="activeTab === 'albums'" class="space-y-5 lg:col-span-3">
        <section class="rounded-lg border border-gold/[0.08] bg-coal/40 p-4">
          <h2 class="mb-1 text-xs font-medium tracking-wider text-bone/60">
            {{ t('admin.allAlbums') }} <span class="font-mono text-[10px] text-bone/30">{{ albums.length }}</span>
          </h2>
          <p class="mb-2 font-mono text-[9px] tracking-wider text-bone/25">⋮⋮ {{ t('admin.dragAlbumHint') }}</p>
          <ul class="space-y-1">
            <li
              v-for="a in albums" :key="a.id"
              draggable="true"
              class="cursor-grab active:cursor-grabbing"
              :class="{
                'opacity-40': dragAlbumId === a.id,
                'ring-1 ring-gold/50 rounded-md': albumOverId === a.id && dragAlbumId !== a.id,
              }"
              @dragstart="startAlbumDrag(a.id, $event)"
              @dragover.prevent="albumOverId = a.id"
              @dragleave="albumOverId = null"
              @drop.prevent.stop="dropAlbum(a.id)"
              @dragend="endAlbumDrag"
            >
              <button
                class="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors"
                :class="current?.id === a.id && mode === 'album' ? 'bg-gold/12 text-gold' : 'text-bone/65 hover:bg-gold/5'"
                @click="selectAlbum(a.id)"
              >
                <span class="relative h-9 w-12 shrink-0 overflow-hidden rounded-sm bg-ink">
                  <img v-if="a.cover_url" :src="a.cover_proxy_url || a.cover_url" class="h-full w-full object-cover" alt="" loading="lazy" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[13px]">{{ pick(a.title, a.title_en) }}</span>
                  <span class="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-bone/30">
                    {{ t('admin.albumPhotos', { n: a.photo_count ?? 0 }) }}
                    <span v-if="a.locked" class="text-bone/45">🔒</span>
                    <span v-if="a.hidden" class="text-gold/70">仅管理员</span>
                    <span v-if="a.featured" class="text-gold/70">{{ t('admin.featuredBadge') }}</span>
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </aside>

      <!-- 右列 -->
      <section :class="activeTab === 'trash' ? 'lg:col-span-12' : 'lg:col-span-9'">
        <!-- 回收站 -->
        <div v-if="mode === 'trash'" class="space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/[0.08] bg-coal/40 p-5">
            <div>
              <h2 class="text-sm font-medium tracking-wider text-bone/80">{{ t('admin.trashTitle') }}</h2>
              <p class="mt-1.5 max-w-xl text-[11px] leading-relaxed text-bone/40">{{ t('admin.trashHint') }}</p>
            </div>
            <div class="flex gap-2">
              <button class="btn-ghost !px-3 !py-1.5 text-xs" :disabled="loadingTrash" @click="loadTrash">{{ t('admin.refresh') }}</button>
              <button
                class="btn-ghost !px-3 !py-1.5 text-xs !text-ember hover:!border-ember disabled:opacity-40"
                :disabled="!trash.length"
                @click="emptyTrash"
              >{{ t('admin.emptyTrash') }}</button>
            </div>
          </div>

          <div v-if="loadingTrash" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <PhotoImage v-for="n in 3" :key="n" src="" :minimal="true" class="rounded-lg" />
          </div>

          <div v-else-if="!trash.length" class="flex h-56 items-center justify-center rounded-lg border border-dashed border-gold/10 text-sm text-bone/35">
            {{ t('admin.trashEmpty') }}
          </div>

          <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div v-for="p in trash" :key="p.id" class="overflow-hidden rounded-lg border border-gold/10 bg-coal/40">
              <div class="relative aspect-[4/3]">
                <PhotoImage :src="p.url" :proxy="p.proxy_url" fill preview-only :alt="p.description || t('common.photo')" />
                <span class="absolute left-2 top-2 rounded bg-ink/75 px-2 py-1 font-mono text-[9px] text-bone/50 backdrop-blur">
                  {{ p.album_title || t('admin.unknownAlbum') }}
                </span>
              </div>
              <div class="space-y-2 p-3">
                <p class="truncate font-mono text-[10px] text-bone/40">{{ shortUrl(p.url) }}</p>
                <p class="font-mono text-[10px] text-bone/30">
                  {{ t('admin.deletedAt', { time: timeAgo(p.deleted_at) }) }}
                </p>
                <div class="flex justify-between pt-1">
                  <button class="text-[11px] text-gold/80 transition hover:text-gold" @click="restorePhoto(p)">{{ t('admin.restore') }}</button>
                  <button class="text-[11px] text-bone/35 transition hover:text-ember" @click="purgePhoto(p)">{{ t('admin.deleteForever') }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 影集编辑 -->
        <template v-else>
          <div v-if="!current" class="flex h-64 items-center justify-center rounded-lg border border-dashed border-gold/10 text-sm text-bone/35">
            <button class="btn-gold" @click="startNewAlbum">创建相册</button>
          </div>

          <div v-else class="space-y-5">
            <!-- 影集信息 -->
            <div class="rounded-lg border border-gold/[0.08] bg-coal/40 p-5">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-sm font-medium tracking-wider text-bone/70">{{ current.id ? t('admin.albumInfo') : '新建相册' }}</h2>
                <div class="flex gap-2">
                  <button class="btn-ghost !px-3 !py-1.5 text-xs" :disabled="saving || albumGenerating" @click="startNewAlbum">创建相册</button>
                  <button class="btn-gold !px-3 !py-1.5 text-xs" :disabled="saving || albumGenerating || !current.title.trim()" @click="saveAlbum">{{ current.id ? t('admin.saveChanges') : '保存并创建' }}</button>
                  <button v-if="current.id" class="btn-ghost !px-3 !py-1.5 text-xs !text-ember hover:!border-ember" @click="removeAlbum">{{ t('admin.deleteAlbum') }}</button>
                </div>
              </div>

              <div class="album-ai-inline">
                <label for="album-ai-prompt">AI 相册创作描述</label>
                <textarea id="album-ai-prompt" v-model="albumPrompt" class="field" placeholder="描述拍摄主题、地点、时间与文案风格，例如：去年十月的西湖，雨后街巷与黄昏倒影。" />
                <div><button class="btn-ghost" :disabled="albumGenerating || !albumPrompt.trim()" @click="generateAlbumDraft">{{ albumGenerating ? 'AI 正在生成…' : 'AI 生成并填写相册信息' }}</button><p class="settings-note">{{ current.id ? '生成后将提示是否覆盖已有信息，确认后填入，保存后生效。' : '新相册生成后直接填入下方编辑框，保存并创建后生效。' }} 未描述时间则使用今天。</p></div>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <input v-model="current.title" class="field" :placeholder="t('admin.field.title')" />
                <input v-model="current.title_en" class="field" :placeholder="t('admin.field.titleEn')" />
                <input v-model="current.subtitle" class="field" :placeholder="t('admin.field.subtitle')" />
                <input v-model="current.location" class="field" :placeholder="t('admin.field.location')" />
                <input v-model="current.location_en" class="field" :placeholder="t('admin.field.locationEn')" />
                <input v-model="current.shot_at" class="field" :placeholder="t('admin.field.shotAt')" />
                <textarea v-model="current.description" class="field min-h-[70px] md:col-span-2" :placeholder="t('admin.field.description')" />
                <textarea v-model="current.description_en" class="field min-h-[70px] md:col-span-2" :placeholder="t('admin.field.descriptionEn')" />

                <div class="md:col-span-2">
                  <div class="flex items-center gap-3">
                    <span class="relative h-11 w-16 shrink-0 overflow-hidden rounded-sm border border-gold/10 bg-ink">
                      <img v-if="current.cover_url" :src="current.cover_url" class="h-full w-full object-cover" alt="" />
                    </span>
                    <input v-model="current.cover_url" class="field" :placeholder="t('admin.field.cover')" />
                  </div>
                </div>

                <!-- 自定义 ID -->
                <div class="md:col-span-2">
                  <label class="label mb-1 block">{{ t('admin.field.slug') }}</label>
                  <div class="flex items-center gap-2">
                    <span class="shrink-0 rounded-md border border-gold/10 bg-ink px-2 py-2 font-mono text-[10px] text-bone/30">/album/</span>
                    <input v-model="current.slug" class="field font-mono !text-xs" :placeholder="t('admin.slugPlaceholder')" />
                    <a
                      v-if="current.id" :href="publicUrl" target="_blank" rel="noreferrer"
                      class="btn-ghost shrink-0 !px-3 !py-1.5 text-xs"
                    >{{ t('admin.open') }}</a>
                  </div>
                  <p class="mt-1.5 font-mono text-[10px] text-bone/25">{{ current.id || current.slug ? publicUrl : '保存并创建后生成访问链接' }}</p>
                </div>

                <div class="md:col-span-2">
                  <label class="flex items-center gap-2 text-xs text-bone/70">
                    <input v-model="current.hidden" type="checkbox" class="accent-[#a48140]" />隐藏相册（仅管理员可见）
                  </label>
                </div>

                <div class="md:col-span-2">
                  <label class="flex items-center gap-2 text-xs text-bone/70">
                    <input v-model="current.featured" type="checkbox" class="accent-[#a48140]" />{{ t('admin.featured') }}
                  </label>
                  <p class="settings-note mt-2">{{ t('admin.featuredHint') }}</p>
                </div>

                <!-- 访问密码 -->
                <div class="md:col-span-2">
                  <label class="label mb-1 block">{{ t('admin.field.password') }}</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <input
                      v-model="newPassword"
                      type="password"
                      class="field !w-56"
                      :placeholder="current.has_password ? t('admin.passwordSet') : t('admin.passwordPlaceholder')"
                    />
                    <button
                      v-if="current.has_password"
                      class="btn-ghost !px-3 !py-1.5 text-xs !text-ember hover:!border-ember"
                      @click="clearPassword"
                    >{{ t('admin.clearPassword') }}</button>
                    <span v-else class="font-mono text-[10px] text-bone/25">{{ t('admin.passwordNone') }}</span>
                  </div>
                </div>
              </div>
            </div>

            <template v-if="current.id">
            <!-- 上传 -->
            <div class="rounded-lg border border-gold/[0.08] bg-coal/40 p-5">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-sm font-medium tracking-wider text-bone/70">{{ t('admin.upload') }}</h2>
              </div>

              <!-- Compression preferences persist on this browser between sessions. -->
              <div class="compression-panel">
                <div class="compression-heading"><h3>图片上传设置</h3><span>{{ settingsSaved ? '已自动保存，下次上传沿用' : '浏览器未能保存设置' }}</span></div>
                <div class="compression-presets">
                  <button @click="applyPreset('fast')">弱网优先</button><button @click="applyPreset('balanced')">均衡画质</button><button @click="applyPreset('detail')">精细画质</button>
                </div>
                <div class="compression-columns">
                  <fieldset><legend>原图 / 展示大图</legend>
                    <label class="compression-toggle"><input v-model="compress.enabled" type="checkbox" /> 上传前压缩</label>
                    <label>长边上限<select v-model.number="compress.maxEdge" :disabled="!compress.enabled" class="field"><option v-for="edge in [960,1280,1600,2048,2560,3840,5120]" :key="edge" :value="edge">{{ edge }} px</option><option :value="0">保留源尺寸</option></select></label>
                    <label>质量上限 <output>{{ Math.round(compress.quality * 100) }}%</output><input v-model.number="compress.quality" type="range" min="0.1" max="1" step="0.01" :disabled="!compress.enabled" /></label>
                    <label>每张体积上限（KB，0 为不限）<input v-model.number="compress.maxKB" @change="compress = normalizeCompressOptions(compress)" class="field" type="number" min="0" max="20480" step="8" :disabled="!compress.enabled" /></label>
                  </fieldset>
                  <fieldset><legend>代理图 / 快速预览</legend>
                    <p class="compression-note">优先加载，适合手机及慢速网络</p>
                    <label>长边上限<select v-model.number="compress.proxyMaxEdge" class="field"><option v-for="edge in [320,480,640,800,960,1280,1600]" :key="edge" :value="edge">{{ edge }} px</option></select></label>
                    <label>质量上限 <output>{{ Math.round(compress.proxyQuality * 100) }}%</output><input v-model.number="compress.proxyQuality" type="range" min="0.1" max="1" step="0.01" /></label>
                    <label>每张体积上限（KB）<input v-model.number="compress.proxyMaxKB" @change="compress = normalizeCompressOptions(compress)" class="field" type="number" min="8" max="2048" step="8" /></label>
                  </fieldset>
                </div>
                <div class="compression-preview">
                  <label class="btn-ghost cursor-pointer">选择照片试算<input type="file" accept="image/*" class="hidden" @change="pickCompressionSample" /></label>
                  <button v-if="compressionSample" class="btn-ghost" :disabled="previewBusy" @click="previewCompression">{{ previewBusy ? '试算中…' : '按当前设置重新试算' }}</button>
                  <p v-if="compressionSample" class="compression-note">{{ compressionSample.name }} · {{ formatBytes(compressionSample.size) }}</p>
                  <p v-if="previewStale && compressionSample" class="compression-note">设置已更新，请重新试算。</p>
                  <p v-if="previewError" role="alert" class="text-ember text-xs">{{ previewError }}</p>
                  <div v-if="compressionResult" class="compression-result">
                    <img :src="compressionResult.url" alt="压缩后的代理图预览" />
                    <div><p>大图 {{ compressionResult.width }} × {{ compressionResult.height }} · {{ formatBytes(compressionResult.originalSize) }}</p><p>代理图 {{ compressionResult.proxyWidth }} × {{ compressionResult.proxyHeight }} · {{ formatBytes(compressionResult.proxySize) }}</p><p>代理图较源文件减少 {{ Math.max(0, Math.round((1 - compressionResult.proxySize / compressionSample!.size) * 100)) }}%</p></div>
                  </div>
                </div>
              </div>

              <!-- 默认作者 -->
              <div class="mb-4 flex flex-wrap items-center gap-3">
                <label class="flex items-center gap-2 text-[11px] text-bone/45">
                  {{ t('admin.defaultAuthor') }}
                  <input v-model="defaultAuthor" class="field !w-40 !py-1.5 !text-xs" :placeholder="t('admin.defaultAuthorPlaceholder')" />
                </label>
                <span class="text-[10px] text-bone/25">{{ t('admin.defaultAuthorHint') }}</span>
              </div>

              <!-- 拖拽区 -->
              <div
                class="relative rounded-lg border-2 border-dashed p-7 text-center transition-colors"
                :class="dragging ? 'border-gold bg-gold/[0.06]' : 'border-gold/12 hover:border-gold/25'"
                @dragover.prevent="dragging = true"
                @dragleave="dragging = false"
                @drop.prevent="onDrop"
              >
                <img src="/logo.svg" alt="" class="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
                <p class="text-sm text-bone/70">
                  {{ t('admin.dropHere') }}
                  <label class="cursor-pointer text-gold underline underline-offset-4">
                    {{ t('admin.chooseFiles') }}
                    <input type="file" accept="image/*" multiple class="hidden" @change="onPick" />
                  </label>
                </p>
                <p class="mt-2 font-mono text-[10px] tracking-wider text-bone/30">{{ t('admin.exifHint') }}</p>
              </div>

              <!-- 链接添加 -->
              <div class="mt-4 rounded-md border border-gold/[0.07]">
                <button class="flex w-full items-center justify-between px-3.5 py-2.5 text-left" @click="urlPanel = !urlPanel">
                  <span class="text-xs text-bone/70">{{ t('admin.addByUrl') }}</span>
                  <span class="font-mono text-[10px] text-bone/30">{{ urlPanel ? t('admin.collapse') : t('admin.expand') }}</span>
                </button>
                <div v-if="urlPanel" class="space-y-2.5 border-t border-gold/[0.07] px-3.5 py-3.5">
                  <input v-model="urlForm.url" class="field font-mono !text-xs" :placeholder="t('admin.urlPlaceholder')" />
                  <div class="grid gap-2.5 sm:grid-cols-2">
                    <input v-model="urlForm.description" class="field !text-xs" :placeholder="t('admin.urlDesc')" />
                    <input v-model="urlForm.author" class="field !text-xs" :placeholder="t('admin.urlAuthor', { name: defaultAuthor || '—' })" />
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-mono text-[10px] text-bone/30">{{ t('admin.urlWillProbe') }}</p>
                    <button class="btn-gold !px-3.5 !py-1.5 text-xs" :disabled="urlSaving || !urlForm.url.trim()" @click="addByUrl">
                      {{ urlSaving ? t('admin.adding') : t('admin.addToAlbum') }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- 队列 -->
              <div v-if="queue.length" class="mt-4 space-y-2">
                <div
                  v-for="task in queue" :key="task.id"
                  class="rounded-md border border-gold/10 bg-ink/50 px-3.5 py-2.5"
                >
                  <div class="flex items-center gap-3 text-xs">
                    <span class="min-w-0 flex-1 truncate text-bone/75">{{ task.name }}</span>
                    <span class="hidden font-mono text-[10px] text-bone/30 sm:block">{{ task.detail }}</span>
                    <span
                      class="shrink-0 font-mono text-[10px]"
                      :class="task.status === 'done' ? 'text-gold' : task.status === 'error' ? 'text-ember' : 'text-bone/50'"
                    >
                      {{ task.status === 'error' ? task.error : t(task.stageKey) }}
                    </span>
                  </div>
                  <div v-if="task.status === 'uploading' || task.status === 'pending'" class="mt-2 h-1 overflow-hidden rounded bg-gold/10">
                    <div class="h-full bg-gold transition-all duration-300" :style="{ width: `${task.progress}%` }" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 照片列表 -->
            <div>
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-sm font-medium tracking-wider text-bone/70">
                  {{ t('admin.photos') }} <span class="font-mono text-[10px] text-bone/30">{{ current.photos.length }}</span>
                </h2>
                <span class="font-mono text-[9px] tracking-wider text-bone/25">⋮⋮ {{ t('admin.dragSortHint') }}</span>
              </div>

              <div v-if="!current.photos.length" class="flex h-40 items-center justify-center rounded-lg border border-dashed border-gold/10 text-sm text-bone/30">
                {{ t('admin.noPhotos') }}
              </div>

              <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div
                  v-for="p in current.photos" :key="p.id"
                  draggable="true"
                  class="group cursor-grab overflow-hidden rounded-lg border bg-coal/40 transition-colors active:cursor-grabbing"
                  :class="[
                    dragPhotoId === p.id ? 'opacity-40' : '',
                    photoOverId === p.id && dragPhotoId !== p.id ? 'border-gold/70' : 'border-gold/10 hover:border-gold/20',
                  ]"
                  @dragstart="startPhotoDrag(p.id, $event)"
                  @dragover.prevent="photoOverId = p.id"
                  @dragleave="photoOverId = null"
                  @drop.prevent.stop="dropPhoto(p.id)"
                  @dragend="endPhotoDrag"
                >
                  <div class="relative aspect-[4/3]">
                    <button type="button" class="block h-full w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" :aria-label="`编辑照片：${p.description || p.title || p.id}`" @click="openEdit(p)">
                    <PhotoImage
                      :src="p.url"
                      :proxy="p.proxy_url"
                      :width="p.width"
                      :height="p.height"
                      fill
                      preview-only
                      :alt="p.description || t('common.photo')"
                    />
                    </button>

                    <div class="pointer-events-none absolute left-2 top-2 flex gap-1.5">
                      <span v-if="current.cover_url === p.url" class="rounded bg-gold px-1.5 py-0.5 font-mono text-[9px] text-ink">{{ t('admin.cover') }}</span>
                      <span v-if="p.proxy_url" class="rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] text-bone/60 backdrop-blur">{{ t('admin.proxy') }}</span>
                      <span v-if="!p.qiniu_key" class="rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] text-bone/50 backdrop-blur">{{ t('admin.external') }}</span>
                    </div>

                    <span class="pointer-events-none absolute right-2 top-2 rounded bg-ink/60 px-1.5 py-0.5 font-mono text-[9px] text-bone/40 backdrop-blur">⋮⋮</span>

                    <div class="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-ink/90 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <button
                        v-if="current.cover_url !== p.url"
                        class="rounded bg-ink/70 px-2 py-1 text-[10px] text-bone/80 backdrop-blur transition hover:text-gold"
                        @click="setCover(p)"
                      >{{ t('admin.setCover') }}</button>
                      <button class="rounded bg-ink/70 px-2 py-1 text-[10px] text-bone/80 backdrop-blur transition hover:text-gold" @click="openEdit(p)">{{ t('common.edit') }}</button>
                      <button class="rounded bg-ink/70 px-2 py-1 text-[10px] text-bone/80 backdrop-blur transition hover:text-ember" @click="removePhoto(p)">{{ t('common.delete') }}</button>
                    </div>
                  </div>

                  <div class="space-y-1.5 p-3">
                    <p class="font-mono text-[10px] text-gold/80">
                      {{ [p.aperture, p.shutter, formatIso(p.iso), p.focal_length].filter(Boolean).join(' · ') || '—' }}
                    </p>
                    <p class="truncate font-mono text-[10px] text-bone/35">
                      {{ [cleanCamera(p.camera), p.lens].filter(Boolean).join(' · ') || '—' }}
                    </p>
                    <p v-if="p.author" class="font-mono text-[10px] text-bone/40">© {{ p.author }}</p>

                    <div class="flex items-center gap-1.5 pt-0.5">
                      <a
                        :href="p.url" target="_blank" rel="noreferrer"
                        class="min-w-0 flex-1 truncate font-mono text-[9px] text-bone/25 transition hover:text-gold"
                        :title="p.url"
                      >{{ shortUrl(p.url, 34) }}</a>
                      <button class="shrink-0 text-[9px] text-bone/30 transition hover:text-gold" :title="t('admin.copyLink')" @click="copyLink(p.url)">
                        {{ t('common.copy') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </template>
          </div>
        </template>
      </section>
    </div>

    <!-- 编辑照片弹层 -->
    <Teleport to="body">
      <transition name="page">
        <div v-if="editing" class="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/80 px-4 py-10 backdrop-blur-sm" @click.self="closeEdit">
          <div class="w-full max-w-3xl rounded-xl border border-gold/10 bg-coal/95 p-6 shadow-2xl">
            <div class="mb-5 flex items-start justify-between gap-4">
              <div>
                <p class="font-mono text-[10px] uppercase tracking-[0.3em] text-gold/70">Edit Photo</p>
                <h3 class="mt-1 font-serif text-lg">{{ t('admin.editPhoto') }}</h3>
              </div>
              <button class="lb-close" @click="closeEdit">✕</button>
            </div>

            <div class="ai-photo-panel">
              <button class="btn-ghost" :disabled="photoGenerating || editSaving" @click="generatePhotoDraft">{{ photoGenerating ? 'AI 正在看图撰写…' : 'AI 生成照片中英文文案' }}</button>
              <p class="settings-note">会将此照片、相册背景和拍摄参数发送给配置的视觉模型。生成后填入下方字段，点击保存后生效。</p>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <label class="col-span-full flex flex-col gap-1">
                <span class="label">{{ t('admin.imageUrl') }}</span>
                <div class="flex gap-2">
                  <input v-model="editForm.url" class="field font-mono !text-[11px]" />
                  <a :href="editForm.url" target="_blank" rel="noreferrer" class="btn-ghost shrink-0 !px-3 !py-1.5 text-xs">{{ t('admin.open') }}</a>
                </div>
              </label>
              <label class="col-span-full flex flex-col gap-1">
                <span class="label">{{ t('admin.proxyUrl') }}</span>
                <input v-model="editForm.proxy_url" class="field font-mono !text-[11px]" />
              </label>

              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.field.title') }}</span>
                <input v-model="editForm.title" class="field" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.titleEnPhoto') }}</span>
                <input v-model="editForm.title_en" class="field" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.author') }}</span>
                <input v-model="editForm.author" class="field" :placeholder="t('admin.authorEmpty')" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.lens') }}</span>
                <input v-model="editForm.lens" class="field" placeholder="NIKKOR Z 24-70mm f/2.8 S" />
              </label>
              <label class="col-span-full flex flex-col gap-1">
                <span class="label">{{ t('admin.field.description') }}</span>
                <textarea v-model="editForm.description" class="field min-h-[60px]" />
              </label>
              <label class="col-span-full flex flex-col gap-1">
                <span class="label">{{ t('admin.descEnPhoto') }}</span>
                <textarea v-model="editForm.description_en" class="field min-h-[60px]" />
              </label>

              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.camera') }}</span>
                <input v-model="editForm.camera" class="field" placeholder="NIKON Z5_2" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.takenAt') }}</span>
                <input v-model="editForm.taken_at" class="field" placeholder="2026-10-10 17:14" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.aperture') }}</span>
                <input v-model="editForm.aperture" class="field" placeholder="f/2.8" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.shutter') }}</span>
                <input v-model="editForm.shutter" class="field" placeholder="1/250s" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.iso') }}</span>
                <input v-model="editForm.iso" class="field" placeholder="ISO 200" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="label">{{ t('admin.focal') }}</span>
                <input v-model="editForm.focal_length" class="field" placeholder="35mm" />
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label class="flex flex-col gap-1">
                  <span class="label">{{ t('admin.width') }}</span>
                  <input v-model.number="editForm.width" type="number" class="field" />
                </label>
                <label class="flex flex-col gap-1">
                  <span class="label">{{ t('admin.height') }}</span>
                  <input v-model.number="editForm.height" type="number" class="field" />
                </label>
              </div>
            </div>

            <div class="mt-5 flex items-center justify-between gap-3">
              <p class="truncate font-mono text-[10px] text-bone/25">
                {{ editing.qiniu_key ? t('admin.qiniuKey', { key: editing.qiniu_key }) : t('admin.externalNote') }}
              </p>
              <div class="flex shrink-0 gap-2">
                <button class="btn-ghost !px-4 !py-1.5 text-xs" @click="closeEdit">{{ t('common.cancel') }}</button>
                <button class="btn-gold !px-4 !py-1.5 text-xs" :disabled="editSaving || photoGenerating" @click="saveEdit">
                  {{ editSaving ? t('common.saving') : t('common.save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 轻提示 -->
    <transition name="page">
      <div
        v-if="toast"
        class="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full border px-4 py-2 text-xs backdrop-blur-md"
        :class="toast.kind === 'err'
          ? 'border-ember/40 bg-ember/10 text-ember'
          : 'border-gold/30 bg-ink/85 text-bone/85'"
      >
        {{ toast.msg }}
      </div>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { siteSettings, applySiteSettings } from '../lib/site';
import { useRoute, useRouter } from 'vue-router';
import {
  api, clearToken, type AlbumDraft, type HeroSlide, type Album, type AlbumDetail, type Photo, type TrashPhoto,
} from '../api';
import PhotoImage from '../components/PhotoImage.vue';
import AISettings from '../components/AISettings.vue';
import ServerSettings from '../components/ServerSettings.vue';
import { DEFAULT_COMPRESS, normalizeCompressOptions, prepareUpload, probeImageSize, type CompressOptions } from '../lib/image';
import { uploadBlob } from '../lib/upload';
import { readPhotoExif } from '../lib/exif';
import { cleanCamera, formatBytes, formatIso, shortUrl, timeAgo } from '../lib/format';
import { pick, t , localePath } from '../lib/i18n';

interface UploadTask {
  id: number;
  name: string;
  status: 'pending' | 'uploading' | 'saving' | 'done' | 'error';
  stageKey: string;
  detail: string;
  progress: number;
  error?: string;
}

const router = useRouter();
const route = useRoute();
const adminTabs = [{key:'site',label:'网站'},{key:'albums',label:'影集'},{key:'slides',label:'轮播图'},{key:'music',label:'背景音乐'},{key:'model',label:'配置'},{key:'trash',label:'回收站'}];
const validTab = (value: unknown) => adminTabs.some(tab => tab.key === value) ? String(value) : 'site';
const activeTab = ref(validTab(route.query.tab));
function setTab(key: string) { activeTab.value = key; mode.value = key === 'trash' ? 'trash' : 'album'; router.replace({ query: { ...route.query, tab: key } }); if (key === 'trash') loadTrash(); }
watch(() => route.query.tab, value => { const key = validTab(value); if (activeTab.value !== key) { activeTab.value = key; mode.value = key === 'trash' ? 'trash' : 'album'; if (key === 'trash') loadTrash(); } });

const albums = ref<Album[]>([]);
const current = ref<AlbumDetail | null>(null);
const emptyAlbumDraft = (): AlbumDraft => ({ title: '', title_en: '', subtitle: '', description: '', description_en: '', location: '', location_en: '', shot_at: '', slug: '', cover_url: '' });
const albumPrompt = ref(''), albumGenerating = ref(false), photoGenerating = ref(false);
function startNewAlbum() {
  current.value = { ...emptyAlbumDraft(), id: 0, created_at: '', sort_order: 0, photos: [], has_password: false, hidden: false, featured: false };
  albumPrompt.value = ''; newPassword.value = ''; clearPasswordFlag.value = false;
  setTab('albums');
}
async function generateAlbumDraft() {
  if (!current.value || albumGenerating.value || !albumPrompt.value.trim()) return;
  const id = current.value.id, snapshot = JSON.stringify(current.value);
  albumGenerating.value = true;
  try {
    const draft = await api.generateAlbum(albumPrompt.value, current.value);
    if (!current.value || current.value.id !== id || JSON.stringify(current.value) !== snapshot) return notify('表单已变更，未覆盖当前内容，请重新生成', 'err');
    if (id && !window.confirm('AI 相册信息已生成，是否覆盖当前已填写的相册信息？确认后会填入编辑框，点击“保存修改”后才写入数据库。')) return;
    Object.assign(current.value, draft); notify('AI 信息已填入，请检查后保存');
  } catch(e: any) { notify(e.message, 'err'); } finally { albumGenerating.value = false; }
}
async function generatePhotoDraft() {
  if (!editing.value || photoGenerating.value) return;
  const id = editing.value.id, snapshot = JSON.stringify(editForm);
  photoGenerating.value = true;
  try {
    const draft = await api.generatePhoto(id, current.value || {}, editForm);
    if (editing.value?.id !== id || JSON.stringify(editForm) !== snapshot) return notify('照片或表单已变更，未覆盖当前内容', 'err');
    Object.assign(editForm, draft); notify('照片中英文文案已填入，请检查后保存');
  } catch(e: any) { notify(e.message, 'err'); } finally { photoGenerating.value = false; }
}
const queue = ref<UploadTask[]>([]);
const dragging = ref(false);
const saving = ref(false);
const qiniuReady = ref(true);
async function refreshStorageStatus() { try { qiniuReady.value = (await api.site()).qiniuReady; } catch(e: any) { notify(e.message, 'err'); } }
const mode = ref<'album' | 'trash'>('album');

// 回收站
const trash = ref<TrashPhoto[]>([]);
const loadingTrash = ref(false);
const trashCount = computed(() => albums.value.reduce((sum, a) => sum + (a.trash_count ?? 0), 0));
const totalPhotos = computed(() => albums.value.reduce((sum, a) => sum + (a.photo_count ?? 0), 0));

// 链接添加
const urlPanel = ref(false);
const urlSaving = ref(false);
const urlForm = ref({ url: '', description: '', author: '' });

// 编辑弹层
const editing = ref<Photo | null>(null);
const editForm = reactive<Record<string, any>>({});
const editSaving = ref(false);

// 站点背景图
const siteSlides = ref<HeroSlide[]>([]);
const siteInterval = ref(5);
const musicForm = reactive({ url: '', volume: .25 });
const identityForm = reactive({ name: siteSettings.name, subtitle: siteSettings.subtitle, author: siteSettings.author, description: siteSettings.description, logo: '', timeZone: siteSettings.timeZone });
const aboutForm = reactive({ title: '', body: '', image: '' });
function moveSlide(i: number, d: number) { const j = i + d; if (j < 0 || j >= siteSlides.value.length) return; [siteSlides.value[i], siteSlides.value[j]] = [siteSlides.value[j], siteSlides.value[i]]; }
async function saveSettingsPage(tab: 'site' | 'slides' | 'music') {
  heroSaving.value = true;
  try {
    const patch = tab === 'site' ? { site_name: identityForm.name, site_subtitle: identityForm.subtitle, author_name: identityForm.author, site_description: identityForm.description, site_logo: identityForm.logo, site_timezone: identityForm.timeZone, about_title: aboutForm.title, about_body: aboutForm.body, about_image: aboutForm.image }
      : tab === 'slides' ? { hero_slides: siteSlides.value, hero_interval: siteInterval.value, hero_image: '' }
      : { music_url: musicForm.url, music_volume: musicForm.volume };
    await api.updateSettings(patch);
    const previousAuthor = siteSettings.author;
    const site = await api.site(); applySiteSettings(site);
    if (!defaultAuthor.value || defaultAuthor.value === previousAuthor) defaultAuthor.value = site.author;
    window.dispatchEvent(new Event('lumen:settings-updated')); notify(t('toast.saved'));
  } catch(e: any) { notify(e.message, 'err'); } finally { heroSaving.value = false; }
}
const heroSaving = ref(false);

// 相册密码
const newPassword = ref('');
const clearPasswordFlag = ref(false);

// 上传设置（本地记住）
const compress = ref<CompressOptions>({ ...DEFAULT_COMPRESS });
const defaultAuthor = ref('');
const settingsSaved = ref(true);
const compressionSample = ref<File | null>(null);
const compressionResult = ref<(Awaited<ReturnType<typeof prepareUpload>> & { url: string }) | null>(null);
const previewBusy = ref(false), previewStale = ref(false), previewError = ref('');
let previewGeneration = 0;
function applyPreset(kind: 'fast' | 'balanced' | 'detail') {
  const presets = {
    fast: { ...DEFAULT_COMPRESS, maxEdge: 2048, quality: .7, maxKB: 800, proxyMaxEdge: 640, proxyQuality: .4, proxyMaxKB: 40 },
    balanced: { ...DEFAULT_COMPRESS },
    detail: { ...DEFAULT_COMPRESS, maxEdge: 3840, quality: .92, maxKB: 3200, proxyMaxEdge: 1280, proxyQuality: .72, proxyMaxKB: 160 },
  };
  compress.value = presets[kind];
}
async function pickCompressionSample(e: Event) {
  const input = e.target as HTMLInputElement;
  compressionSample.value = input.files?.[0] || null; input.value = '';
  if (compressionSample.value) await previewCompression();
}
async function previewCompression() {
  if (!compressionSample.value) return;
  const generation = ++previewGeneration;
  previewBusy.value = true; previewError.value = '';
  const options = normalizeCompressOptions(compress.value);
  const settings = JSON.stringify(compress.value);
  try {
    const result = await prepareUpload(compressionSample.value, options);
    if (generation !== previewGeneration) return;
    if (compressionResult.value) URL.revokeObjectURL(compressionResult.value.url);
    compressionResult.value = { ...result, url: URL.createObjectURL(result.proxy) };
    previewStale.value = settings !== JSON.stringify(compress.value);
  } catch(e: any) { if (generation === previewGeneration) previewError.value = e.message; }
  finally { if (generation === previewGeneration) previewBusy.value = false; }
}
onUnmounted(() => { previewGeneration++; if (compressionResult.value) URL.revokeObjectURL(compressionResult.value.url); });
const STORAGE_KEY = 'lumen_upload_settings';

// 拖动排序
const dragPhotoId = ref<number | null>(null);
const photoOverId = ref<number | null>(null);
const dragAlbumId = ref<number | null>(null);
const albumOverId = ref<number | null>(null);

// 提示
const toast = ref<{ msg: string; kind: 'ok' | 'err' } | null>(null);
let toastTimer = 0;
function notify(msg: string, kind: 'ok' | 'err' = 'ok') {
  toast.value = { msg, kind };
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.value = null; }, 2600);
}

const publicUrl = computed(() => {
  if (!current.value) return '';
  const key = current.value.slug || current.value.id;
  return `${window.location.origin}${localePath(`/album/${key}`)}`;
});

let taskSeq = 0;

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.compress) compress.value = normalizeCompressOptions(saved.compress);
    if (typeof saved.author === 'string') defaultAuthor.value = saved.author;
  } catch { /* 忽略损坏的本地设置 */ }
}
function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ compress: normalizeCompressOptions(compress.value), author: defaultAuthor.value }));
    settingsSaved.value = true;
  } catch { settingsSaved.value = false; }
}
watch(compress, () => { previewStale.value = true; saveSettings(); }, { deep: true });
watch(defaultAuthor, saveSettings);

function toggleCompress() {
  compress.value = { ...compress.value, enabled: !compress.value.enabled };
}

function logout() {
  clearToken();
  router.push(localePath('/login'));
}

// ---------- 影集 ----------

async function refreshAlbums(keepSelected = true) {
  albums.value = await api.albums();
  if (mode.value === 'trash') return;
  if (current.value && keepSelected) {
    const still = albums.value.find((a) => a.id === current.value!.id);
    if (still) await selectAlbum(still.id);
    else current.value = null;
  }
}

async function selectAlbum(id: number) {
  mode.value = 'album';
  current.value = (await api.album(id)) as AlbumDetail;
  newPassword.value = '';
  clearPasswordFlag.value = false;
}

async function saveAlbum() {
  if (!current.value || !current.value.title.trim()) return;
  if (!current.value.id) {
    saving.value = true;
    try {
      const { photos, id, created_at, sort_order, ...body } = current.value;
      const a = await api.createAlbum({ ...body, ...(newPassword.value ? {password:newPassword.value} : {}) });
      await refreshAlbums(false); await selectAlbum(a.id); notify(t('toast.albumCreated'));
    } catch(e: any) { notify(e.message, 'err'); } finally { saving.value = false; }
    return;
  }
  saving.value = true;
  try {
    const { photos, ...body } = current.value;
    const payload: any = { ...body };
    if (newPassword.value) payload.password = newPassword.value;
    if (clearPasswordFlag.value) payload.clear_password = true;
    const updated = await api.updateAlbum(current.value.id, payload);
    current.value.has_password = updated.has_password;
    current.value.locked = updated.locked;
    newPassword.value = '';
    clearPasswordFlag.value = false;
    const nextAlbums = await api.albums();
    albums.value = nextAlbums;
    notify(t('toast.saved'));
  } catch (e: any) {
    notify(e.message, 'err');
  } finally {
    saving.value = false;
  }
}

async function clearPassword() {
  if (!current.value) return;
  clearPasswordFlag.value = true;
  newPassword.value = '';
  await saveAlbum();
}

async function removeAlbum() {
  if (!current.value) return;
  const n = current.value.photos.length;
  if (!confirm(t('confirm.deleteAlbum', { title: current.value.title, n }))) return;
  try {
    await api.deleteAlbum(current.value.id);
    current.value = null;
    await refreshAlbums(false);
    if (albums.value.length) await selectAlbum(albums.value[0].id);
    if (activeTab.value === 'trash') { mode.value = 'trash'; await loadTrash(); }
    notify(t('toast.albumDeleted'));
  } catch (e: any) {
    notify(e.message, 'err');
  }
}

async function setCover(p: Photo) {
  if (!current.value) return;
  current.value.cover_url = p.url;
  await saveAlbum();
}

// ---------- 拖动排序 ----------

function startPhotoDrag(id: number, e: DragEvent) {
  dragPhotoId.value = id;
  e.dataTransfer?.setData('text/plain', String(id));
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}
function endPhotoDrag() {
  dragPhotoId.value = null;
  photoOverId.value = null;
}
async function dropPhoto(targetId: number) {
  const fromId = dragPhotoId.value;
  const list = current.value?.photos;
  endPhotoDrag();
  if (!list || !fromId || fromId === targetId) return;
  const from = list.findIndex((p) => p.id === fromId);
  const to = list.findIndex((p) => p.id === targetId);
  if (from < 0 || to < 0) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  try {
    await api.reorderPhotos(current.value!.id, list.map((p) => p.id));
    notify(t('toast.orderSaved'));
  } catch (e: any) {
    notify(e.message, 'err');
    if (current.value) current.value = (await api.album(current.value.id)) as AlbumDetail;
  }
}

function startAlbumDrag(id: number, e: DragEvent) {
  dragAlbumId.value = id;
  e.dataTransfer?.setData('text/plain', String(id));
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}
function endAlbumDrag() {
  dragAlbumId.value = null;
  albumOverId.value = null;
}
async function dropAlbum(targetId: number) {
  const fromId = dragAlbumId.value;
  const list = albums.value;
  endAlbumDrag();
  if (!fromId || fromId === targetId) return;
  const from = list.findIndex((a) => a.id === fromId);
  const to = list.findIndex((a) => a.id === targetId);
  if (from < 0 || to < 0) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  try {
    await api.reorderAlbums(list.map((a) => a.id));
    notify(t('toast.orderSaved'));
  } catch (e: any) {
    notify(e.message, 'err');
    albums.value = await api.albums();
  }
}

// ---------- 照片编辑 ----------

function openEdit(p: Photo) {
  editing.value = p;
  for (const key of Object.keys(editForm)) delete editForm[key];
  Object.assign(editForm, {
    url: p.url,
    proxy_url: p.proxy_url,
    title: p.title,
    title_en: p.title_en,
    description: p.description,
    description_en: p.description_en,
    author: p.author,
    lens: p.lens,
    camera: cleanCamera(p.camera),
    aperture: p.aperture,
    shutter: p.shutter,
    iso: p.iso,
    focal_length: p.focal_length,
    taken_at: p.taken_at,
    width: p.width,
    height: p.height,
  });
}
function closeEdit() {
  editing.value = null;
}
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && editing.value) closeEdit();
}
watch(editing, (open) => {
  if (open) window.addEventListener('keydown', onEsc);
  else window.removeEventListener('keydown', onEsc);
});
onUnmounted(() => window.removeEventListener('keydown', onEsc));

async function saveEdit() {
  if (!editing.value) return;
  editSaving.value = true;
  try {
    const updated = await api.updatePhoto(editing.value.id, editForm as Partial<Photo>);
    if (current.value) {
      const i = current.value.photos.findIndex((x) => x.id === updated.id);
      if (i >= 0) current.value.photos[i] = updated;
      if (current.value.cover_url === editing.value.url) current.value.cover_url = updated.url;
    }
    editing.value = null;
    notify(t('toast.photoSaved'));
  } catch (e: any) {
    notify(e.message, 'err');
  } finally {
    editSaving.value = false;
  }
}

// ---------- 删除 / 回收站 ----------

async function removePhoto(p: Photo) {
  if (!confirm(t('confirm.deletePhoto'))) return;
  try {
    await api.deletePhoto(p.id);
    if (current.value) current.value.photos = current.value.photos.filter((x) => x.id !== p.id);
    await refreshAlbums();
    notify(t('toast.photoTrashed'));
  } catch (e: any) {
    notify(e.message, 'err');
  }
}

async function openTrash() {
  setTab('trash');
}

async function loadTrash() {
  loadingTrash.value = true;
  try {
    trash.value = await api.trash();
  } catch (e: any) {
    notify(e.message, 'err');
  } finally {
    loadingTrash.value = false;
  }
}

async function restorePhoto(p: TrashPhoto) {
  try {
    await api.restorePhoto(p.id);
    trash.value = trash.value.filter((x) => x.id !== p.id);
    albums.value = await api.albums();
    if (current.value?.id === p.album_id) current.value = (await api.album(p.album_id)) as AlbumDetail;
    notify(t('toast.photoRestored'));
  } catch (e: any) {
    notify(e.message, 'err');
  }
}

async function purgePhoto(p: TrashPhoto) {
  if (!confirm(t('confirm.purgePhoto'))) return;
  try {
    await api.purgePhoto(p.id);
    trash.value = trash.value.filter((x) => x.id !== p.id);
    await refreshAlbums();
    notify(t('toast.photoDeleted'));
  } catch (e: any) {
    notify(e.message, 'err');
  }
}

async function emptyTrash() {
  if (!trash.value.length) return;
  if (!confirm(t('confirm.emptyTrash', { n: trash.value.length }))) return;
  try {
    const res = await api.emptyTrash();
    trash.value = [];
    await refreshAlbums();
    notify(t('toast.trashEmptied', {
      n: res.deleted,
      f: res.files ? t('toast.filesSuffix', { n: res.files }) : '',
    }));
  } catch (e: any) {
    notify(e.message, 'err');
  }
}

// ---------- 上传 ----------

function onDrop(e: DragEvent) {
  dragging.value = false;
  const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
  if (files.length) uploadFiles(files);
  else notify(t('admin.dropImages'), 'err');
}
function onPick(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? []);
  if (files.length) uploadFiles(files);
  (e.target as HTMLInputElement).value = '';
}

async function uploadFiles(files: File[]) {
  if (!current.value) return;
  const albumId = current.value.id;
  const uploadOptions = normalizeCompressOptions(compress.value);
  compress.value = uploadOptions;

  for (const file of files) {
    // 用 reactive 包一层：任务进度直接改对象也要能驱动界面刷新
    const task = reactive<UploadTask>({
      id: ++taskSeq,
      name: file.name,
      status: 'pending',
      stageKey: 'admin.stageQueued',
      detail: formatBytes(file.size),
      progress: 0,
    });
    queue.value.push(task);

    try {
      // 1. EXIF
      task.stageKey = 'admin.stageExif';
      const meta = await readPhotoExif(file);

      // 2. 压缩 + 生成代理图
      const prepared = await prepareUpload(file, uploadOptions, (stage) => {
        task.stageKey = `admin.stage${stage.charAt(0).toUpperCase()}${stage.slice(1)}`;
      });
      task.detail = prepared.compressed
        ? `${formatBytes(file.size)} → ${formatBytes(prepared.original.size)}`
        : `${formatBytes(file.size)} · ${t('admin.notCompressed')}`;
      task.detail += ` · 代理图 ${formatBytes(prepared.proxySize)} (${prepared.proxyWidth}×${prepared.proxyHeight})`;

      // 3. 双凭证，先传原图再传代理图
      const ticket = await api.uploadTicket(prepared.originalName);
      task.status = 'uploading';
      task.stageKey = 'admin.stageUploadOriginal';
      await uploadBlob(prepared.original, ticket.original.key, ticket.original.token, (percent) => {
        task.progress = Math.round(percent * 0.8);
      });

      task.stageKey = 'admin.stageUploadProxy';
      await uploadBlob(prepared.proxy, ticket.proxy.key, ticket.proxy.token, (percent) => {
        task.progress = 80 + Math.round(percent * 0.2);
      });

      // 4. 落库
      task.status = 'saving';
      task.stageKey = 'admin.stageSave';
      const photo = await api.createPhoto({
        album_id: albumId,
        url: ticket.original.url,
        proxy_url: ticket.proxy.url,
        qiniu_key: ticket.original.key,
        proxy_key: ticket.proxy.key,
        author: defaultAuthor.value.trim(),
        width: prepared.width,
        height: prepared.height,
        ...meta,
      });

      if (current.value?.id === albumId) {
        current.value.photos.push(photo);
        if (!current.value.cover_url) {
          current.value.cover_url = photo.url;
          await saveAlbum();
        }
      }
      task.progress = 100;
      task.status = 'done';
      task.stageKey = 'admin.stageDone';
    } catch (e: any) {
      task.status = 'error';
      task.error = e?.message?.includes('未配置') ? t('admin.qiniuMissing') : (e?.message || t('admin.stageFailed'));
      console.error(e);
    }
  }

  await refreshAlbums(false);
  window.setTimeout(() => {
    queue.value = queue.value.filter((t2) => t2.status !== 'done');
  }, 4000);
}

async function addByUrl() {
  if (!current.value || !urlForm.value.url.trim()) return;
  const url = urlForm.value.url.trim();
  if (!/^(https?:\/\/|\/)[^\s]+$/i.test(url)) {
    notify(t('admin.badUrl'), 'err');
    return;
  }
  urlSaving.value = true;
  try {
    // 探测尺寸最多等 2.5 秒，慢图不阻塞添加；尺寸之后异步补上
    const probed = await Promise.race([
      probeImageSize(url, 2500),
      new Promise<{ width: number; height: number }>((resolve) => {
        window.setTimeout(() => resolve({ width: 0, height: 0 }), 2600);
      }),
    ]);
    const albumId = current.value.id;
    const photo = await api.createPhoto({
      album_id: albumId,
      url,
      author: (urlForm.value.author || defaultAuthor.value).trim(),
      description: urlForm.value.description.trim(),
      width: probed.width,
      height: probed.height,
    });
    current.value.photos.push(photo);
    if (!current.value.cover_url) {
      current.value.cover_url = photo.url;
      await saveAlbum();
    }
    urlForm.value = { url: '', description: '', author: '' };
    await refreshAlbums();
    notify(t('toast.photoAdded'));

    // 尺寸没测出来就后台再试一次，补进数据库
    if (!probed.width) {
      probeImageSize(url)
        .then(({ width, height }) => (width && height ? api.updatePhoto(photo.id, { width, height }) : null))
        .then((updated) => {
          if (!updated || !current.value) return;
          const i = current.value.photos.findIndex((x) => x.id === updated.id);
          if (i >= 0) current.value.photos[i] = updated;
        })
        .catch(() => { /* 外链读不到尺寸就按原图比例显示 */ });
    }
  } catch (e: any) {
    notify(e.message, 'err');
  } finally {
    urlSaving.value = false;
  }
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    notify(t('toast.linkCopied'));
  } catch {
    const input = document.createElement('textarea');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    notify(t('toast.linkCopied'));
  }
}

onMounted(async () => {
  loadSettings();
  try {
    const site = await api.site();
    qiniuReady.value = site.qiniuReady;
    applySiteSettings(site);
    Object.assign(identityForm, { name: site.name, subtitle: site.subtitle, author: site.author, description: site.description, logo: site.logo, timeZone: site.timeZone });
    if (!defaultAuthor.value) defaultAuthor.value = site.author;
    siteSlides.value = site.heroSlides?.length ? site.heroSlides : site.heroImage ? [{ url: site.heroImage, caption: '' }] : [];
    siteInterval.value = site.heroInterval || 5;
    Object.assign(musicForm, { url: site.musicUrl || '', volume: site.musicVolume ?? .25 });
    Object.assign(aboutForm, { title: site.aboutTitle, body: site.aboutBody, image: site.aboutImage });
    await refreshAlbums(false);
    if (albums.value.length) await selectAlbum(albums.value[0].id);
    if (activeTab.value === 'trash') { mode.value = 'trash'; await loadTrash(); }
  } catch (e: any) {
    if (e.message.includes('未登录')) router.push(localePath('/login'));
    else notify(e.message, 'err');
  }
});
</script>

<style scoped>
.mini-field {
  @apply rounded border border-gold/10 bg-ink px-1.5 py-1 font-mono text-[11px] text-bone/70 outline-none;
}
.label {
  @apply font-mono text-[9px] uppercase tracking-[0.2em] text-bone/35;
}
.lb-close {
  @apply flex h-8 w-8 items-center justify-center rounded-full border border-gold/10 text-bone/50 transition hover:border-gold/50 hover:text-gold;
}
</style>
