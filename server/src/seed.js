// 种子数据：数据库为空时写入示例影集与照片，让站点开箱即有内容。
// 示例图来自 picsum.photos，正式上线后可在后台删除。
import { db } from './db.js';

const ALBUMS = [
  {
    title: '山野回响',
    subtitle: 'ECHOES OF THE WILD',
    description: '在海拔三千米以上的地方，光比语言先到达。这组照片记录了川西高原的清晨与黄昏——云海翻过垭口，经幡在风里碎成颜色。',
    location: '四川 · 甘孜',
    shot_at: '2025-09',
    cover: 'https://picsum.photos/seed/lumen-mountain-cover/1600/1000',
    photos: [
      { seed: 'mountain-1', w: 1600, h: 1067, aperture: 'f/8', shutter: '1/250s', iso: 'ISO 100', focal: '35mm', camera: 'SONY α7 IV', taken_at: '2025-09-14 07:12', desc: '垭口的云海，等了四十分钟。' },
      { seed: 'mountain-2', w: 1067, h: 1600, aperture: 'f/2.8', shutter: '1/500s', iso: 'ISO 200', focal: '85mm', camera: 'SONY α7 IV', taken_at: '2025-09-14 18:40', desc: '经幡与远处的雪山。' },
      { seed: 'mountain-3', w: 1600, h: 900, aperture: 'f/11', shutter: '1/125s', iso: 'ISO 100', focal: '24mm', camera: 'SONY α7 IV', taken_at: '2025-09-15 06:55', desc: '日出前十分钟，山脊线被点亮。' },
      { seed: 'mountain-4', w: 1600, h: 1200, aperture: 'f/5.6', shutter: '1/320s', iso: 'ISO 400', focal: '50mm', camera: 'SONY α7 IV', taken_at: '2025-09-15 17:20', desc: '' },
    ],
  },
  {
    title: '城市切片',
    subtitle: 'URBAN SLICES',
    description: '城市最诚实的时候是深夜。霓虹、雨水、末班地铁，还有不肯熄灭的小店灯光。手持慢门，把匆忙拉长成光轨。',
    location: '上海',
    shot_at: '2025-11',
    cover: 'https://picsum.photos/seed/lumen-city-cover/1600/1000',
    photos: [
      { seed: 'city-1', w: 1600, h: 1067, aperture: 'f/1.8', shutter: '1/60s', iso: 'ISO 3200', focal: '35mm', camera: 'FUJIFILM X-T5', taken_at: '2025-11-02 22:15', desc: '雨后的南京路，霓虹碎在水洼里。' },
      { seed: 'city-2', w: 1067, h: 1600, aperture: 'f/2.0', shutter: '1/125s', iso: 'ISO 1600', focal: '23mm', camera: 'FUJIFILM X-T5', taken_at: '2025-11-03 21:40', desc: '深夜面馆。' },
      { seed: 'city-3', w: 1600, h: 1200, aperture: 'f/8', shutter: '4s', iso: 'ISO 100', focal: '16mm', camera: 'FUJIFILM X-T5', taken_at: '2025-11-04 19:05', desc: '高架光轨，栏杆当三脚架。' },
      { seed: 'city-4', w: 1600, h: 900, aperture: 'f/2.8', shutter: '1/250s', iso: 'ISO 800', focal: '56mm', camera: 'FUJIFILM X-T5', taken_at: '2025-11-05 23:30', desc: '' },
      { seed: 'city-5', w: 1067, h: 1600, aperture: 'f/1.4', shutter: '1/100s', iso: 'ISO 6400', focal: '33mm', camera: 'FUJIFILM X-T5', taken_at: '2025-11-05 23:58', desc: '末班车。' },
    ],
  },
  {
    title: '海岸线',
    subtitle: 'COASTLINE',
    description: '从北戴河到东极岛，沿着海岸线走了一个月。海的颜色每天都不一样，照片只是借口，出发才是理由。',
    location: '舟山 · 东极岛',
    shot_at: '2026-04',
    cover: 'https://picsum.photos/seed/lumen-coast-cover/1600/1000',
    photos: [
      { seed: 'coast-1', w: 1600, h: 1067, aperture: 'f/11', shutter: '1/60s', iso: 'ISO 64', focal: '24mm', camera: 'NIKON Z 8', taken_at: '2026-04-18 05:48', desc: '东极岛的第一缕晨光。' },
      { seed: 'coast-2', w: 1600, h: 1200, aperture: 'f/16', shutter: '30s', iso: 'ISO 64', focal: '20mm', camera: 'NIKON Z 8', taken_at: '2026-04-18 19:12', desc: '长曝光把海浪磨成了雾。' },
      { seed: 'coast-3', w: 1067, h: 1600, aperture: 'f/4', shutter: '1/1000s', iso: 'ISO 200', focal: '70mm', camera: 'NIKON Z 8', taken_at: '2026-04-19 15:26', desc: '归港。' },
    ],
  },
];

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM albums').get().n;
  if (count > 0) return false;

  const insertAlbum = db.prepare(`
    INSERT INTO albums (title, subtitle, description, cover_url, location, shot_at, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPhoto = db.prepare(`
    INSERT INTO photos (album_id, url, title, description, aperture, shutter, iso, focal_length, camera, taken_at, width, height, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  ALBUMS.forEach((album, ai) => {
    const { lastInsertRowid: albumId } = insertAlbum.run(
      album.title, album.subtitle, album.description, album.cover, album.location, album.shot_at, ai,
    );
    album.photos.forEach((p, pi) => {
      insertPhoto.run(
        Number(albumId),
        `https://picsum.photos/seed/lumen-${p.seed}/${p.w}/${p.h}`,
        '', p.desc, p.aperture, p.shutter, p.iso, p.focal, p.camera, p.taken_at, p.w, p.h, pi,
      );
    });
  });

  console.log(`[seed] 已写入 ${ALBUMS.length} 个示例影集（可在后台删除）`);
  return true;
}
