import exifr from 'exifr';
import {
  cleanCamera, formatAperture, formatDateTime, formatFocal, formatIso, formatShutter, normalizeTakenAt,
} from './format';

export interface PhotoMeta {
  aperture: string;
  shutter: string;
  iso: string;
  focal_length: string;
  camera: string;
  lens: string;
  taken_at: string;
}

const EMPTY_META: PhotoMeta = {
  aperture: '', shutter: '', iso: '', focal_length: '', camera: '', lens: '', taken_at: '',
};

function firstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function takenAtOf(value: unknown): string {
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === 'string') return normalizeTakenAt(value);
  return '';
}

/** 从原图读取 EXIF，转成站点里使用的展示格式 */
export async function readPhotoExif(file: File): Promise<PhotoMeta> {
  const exif: any = await exifr.parse(file).catch(() => null);
  if (!exif) return { ...EMPTY_META };

  const lens = firstString(
    exif.LensModel,
    exif.Lens,
    exif.LensInfo,
    [exif.LensMake, exif.LensModel].filter(Boolean).join(' '),
  );

  return {
    aperture: formatAperture(exif.FNumber ?? exif.ApertureValue),
    shutter: formatShutter(exif.ExposureTime),
    iso: formatIso(exif.ISO ?? exif.ISOSpeedRatings),
    focal_length: formatFocal(exif.FocalLength),
    camera: cleanCamera('', exif.Make, exif.Model),
    lens,
    taken_at: takenAtOf(exif.DateTimeOriginal ?? exif.CreateDate),
  };
}
