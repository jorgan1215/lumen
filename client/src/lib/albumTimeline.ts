import type { Album } from '../api';

// Read calendar values directly, so grouping never shifts with the browser timezone.
export function albumDateParts(value: string): { year: string; month: string; order: string } {
  const match = String(value || '').trim().match(/^(\d{4})(?:\s*(?:年|[-/.])\s*(\d{1,2})(?:\s*(?:月|[-/.])\s*(\d{1,2}))?)?(?=$|\D)/);
  if (!match || Number(match[1]) < 1000) return { year: '', month: '', order: '' };
  const [, year, rawMonth, rawDay] = match;
  const month = rawMonth ? Number(rawMonth) : 0, day = rawDay ? Number(rawDay) : 0;
  if ((rawMonth && (month < 1 || month > 12)) || (rawDay && (day < 1 || day > new Date(Date.UTC(Number(year), month, 0)).getUTCDate()))) return { year: '', month: '', order: '' };
  return { year, month: rawMonth ? String(month).padStart(2, '0') : '', order: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

export function groupAlbumTimeline(albums: Album[]) {
  const years: { year: string; count: number; months: { month: string; albums: Album[] }[] }[] = [];
  const dated = albums.map(album => ({ album, ...albumDateParts(album.shot_at) }))
    .sort((a, b) => b.order.localeCompare(a.order));
  for (const item of dated) {
    let year = years.find(group => group.year === item.year);
    if (!year) { year = { year: item.year, count: 0, months: [] }; years.push(year); }
    let month = year.months.find(group => group.month === item.month);
    if (!month) { month = { month: item.month, albums: [] }; year.months.push(month); }
    month.albums.push(item.album);
    year.count++;
  }
  return years;
}
