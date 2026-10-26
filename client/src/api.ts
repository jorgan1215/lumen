export interface Album {
  hidden?: boolean;
  featured: boolean;
  id: number;
  title: string;
  title_en: string;
  subtitle: string;
  description: string;
  description_en: string;
  location: string;
  location_en: string;
  cover_url: string;
  slug: string;
  key?: string;
  shot_at: string;
  sort_order: number;
  created_at: string;
  photo_count?: number;
  trash_count?: number;
  cover_proxy_url?: string;
  locked?: boolean;
  has_password?: boolean;
}

export interface Photo {
  id: number;
  album_id: number;
  url: string;
  proxy_url: string;
  qiniu_key: string;
  proxy_key: string;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  aperture: string;
  shutter: string;
  iso: string;
  focal_length: string;
  camera: string;
  lens: string;
  author: string;
  taken_at: string;
  width: number;
  height: number;
  deleted_at?: string | null;
}

export interface TrashPhoto extends Photo {
  album_title: string | null;
}

export type AlbumDetail = Album & { photos: Photo[] };

/** 加密相册未解锁时，服务端只返回这些信息（其余字段可能缺失） */
export interface LockedAlbum extends Partial<Album> {
  id: number;
  key: string;
  title: string;
  locked: true;
  has_password: true;
  photos: [];
}

export type AlbumResponse = AlbumDetail | LockedAlbum;

export function isLocked(album: AlbumResponse | null): album is LockedAlbum {
  return Boolean(album && (album as LockedAlbum).locked);
}

export interface UploadTicket {
  domain: string;
  original: { token: string; key: string; url: string };
  proxy: { token: string; key: string; url: string };
}

export interface ServerConfig { port: number; activePort: number; jwtExpiresIn: string; uploadTokenExpires: number; hasJwtSecret: boolean; admin: { username: string; hasPassword: boolean }; qiniu: { bucket: string; domain: string; prefix: string; hasAccessKey: boolean; hasSecretKey: boolean }; requiresLogin?: boolean; requiresRestart?: boolean }
export interface AIConfig { baseUrl: string; model: string; vision: boolean; hasApiKey: boolean }
export type AlbumDraft = Pick<Album, 'title' | 'title_en' | 'subtitle' | 'description' | 'description_en' | 'location' | 'location_en' | 'shot_at' | 'slug' | 'cover_url'>;
export interface HeroSlide { url: string; caption: string; caption_en?: string }

export interface SiteInfo {
  subtitle: string;
  author: string;
  description: string;
  timeZone: string;
  musicUrl: string;
  musicVolume: number;
  heroSlides: HeroSlide[];
  heroInterval: number;
  aboutTitle: string;
  aboutBody: string;
  aboutImage: string;
  name: string;
  qiniuReady: boolean;
  logo: string;
  heroImage: string;
}

const TOKEN_KEY = 'lumen_token';
const ALBUM_TOKEN_PREFIX = 'lumen_album_';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** 每本加密相册的解锁凭证单独存 */
export function getAlbumToken(albumId: number | string) {
  return localStorage.getItem(`${ALBUM_TOKEN_PREFIX}${albumId}`) || '';
}
export function setAlbumToken(albumId: number | string, token: string) {
  if (token) localStorage.setItem(`${ALBUM_TOKEN_PREFIX}${albumId}`, token);
  else localStorage.removeItem(`${ALBUM_TOKEN_PREFIX}${albumId}`);
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as any) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data as T;
}

const aiAlbumContext = (album: Partial<Album>) => Object.fromEntries(
  ['title','title_en','subtitle','description','description_en','location','location_en','shot_at','slug','cover_url'].map(key => [key, (album as any)[key] || '']),
);

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string }>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  serverConfig: () => request<ServerConfig>('/api/admin/config'),
  saveServerConfig: (body: Record<string, unknown>) => request<ServerConfig>('/api/admin/config', { method: 'PUT', body: JSON.stringify(body) }),
  aiConfig: () => request<AIConfig>('/api/admin/ai/config'),
  saveAIConfig: (body: Partial<AIConfig> & { apiKey?: string; clearApiKey?: boolean }) => request<AIConfig>('/api/admin/ai/config', { method: 'PUT', body: JSON.stringify(body) }),
  generateAlbum: (description: string, album: Partial<Album>) => request<AlbumDraft>('/api/admin/ai/album', { method: 'POST', body: JSON.stringify({ description, album: aiAlbumContext(album) }) }),
  generatePhoto: (id: number, album: Partial<Album>, photo: Partial<Photo>) => request<Pick<Photo, 'title' | 'title_en' | 'description' | 'description_en'>>(`/api/admin/ai/photos/${id}`, { method: 'POST', body: JSON.stringify({ album: aiAlbumContext(album), photo }) }),
  site: () => request<SiteInfo>('/api/site'),
  updateSettings: (body: { hero_image?: string; hero_slides?: HeroSlide[]; hero_interval?: number; about_title?: string; about_body?: string; about_image?: string; music_url?: string; music_volume?: number; site_subtitle?: string; site_name?: string; author_name?: string; site_description?: string; site_logo?: string; site_timezone?: string }) =>
    request<Record<string, string>>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
  albums: () => request<Album[]>('/api/albums'),

  /** 相册详情：可以用自增 id 或自定义 slug；加密相册需要带解锁 token */
  album: (key: number | string, albumToken = '') =>
    request<AlbumResponse>(`/api/albums/${encodeURIComponent(String(key))}`, {
      headers: albumToken ? { 'X-Album-Token': albumToken } : {},
    }),

  unlockAlbum: (key: number | string, password: string) =>
    request<{ token: string }>(`/api/albums/${encodeURIComponent(String(key))}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  /** 一次拿到「原图 + 代理图」两个上传凭证 */
  uploadTicket: (filename: string) =>
    request<UploadTicket>(`/api/admin/upload-ticket?filename=${encodeURIComponent(filename)}`),

  createAlbum: (body: Partial<Album> & { password?: string }) =>
    request<Album>('/api/admin/albums', { method: 'POST', body: JSON.stringify(body) }),
  updateAlbum: (id: number, body: Partial<Album> & { password?: string; clear_password?: boolean }) =>
    request<Album>(`/api/admin/albums/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAlbum: (id: number) => request(`/api/admin/albums/${id}`, { method: 'DELETE' }),
  reorderAlbums: (ids: number[]) =>
    request('/api/admin/reorder/albums', { method: 'PUT', body: JSON.stringify({ ids }) }),

  createPhoto: (body: Partial<Photo>) =>
    request<Photo>('/api/admin/photos', { method: 'POST', body: JSON.stringify(body) }),
  updatePhoto: (id: number, body: Partial<Photo>) =>
    request<Photo>(`/api/admin/photos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  /** 移入回收站（软删除） */
  deletePhoto: (id: number) => request(`/api/admin/photos/${id}`, { method: 'DELETE' }),
  reorderPhotos: (albumId: number, ids: number[]) =>
    request('/api/admin/reorder/photos', { method: 'PUT', body: JSON.stringify({ album_id: albumId, ids }) }),

  trash: () => request<TrashPhoto[]>('/api/admin/trash'),
  restorePhoto: (id: number) => request(`/api/admin/photos/${id}/restore`, { method: 'POST' }),
  purgePhoto: (id: number) => request(`/api/admin/trash/${id}`, { method: 'DELETE' }),
  emptyTrash: () => request<{ deleted: number; files: number }>('/api/admin/trash', { method: 'DELETE' }),
};
