export function todayInZone(timeZone = 'Asia/Shanghai', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const get = key => parts.find(p => p.type === key).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function valid(value) {
  if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const count = value.split('-').length;
  return year >= 1000 && year <= 9999 && (count < 2 || (month <= 12 && month >= 1)) && (count < 3 || (day >= 1 && day <= new Date(Date.UTC(year,month,0)).getUTCDate()));
}
const pad = n => String(n).padStart(2,'0');
export function resolveAlbumDate(description, generated, today = todayInZone()) {
  const text = String(description);
  const [year,month] = today.split('-').map(Number);
  const explicit = text.match(/\b((?:19|20)\d{2})\s*(?:年|[-/.])\s*(\d{1,2})(?:\s*(?:月|[-/.])\s*(\d{1,2})\s*(?:日|号)?)?/);
  if (explicit) { const date = `${explicit[1]}-${pad(explicit[2])}${explicit[3] ? '-'+pad(explicit[3]) : ''}`; if(valid(date)) return date; }
  if (/前天|昨天|今天|yesterday|today/i.test(text)) {
    const offset = /前天/.test(text) ? -2 : /昨天|yesterday/i.test(text) ? -1 : 0;
    const date = new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);
  }
  const relativeYear = /前年/.test(text) ? year-2 : /去年|last year/i.test(text) ? year-1 : /明年|next year/i.test(text) ? year+1 : /今年|this year/i.test(text) ? year : null;
  const chineseMonth = text.match(/(十一|十二|十|[一二三四五六七八九]|1[0-2]|[1-9])月(?:\s*(\d{1,2})(?:日|号))?/);
  const monthNumber = chineseMonth ? ({一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,十一:11,十二:12}[chineseMonth[1]] || Number(chineseMonth[1])) : null;
  const season = /春/.test(text) ? 3 : /夏/.test(text) ? 6 : /秋/.test(text) ? 9 : /冬/.test(text) ? 12 : null;
  if (relativeYear) { const date = `${relativeYear}${monthNumber || season ? '-'+pad(monthNumber || season) : ''}${chineseMonth?.[2] ? '-'+pad(chineseMonth[2]) : ''}`; return valid(date) ? date : today; }
  const absoluteYear = text.match(/\b((?:19|20)\d{2})年?/);
  if (absoluteYear) { const date = `${absoluteYear[1]}${monthNumber || season ? '-'+pad(monthNumber || season) : ''}${chineseMonth?.[2] ? '-'+pad(chineseMonth[2]) : ''}`; return valid(date) ? date : today; }
  if (/上个月|本月|这个月|下个月|last month|this month|next month/i.test(text)) {
    const offset=/上个月|last month/i.test(text)?-1:/下个月|next month/i.test(text)?1:0;
    const date=new Date(Date.UTC(year,month-1+offset,1));return date.toISOString().slice(0,7);
  }
  if (monthNumber) { const date = `${year}-${pad(monthNumber)}${chineseMonth?.[2] ? '-'+pad(chineseMonth[2]) : ''}`; return valid(date) ? date : today; }
  // Let the model interpret other time-bearing phrases (e.g. "three weeks ago").
  const temporal = /\d+\s*(?:天|周|星期|个月|年)前|周末|星期|礼拜|春|夏|秋|冬|ago|week|january|february|march|april|may|june|july|august|september|october|november|december/i.test(text);
  return temporal && valid(String(generated)) ? generated : today;
}
