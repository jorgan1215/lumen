import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList } from 'node:net';
import { pipeline } from 'node:stream/promises';

// Pin each remote request to a resolved public IPv4 address, including redirects.
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]]) blocked.addSubnet(address, prefix);
async function remoteImage(value, redirects = 0) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) throw new Error('Invalid image URL');
  const { address } = await lookup(url.hostname, { family: 4 });
  if (blocked.check(address)) throw new Error('Private address');
  const response = await new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      lookup: (_hostname, options, callback) => options.all ? callback(null, [{ address, family: 4 }]) : callback(null, address, 4),
      headers: { 'User-Agent': 'LUMEN/1.0', Accept: 'image/*' },
    }, resolve);
    request.setTimeout(30000, () => request.destroy(new Error('Image timeout')));
    request.on('error', reject);
  });
  if ([301,302,303,307,308].includes(response.statusCode)) {
    response.resume();
    if (redirects >= 4 || !response.headers.location) throw new Error('Too many redirects');
    return remoteImage(new URL(response.headers.location, url).href, redirects + 1);
  }
  if (response.statusCode !== 200 || !/^image\//i.test(response.headers['content-type'] || '')) { response.resume(); throw new Error('Image unavailable'); }
  return response;
}
export async function downloadPhoto(photo, res) {
  const source = await remoteImage(photo.url);
  const type = source.headers['content-type'].split(';')[0];
  const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','image/gif':'gif','image/tiff':'tif'})[type] || 'img';
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Disposition', `attachment; filename="photo-${photo.id}.${ext}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  await pipeline(source, res);
}
