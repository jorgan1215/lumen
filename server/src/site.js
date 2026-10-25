export const SITE_DEFAULTS = { name: 'LUMEN', author: 'Jorgan Xing', description: '个人摄影集，记录光到达的地方。', timeZone: 'Asia/Shanghai', logo: '/logo.svg' };
export function siteIdentity(settings = {}) {
  return { name: settings.site_name || SITE_DEFAULTS.name, author: settings.author_name || SITE_DEFAULTS.author, description: settings.site_description ?? SITE_DEFAULTS.description, timeZone: settings.site_timezone || SITE_DEFAULTS.timeZone, logo: settings.site_logo || SITE_DEFAULTS.logo };
}
export function validateSitePatch(body) {
  const out = {};
  for (const [key, limit] of Object.entries({ site_name: 80, author_name: 120, site_description: 500, site_logo: 4000, site_timezone: 80 })) {
    if (!(key in body)) continue;
    if (typeof body[key] !== 'string' || body[key].length > limit) throw new Error('网站信息格式或长度不正确');
    const value = body[key].trim();
    if (['site_name','author_name','site_timezone'].includes(key) && !value) throw new Error('网站名称、作者和时区不能为空');
    if (key === 'site_logo' && value && !/^(https?:\/\/|\/(?!\/))[^\s]+$/i.test(value)) throw new Error('网站图标需要 HTTP(S) 或站内图片地址');
    if (key === 'site_timezone') { try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); } catch { throw new Error('请填写有效的 IANA 时区，例如 Asia/Shanghai'); } }
    out[key] = value;
  }
  return out;
}
