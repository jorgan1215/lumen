export interface Album {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  cover_url: string;
  location: string;
  shot_at: string;
  sort_order: number;
  created_at: string;
  photo_count?: number;
}

export interface Photo {
  id: number;
  album_id: number;
  url: string;
  qiniu_key: string;
  title: string;
  description: string;
  aperture: string;
  shutter: string;
  iso: string;
  focal_length: string;
  camera: string;
  taken_at: string;
  width: number;
  height: number;
}

export type AlbumDetail = Album & { photos: Photo[] };

const TOKEN_KEY = 'lumen_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
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

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string }>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  site: () => request<{ name: string; qiniuReady: boolean }>('/api/site'),
  albums: () => request<Album[]>('/api/albums'),
  album: (id: number | string) => request<AlbumDetail>(`/api/albums/${id}`),

  uploadToken: (filename: string) =>
    request<{ token: string; key: string; domain: string }>(
      `/api/admin/upload-token?filename=${encodeURIComponent(filename)}`,
    ),

  createAlbum: (body: Partial<Album>) =>
    request<Album>('/api/admin/albums', { method: 'POST', body: JSON.stringify(body) }),
  updateAlbum: (id: number, body: Partial<Album>) =>
    request<Album>(`/api/admin/albums/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAlbum: (id: number) => request(`/api/admin/albums/${id}`, { method: 'DELETE' }),

  createPhoto: (body: Partial<Photo>) =>
    request<Photo>('/api/admin/photos', { method: 'POST', body: JSON.stringify(body) }),
  updatePhoto: (id: number, body: Partial<Photo>) =>
    request<Photo>(`/api/admin/photos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePhoto: (id: number) => request(`/api/admin/photos/${id}`, { method: 'DELETE' }),
};
