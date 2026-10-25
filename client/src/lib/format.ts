/** 厂商名（Make）里常见的「公司后缀」，展示照片信息时要去掉 */
const MAKE_NOISE = [
  'NIKON CORPORATION',
  'OLYMPUS CORPORATION',
  'FUJIFILM CORPORATION',
  'SONY CORPORATION',
  'CANON INC.',
  'CANON INC',
  'RICOH IMAGING COMPANY, LTD.',
  'SIGMA CORPORATION',
  'LEICA CAMERA AG',
  'HASSELBLAD',
  'PANASONIC',
  'EASTMAN KODAK COMPANY',
  'SAMSUNG ELECTRONICS CO., LTD.',
  'MOTOROLA',
  'GOOGLE',
  'APPLE',
];

const COMPACT_MAKE = [
  ['NIKON CORPORATION', 'NIKON'],
  ['OLYMPUS CORPORATION', 'OLYMPUS'],
  ['FUJIFILM CORPORATION', 'FUJIFILM'],
  ['SONY CORPORATION', 'SONY'],
  ['CANON INC.', 'CANON'],
  ['CANON INC', 'CANON'],
  ['RICOH IMAGING COMPANY, LTD.', 'RICOH'],
  ['SIGMA CORPORATION', 'SIGMA'],
  ['LEICA CAMERA AG', 'LEICA'],
];

function compactMake(make: string) {
  const upper = make.trim().toUpperCase();
  for (const [from, to] of COMPACT_MAKE) {
    if (upper.startsWith(from)) return to;
  }
  // "Canon", "NIKON", "Apple" 这类短厂商名保持原样
  return make.trim();
}

/**
 * 只保留好看的机型：去掉 "NIKON CORPORATION" 之类的厂商字段。
 * 兼容两种情况：
 *  - 新上传：Make / Model 分开，拼成 "NIKON Z5_2"
 *  - 老数据：当年存成了 "NIKON CORPORATION NIKON Z5_2"，这里把前缀削掉
 */
export function cleanCamera(raw?: string | null, make?: string | null, model?: string | null): string {
  const m = (make || '').trim();
  const md = (model || '').trim();

  if (md) {
    const brand = m ? compactMake(m) : '';
    if (!brand) return md;
    // 机型号本身已经带品牌（"NIKON Z5_2" / "Canon EOS R5"）就不再重复
    if (md.toUpperCase().startsWith(brand.toUpperCase())) return md;
    return `${brand} ${md}`.replace(/\s+/g, ' ').trim();
  }

  let text = (raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  // 老数据：把开头的厂商噪声削掉，但保证不会把整串吃掉
  const upper = text.toUpperCase();
  for (const noise of MAKE_NOISE) {
    if (upper.startsWith(noise) && text.length > noise.length + 1) {
      text = text.slice(noise.length).trim();
      break;
    }
  }
  return text;
}

/** 秒数 → 快门字符串，如 0.004 → 1/250s */
export function formatShutter(seconds?: number | null): string {
  const t = Number(seconds);
  if (!Number.isFinite(t) || t <= 0) return '';
  if (t >= 1) return `${Number(t.toFixed(1))}s`;
  return `1/${Math.round(1 / t)}s`;
}

/** 光圈数值 → f/2.8 */
export function formatAperture(value?: number | null): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `F/${Number(n.toFixed(1))}`;
}

export function formatFocal(value?: number | null): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${Math.round(n)}mm`;
}

/** ISO 统一成 "ISO 5600"（老数据里可能已经带 ISO 前缀） */
export function formatIso(value?: string | number | null): string {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  return /^iso/i.test(text) ? text.toUpperCase() : `ISO ${text}`;
}

/** 日期 → 2026-10-10 17:14 */
export function formatDateTime(date: Date, withTime = true): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (!withTime) return d;
  return `${d} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 拍摄时间统一成 "2026-10-10 17:14"（兼容 "2026:10:10 17:14:00" 这种 EXIF 原始格式） */
export function normalizeTakenAt(raw?: string | null): string {
  const text = (raw || '').trim();
  if (!text) return '';
  const m = text.match(/^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return text;
  const [, y, mo, d, h, mi] = m;
  return h ? `${y}-${mo}-${d} ${h}:${mi}` : `${y}-${mo}-${d}`;
}

/** 回收站里的「多久之前」 */
export function timeAgo(raw?: string | null): string {
  if (!raw) return '';
  const t = new Date(String(raw).replace(' ', 'T')).getTime();
  if (!Number.isFinite(t)) return String(raw);
  const diff = Date.now() - t;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return String(raw).slice(0, 10);
}

/** 卡片上展示的短链接 */
export function shortUrl(url?: string, max = 42): string {
  if (!url) return '';
  try {
    const u = new URL(url, location.origin);
    const text = `${u.host}${u.pathname}`;
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  } catch {
    return url.length > max ? `${url.slice(0, max - 1)}…` : url;
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
