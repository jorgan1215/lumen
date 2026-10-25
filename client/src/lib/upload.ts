import * as qiniu from 'qiniu-js';

export interface UploadProgress {
  percent: number;
}

/** 用七牛直传一个 Blob，返回上传百分比 */
export function uploadBlob(
  blob: Blob,
  key: string,
  token: string,
  onPercent?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const observable = qiniu.upload(blob as any, key, token, {}, {});
    observable.subscribe({
      next: (res: any) => onPercent?.(Math.round(res?.total?.percent ?? 0)),
      error: (err: any) => reject(new Error(err?.message || err?.errMsg || '上传失败')),
      complete: () => resolve(),
    });
  });
}
