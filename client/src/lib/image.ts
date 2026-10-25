/**
 * 图片处理：上传前压缩原图、生成代理图（缩略图）。
 * 浏览器端用 canvas 完成，不占用服务器资源。
 */

export interface CompressOptions {
  enabled: boolean;
  /** 原图长边上限，0 表示不缩放 */
  maxEdge: number;
  /** 原图编码质量上限 0.1 ~ 1 */
  quality: number;
  /** 代理图长边上限 */
  proxyMaxEdge: number;
  /** 代理图编码质量上限 0.1 ~ 1 */
  proxyQuality: number;
  /** 每张原图的字节预算，KB；0 为不限制 */
  maxKB: number;
  /** 每张代理图的字节预算，KB */
  proxyMaxKB: number;
}

export const DEFAULT_COMPRESS: CompressOptions = {
  enabled: true,
  maxEdge: 2560,
  quality: 0.85,
  proxyMaxEdge: 960,
  proxyQuality: 0.55,
  maxKB: 1600,
  proxyMaxKB: 80,
};

export interface PreparedUpload {
  original: Blob;
  originalName: string;
  proxy: Blob;
  proxyName: string;
  width: number;
  height: number;
  compressed: boolean;
  originalSize: number;
  proxySize: number;
  proxyWidth: number;
  proxyHeight: number;
}

let webpSupport: boolean | null = null;

export function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

/** 计算缩放后的尺寸，保持比例 */
export function fitSize(width: number, height: number, maxEdge: number) {
  const longEdge = Math.max(width, height);
  if (!maxEdge || longEdge <= maxEdge) return { width, height, scaled: false };
  const ratio = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    scaled: true,
  };
}

export function decodeImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法解码这张图片，可能是格式不支持'));
    };
    img.src = url;
  });
}

function draw(img: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持图片处理');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('图片压缩失败'));
    }, type, quality);
  });
}

/** Clamp persisted and manually edited values before using canvas or byte budgets. */
export function normalizeCompressOptions(input: Partial<CompressOptions> = {}): CompressOptions {
  const number = (value: unknown, fallback: number, min: number, max: number) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    enabled: input.enabled === undefined ? true : Boolean(input.enabled),
    maxEdge: input.maxEdge === 0 ? 0 : Math.round(number(input.maxEdge, 2560, 320, 8192)),
    quality: number(input.quality, .85, .1, 1),
    proxyMaxEdge: Math.round(number(input.proxyMaxEdge, 960, 160, 2560)),
    proxyQuality: number(input.proxyQuality, .55, .1, 1),
    maxKB: input.maxKB === 0 ? 0 : Math.round(number(input.maxKB, 1600, 8, 20480)),
    proxyMaxKB: Math.round(number(input.proxyMaxKB, 80, 8, 2048)),
  };
}

/** Encode once at the chosen quality; only search quality / dimensions when over budget. */
export async function encodeWithinBudget(
  encode: (width: number, height: number, quality: number) => Promise<Blob>,
  width: number, height: number, quality: number, maxBytes: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  let w = width, h = height;
  for (let resize = 0; resize < 12; resize++) {
    let blob = await encode(w, h, quality);
    if (!maxBytes || blob.size <= maxBytes) return { blob, width: w, height: h };
    const floor = .1;
    let lowBlob = await encode(w, h, floor);
    if (lowBlob.size <= maxBytes) {
      let low = floor, high = quality;
      blob = lowBlob;
      for (let i = 0; i < 5; i++) {
        const mid = (low + high) / 2;
        const candidate = await encode(w, h, mid);
        if (candidate.size <= maxBytes) { low = mid; blob = candidate; } else high = mid;
      }
      return { blob, width: w, height: h };
    }
    if (w === 1 && h === 1) break;
    const factor = Math.min(.8, Math.sqrt(maxBytes / lowBlob.size) * .9);
    w = Math.max(1, Math.floor(w * factor));
    h = Math.max(1, Math.floor(h * factor));
  }
  throw new Error('无法满足指定体积上限，请提高 KB 限制');
}

export async function prepareUpload(
  file: File,
  input: CompressOptions,
  onStage?: (stage: 'decode' | 'compress' | 'proxy') => void,
): Promise<PreparedUpload> {
  const options = normalizeCompressOptions(input);
  onStage?.('decode');
  const img = await decodeImage(file);
  const naturalWidth = img.naturalWidth, naturalHeight = img.naturalHeight;
  if (!naturalWidth || !naturalHeight) throw new Error('读取不到图片尺寸');
  const type = supportsWebp() ? 'image/webp' : 'image/jpeg';
  const ext = type === 'image/webp' ? '.webp' : '.jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  let original: Blob = file, width = naturalWidth, height = naturalHeight, compressed = false;
  // Reuse the canvas at a given size during quality search instead of redrawing per attempt.
  let canvas: HTMLCanvasElement | null = null;
  const encode = (w: number, h: number, q: number) => {
    if (!canvas || canvas.width !== w || canvas.height !== h) {
      if (canvas) { canvas.width = 1; canvas.height = 1; }
      canvas = draw(img, w, h);
    }
    return canvasToBlob(canvas, type, q);
  };
  try {
    if (options.enabled) {
      onStage?.('compress');
      const target = fitSize(naturalWidth, naturalHeight, options.maxEdge);
      const cap = options.maxKB * 1024;
      const tiny = !target.scaled && file.size <= 160 * 1024 && (!cap || file.size <= cap);
      if (!tiny) {
        const result = await encodeWithinBudget(encode, target.width, target.height, options.quality, cap);
        if (target.scaled || result.width < naturalWidth || result.blob.size < file.size) {
          original = result.blob; width = result.width; height = result.height; compressed = true;
        }
      }
    }
    onStage?.('proxy');
    const target = fitSize(width, height, options.proxyMaxEdge);
    const result = await encodeWithinBudget(encode, target.width, target.height, options.proxyQuality, options.proxyMaxKB * 1024);
    // Keep the filename extension faithful when the source file is preserved.
    const originalName = compressed ? `${baseName}${ext}` : file.name;
    return { original, originalName, proxy: result.blob, proxyName: `${baseName}-proxy${ext}`,
      width, height, compressed, originalSize: original.size, proxySize: result.blob.size,
      proxyWidth: result.width, proxyHeight: result.height };
  } finally {
    if (canvas) { canvas.width = 1; canvas.height = 1; }
    img.src = '';
  }
}

/** 读取一个远程图片的尺寸（添加链接时用），失败返回 0 */
export function probeImageSize(src: string, timeout = 10_000): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (size: { width: number; height: number }) => {
      if (done) return;
      done = true;
      img.onload = null;
      img.onerror = null;
      resolve(size);
    };
    const timer = window.setTimeout(() => finish({ width: 0, height: 0 }), timeout);
    img.onload = () => {
      window.clearTimeout(timer);
      finish({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish({ width: 0, height: 0 });
    };
    img.referrerPolicy = 'no-referrer';
    img.src = src;
  });
}
