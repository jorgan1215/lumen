import { reactive } from 'vue';
import { api, type SiteInfo } from '../api';
export const siteSettings = reactive({ name: 'LUMEN', subtitle: '', author: 'Jorgan Xing', description: '个人摄影集，记录光到达的地方。', timeZone: 'Asia/Shanghai', logo: '/logo.svg' });
export function applySiteSettings(site: Pick<SiteInfo,'subtitle'|'name'|'author'|'description'|'timeZone'|'logo'>) {
  Object.assign(siteSettings, { subtitle: site.subtitle || '', name: site.name || 'LUMEN', author: site.author || 'Jorgan Xing', description: site.description ?? '', timeZone: site.timeZone || 'Asia/Shanghai', logo: site.logo || '/logo.svg' });
  document.querySelector('meta[name="description"]')?.setAttribute('content',siteSettings.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content',siteSettings.name);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content',siteSettings.description);
  document.querySelector('link[rel="icon"]')?.setAttribute('href',siteSettings.logo);
}
export async function loadSiteSettings() { const site = await api.site(); applySiteSettings(site); return site; }
