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
  taken_at     TEXT    NOT NULL DEFAULT '',
  width        INTEGER NOT NULL DEFAULT 0,
  height       INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);
`);
