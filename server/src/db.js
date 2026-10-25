import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { serverRoot } from './config.js';

const dataDir = path.join(serverRoot, 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'lumen.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS albums (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  subtitle    TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  cover_url   TEXT    NOT NULL DEFAULT '',
  location    TEXT    NOT NULL DEFAULT '',
  shot_at     TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id     INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  url          TEXT    NOT NULL,
  qiniu_key    TEXT    NOT NULL DEFAULT '',
  title        TEXT    NOT NULL DEFAULT '',
  description  TEXT    NOT NULL DEFAULT '',
  aperture     TEXT    NOT NULL DEFAULT '',
  shutter      TEXT    NOT NULL DEFAULT '',
  iso          TEXT    NOT NULL DEFAULT '',
  focal_length TEXT    NOT NULL DEFAULT '',
  camera       TEXT    NOT NULL DEFAULT '',
  lens         TEXT    NOT NULL DEFAULT '',
  author       TEXT    NOT NULL DEFAULT '',
  taken_at     TEXT    NOT NULL DEFAULT '',
  width        INTEGER NOT NULL DEFAULT 0,
  height       INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
`);

/**
 * 轻量迁移：给已有数据库补齐后加的字段，避免老库升级时丢数据。
 * 新增照片字段时，在这里补一行即可。
 */
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`[db] 已为 ${table} 新增字段 ${column}`);
  return true;
}

// 代理图（缩略图）与原图分开存储：列表先加载代理图，再异步换成原图
ensureColumn('photos', 'proxy_url', "TEXT NOT NULL DEFAULT ''");
ensureColumn('photos', 'proxy_key', "TEXT NOT NULL DEFAULT ''");
// 镜头信息（EXIF LensModel），以及可自定义的照片作者
ensureColumn('photos', 'lens', "TEXT NOT NULL DEFAULT ''");
ensureColumn('photos', 'author', "TEXT NOT NULL DEFAULT ''");
// 软删除：有值表示在回收站里
ensureColumn('photos', 'deleted_at', 'TEXT');

// 自定义相册 ID（slug）、访问密码、英文文案
ensureColumn('albums', 'hidden', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('albums', 'slug', "TEXT NOT NULL DEFAULT ''");
ensureColumn('albums', 'password_hash', "TEXT NOT NULL DEFAULT ''");
ensureColumn('albums', 'title_en', "TEXT NOT NULL DEFAULT ''");
ensureColumn('albums', 'description_en', "TEXT NOT NULL DEFAULT ''");
ensureColumn('albums', 'location_en', "TEXT NOT NULL DEFAULT ''");

// 照片的英文标题 / 描述
ensureColumn('photos', 'title_en', "TEXT NOT NULL DEFAULT ''");
ensureColumn('photos', 'description_en', "TEXT NOT NULL DEFAULT ''");

db.exec('CREATE INDEX IF NOT EXISTS idx_photos_deleted ON photos(deleted_at);');
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_slug ON albums(slug) WHERE slug <> '';");
