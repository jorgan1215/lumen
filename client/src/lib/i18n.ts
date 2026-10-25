import { ref } from 'vue';

export type Locale = 'zh' | 'en';

const STORAGE_KEY = 'lumen_locale';

function initialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' ? 'en' : 'zh';
}

export const locale = ref<Locale>(initialLocale());
document.documentElement.lang = locale.value === 'en' ? 'en' : 'zh-CN';

/** [中文, English] */
const dict: Record<string, [string, string]> = {
  // 导航 / 通用
  'nav.albums': ['影集', 'Collections'],
  'nav.admin': ['管理', 'Admin'],
  'nav.lang': ['EN', '中文'],
  'common.photos': ['张照片', 'photos'],
  'common.photo': ['照片', 'photo'],
  'common.cancel': ['取消', 'Cancel'],
  'common.save': ['保存', 'Save'],
  'common.saving': ['保存中…', 'Saving…'],
  'common.delete': ['删除', 'Delete'],
  'common.edit': ['编辑', 'Edit'],
  'common.back': ['返回', 'Back'],
  'common.loading': ['加载中…', 'Loading…'],
  'common.close': ['关闭', 'Close'],
  'common.copy': ['复制', 'Copy'],
  'common.copied': ['已复制', 'Copied'],
  'common.optional': ['（可选）', ' (optional)'],

  // 首页
  'home.eyebrow': ['Photography Portfolio', 'Photography Portfolio'],
  'home.tagline1': ['光比语言先到达。', 'Light arrives before words do.'],
  'home.tagline2': ['这里是一些被时间留住的光。', 'A collection of light held still by time.'],
  'home.scroll': ['Scroll', 'Scroll'],
  'home.collections': ['Collections', 'Collections'],
  'home.albums': ['影集', 'Collections'],
  'home.noAlbums': ['还没有影集。', 'No collections yet.'],
  'home.goAdmin': ['到后台', 'Open the dashboard'],
  'home.createFirst': ['创建第一个吧。', 'to create your first one.'],
  'home.enter': ['进入影集', 'View collection'],
  'home.stat': ['{a} 集 · {p} 张', '{a} collections · {p} photos'],
  'home.photos': ['PHOTOS', 'PHOTOS'],
  'home.footer': ['LUMEN · 光影集 — 记录光到达的地方', 'LUMEN — where light is kept'],
  'home.locked': ['加密', 'Locked'],

  // 影集页
  'album.collection': ['Collection', 'Collection'],
  'album.photos': ['{n} 张照片', '{n} photos'],
  'album.empty': ['这个影集还没有照片', 'This collection has no photos yet'],
  'album.backAll': ['返回首页', 'Back to home'],
  'album.loadingPhotos': ['已加载 {n} / {total}', '{n} / {total} loaded'],
  'album.lockedTitle': ['这本影集已加密', 'This collection is protected'],
  'album.lockedHint': ['输入访问密码后查看照片', 'Enter the password to view the photos'],
  'album.password': ['访问密码', 'Password'],
  'album.unlock': ['进入影集', 'Unlock'],
  'album.unlocking': ['验证中…', 'Checking…'],
  'album.wrongPassword': ['密码不对，请再试一次', 'Wrong password, please try again'],

  // 灯箱
  'lightbox.prev': ['上一张', 'Previous'],
  'lightbox.next': ['下一张', 'Next'],
  'lightbox.zoomIn': ['放大', 'Zoom in'],
  'lightbox.zoomOut': ['缩小', 'Zoom out'],
  'lightbox.reset': ['重置', 'Reset'],
  'lightbox.hint': ['滚轮缩放 · 双击放大 · 拖动平移 · ← → 切换', 'Scroll to zoom · double-click · drag to pan · ← → to browse'],
  'lightbox.failed': ['图片暂时没有加载出来', 'Image could not be loaded'],
  'image.original': ['原图', 'Original'],
  'image.preview': ['预览', 'Preview'],
  'image.originalHint': ['当前显示的是原图', 'Showing the original image'],
  'image.previewHint': ['原图还在加载，当前显示的是代理图', 'Showing the proxy while the original loads'],
  'lightbox.author': ['作者', 'Author'],

  // 登录
  'login.admin': ['Admin', 'Admin'],
  'login.title': ['管理登录', 'Sign in'],
  'login.username': ['用户名', 'Username'],
  'login.password': ['密码', 'Password'],
  'login.submit': ['登录', 'Sign in'],
  'login.loading': ['登录中…', 'Signing in…'],
  'login.hint': ['账号密码配置在 server/config.json 的 admin 字段', 'Credentials live in server/config.json (admin)'],

  // 后台
  'admin.dashboard': ['Dashboard', 'Dashboard'],
  'admin.title': ['影集管理', 'Manage collections'],
  'admin.viewSite': ['查看站点', 'View site'],
  'admin.logout': ['退出登录', 'Sign out'],
  'admin.stat.albums': ['影集', 'Albums'],
  'admin.stat.photos': ['照片', 'Photos'],
  'admin.stat.trash': ['回收站', 'Trash'],
  'admin.newAlbum': ['新建影集', 'New collection'],
  'admin.albumTitle': ['影集标题 *', 'Title *'],
  'admin.albumSubtitle': ['英文副标题（可选）', 'Subtitle (optional)'],
  'admin.albumDescription': ['描述（可选）', 'Description (optional)'],
  'admin.createAlbum': ['创建影集', 'Create'],
  'admin.allAlbums': ['全部影集', 'All collections'],
  'admin.albumPhotos': ['{n} 张', '{n} photos'],
  'admin.emptyHint': ['选择左侧影集，或新建一个影集开始上传照片', 'Pick a collection on the left, or create one to start uploading'],
  'admin.albumInfo': ['影集信息', 'Collection details'],
  'admin.saveChanges': ['保存修改', 'Save'],
  'admin.deleteAlbum': ['删除影集', 'Delete collection'],
  'admin.field.title': ['标题', 'Title'],
  'admin.field.subtitle': ['英文副标题', 'Subtitle'],
  'admin.field.location': ['拍摄地点', 'Location'],
  'admin.field.shotAt': ['拍摄时间，如 2026-04', 'Date, e.g. 2026-04'],
  'admin.field.description': ['影集描述', 'Description'],
  'admin.field.cover': ['封面图 URL（也可在照片上点「设为封面」）', 'Cover URL (or use “Set as cover” on a photo)'],
  'admin.field.slug': ['自定义 ID（访问地址最后一段）', 'Custom ID (last part of the URL)'],
  'admin.field.titleEn': ['英文标题', 'Title (English)'],
  'admin.field.locationEn': ['英文地点', 'Location (English)'],
  'admin.field.descriptionEn': ['英文描述', 'Description (English)'],
  'admin.field.password': ['访问密码', 'Password'],
  'admin.passwordSet': ['已设置密码，输入新密码可更换', 'Password set — enter a new one to change it'],
  'admin.passwordNone': ['留空表示不加密', 'Leave empty for a public album'],
  'admin.clearPassword': ['清除密码', 'Remove password'],
  'admin.passwordCleared': ['密码已清除', 'Password removed'],
  'admin.albumLink': ['访问地址', 'Public URL'],
  'admin.upload': ['上传照片', 'Upload photos'],
  'admin.uploadHint': ['直传七牛 · 自动读 EXIF', 'Direct to Qiniu · EXIF auto-read'],
  'admin.compress': ['上传前压缩原图', 'Compress before upload'],
  'admin.maxEdge': ['长边', 'Long edge'],
  'admin.quality': ['质量', 'Quality'],
  'admin.noResize': ['不缩放', 'No resize'],
  'admin.proxyNote': ['代理图长边 {edge}px · 质量 {q}%', 'Proxy {edge}px · {q}% quality'],
  'admin.defaultAuthor': ['默认作者', 'Default author'],
  'admin.defaultAuthorHint': ['会写进新照片的作者字段，之后可单独修改', 'Applied to new photos; editable per photo'],
  'admin.defaultAuthorPlaceholder': ['留空则不填', 'Leave empty'],
  'admin.dropHere': ['拖拽照片到这里，或', 'Drop photos here, or'],
  'admin.chooseFiles': ['点击选择', 'choose files'],
  'admin.exifHint': ['自动读取光圈 / 快门 / ISO / 焦距 / 镜头 / 拍摄时间', 'EXIF: aperture / shutter / ISO / focal length / lens / date'],
  'admin.addByUrl': ['通过图片链接添加（不上传文件）', 'Add from an image URL (no upload)'],
  'admin.collapse': ['收起', 'Collapse'],
  'admin.expand': ['展开', 'Expand'],
  'admin.urlPlaceholder': ['https://example.com/photo.jpg', 'https://example.com/photo.jpg'],
  'admin.urlDesc': ['描述（可选）', 'Description (optional)'],
  'admin.urlAuthor': ['作者（默认 {name}）', 'Author (default {name})'],
  'admin.urlWillProbe': ['添加后会尝试读取图片尺寸', 'Image size is detected after adding'],
  'admin.addToAlbum': ['添加到影集', 'Add to collection'],
  'admin.adding': ['添加中…', 'Adding…'],
  'admin.photos': ['照片', 'Photos'],
  'admin.editHint': ['点击卡片上的「编辑」可改链接与 EXIF', 'Use “Edit” on a card to change links and EXIF'],
  'admin.noPhotos': ['还没有照片', 'No photos yet'],
  'admin.cover': ['封面', 'Cover'],
  'admin.proxy': ['代理图', 'Proxy'],
  'admin.external': ['外链', 'External'],
  'admin.setCover': ['设为封面', 'Set as cover'],
  'admin.dragSortHint': ['拖动卡片可调整照片顺序', 'Drag cards to reorder photos'],
  'admin.dragAlbumHint': ['拖动可调整影集顺序', 'Drag to reorder collections'],
  'admin.editPhoto': ['编辑照片信息', 'Edit photo'],
  'admin.imageUrl': ['图片地址（访问链接）', 'Image URL'],
  'admin.open': ['打开', 'Open'],
  'admin.proxyUrl': ['代理图地址（可留空，留空则直接用原图）', 'Proxy URL (leave empty to use the original)'],
  'admin.author': ['作者', 'Author'],
  'admin.authorEmpty': ['留空则不显示', 'Empty = not shown'],
  'admin.lens': ['镜头', 'Lens'],
  'admin.camera': ['机身（不显示厂商字段）', 'Camera (brand prefix hidden)'],
  'admin.aperture': ['光圈', 'Aperture'],
  'admin.shutter': ['快门', 'Shutter'],
  'admin.iso': ['ISO', 'ISO'],
  'admin.focal': ['焦距', 'Focal length'],
  'admin.takenAt': ['拍摄时间', 'Taken at'],
  'admin.width': ['宽', 'Width'],
  'admin.height': ['高', 'Height'],
  'admin.titleEnPhoto': ['英文标题（可选）', 'Title in English (optional)'],
  'admin.descEnPhoto': ['英文描述（可选）', 'Description in English (optional)'],
  'admin.qiniuKey': ['七牛 key: {key}', 'Qiniu key: {key}'],
  'admin.externalNote': ['外链照片，不占用七牛空间', 'External image — not stored in Qiniu'],
  'admin.trashTitle': ['回收站', 'Trash'],
  'admin.trashHint': ['删除的照片会先放在这里。清空回收站会同时删除七牛云上的原图与代理图，无法恢复。', 'Deleted photos wait here. Emptying the trash removes the originals and proxies from Qiniu — this cannot be undone.'],
  'admin.refresh': ['刷新', 'Refresh'],
  'admin.emptyTrash': ['清空回收站', 'Empty trash'],
  'admin.trashEmpty': ['回收站是空的', 'Trash is empty'],
  'admin.restore': ['恢复', 'Restore'],
  'admin.deleteForever': ['彻底删除', 'Delete forever'],
  'admin.deletedAt': ['删除于 {time}', 'Deleted {time}'],
  'admin.unknownAlbum': ['未知影集', 'Unknown collection'],
  'admin.slugPreview': ['访问地址', 'URL'],
  'admin.qiniuMissing': ['七牛云未配置，无法上传', 'Qiniu is not configured — uploads disabled'],
  'admin.siteSettings': ['站点设置', 'Site settings'],
  'admin.heroImage': ['首页背景图', 'Home background'],
  'admin.heroPlaceholder': ['https://…/hero.jpg', 'https://…/hero.jpg'],
  'admin.heroHint': ['留空则使用原来的光影动画背景', 'Empty = the animated light background'],
  'admin.heroEmpty': ['未设置背景图', 'No background set'],
  'admin.useFirstCover': ['用第一个影集封面', 'Use the first cover'],
  'admin.clear': ['清除', 'Clear'],
  'toast.heroSaved': ['首页背景已保存', 'Home background saved'],
  'admin.dropImages': ['请拖入图片文件', 'Please drop image files'],
  'admin.badUrl': ['链接需要以 http(s):// 开头', 'The URL must start with http(s)://'],

  'admin.slugPlaceholder': ['如 temple-of-heaven（留空则用数字 ID）', 'e.g. temple-of-heaven (empty = numeric id)'],
  'admin.passwordPlaceholder': ['设置访问密码', 'Set a password'],
  'admin.copyLink': ['复制链接', 'Copy link'],
  'admin.stageQueued': ['排队中', 'Queued'],
  'admin.stageExif': ['读取 EXIF', 'Reading EXIF'],
  'admin.stageDecode': ['读取中', 'Decoding'],
  'admin.stageCompress': ['压缩中', 'Compressing'],
  'admin.stageProxy': ['生成代理图', 'Building proxy'],
  'admin.stageUploadOriginal': ['上传原图', 'Uploading original'],
  'admin.stageUploadProxy': ['上传代理图', 'Uploading proxy'],
  'admin.stageSave': ['保存信息', 'Saving'],
  'admin.stageDone': ['完成', 'Done'],
  'admin.stageFailed': ['失败', 'Failed'],
  'admin.notCompressed': ['未压缩', 'not compressed'],
  'confirm.deletePhoto': ['这张照片会移入回收站，可以随时恢复。继续吗？', 'Move this photo to the trash? You can restore it later.'],
  'confirm.deleteAlbum': ['确定删除影集「{title}」吗？其中 {n} 张照片会连同七牛云文件一起永久删除，且不会进入回收站。', 'Delete “{title}”? Its {n} photos and their Qiniu files will be deleted permanently, bypassing the trash.'],
  'confirm.purgePhoto': ['彻底删除后无法恢复，七牛云上的文件也会一起删除。继续吗？', 'Permanently delete this photo and its Qiniu files? This cannot be undone.'],
  'confirm.emptyTrash': ['清空回收站会永久删除 {n} 张照片，并删除七牛云上的原图与代理图。此操作无法撤销，确定继续吗？', 'Emptying the trash permanently deletes {n} photos and their originals and proxies in Qiniu. This cannot be undone.'],
  'toast.saved': ['已保存', 'Saved'],
  'toast.albumCreated': ['影集已创建', 'Collection created'],
  'toast.albumDeleted': ['影集已删除', 'Collection deleted'],
  'toast.photoTrashed': ['已移入回收站', 'Moved to trash'],
  'toast.photoRestored': ['照片已恢复', 'Photo restored'],
  'toast.photoDeleted': ['已彻底删除', 'Deleted permanently'],
  'toast.photoAdded': ['照片已添加', 'Photo added'],
  'toast.photoSaved': ['照片信息已保存', 'Photo saved'],
  'toast.linkCopied': ['链接已复制', 'Link copied'],
  'toast.trashEmptied': ['已清空 {n} 张照片{f}', 'Removed {n} photos{f}'],
  'toast.filesSuffix': ['，删除云端文件 {n} 个', ' and {n} files'],
  'toast.orderSaved': ['顺序已保存', 'Order saved'],
  'toast.slugTaken': ['这个自定义 ID 已经被占用了', 'That custom ID is already taken'],
};

export function t(key: string, params?: Record<string, string | number>): string {
  const entry = dict[key];
  let text = entry ? entry[locale.value === 'en' ? 1 : 0] || entry[0] : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** 中英字段取值：英文模式下优先英文，没有就回退中文 */
export function pick(zh?: string | null, en?: string | null): string {
  if (locale.value === 'en' && en && en.trim()) return en;
  return zh || '';
}

export function setLocale(next: Locale) {
  locale.value = next;
  localStorage.setItem(STORAGE_KEY, next);
  document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
}

export function toggleLocale() {
  setLocale(locale.value === 'zh' ? 'en' : 'zh');
}
