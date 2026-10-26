import {getToken,getAlbumToken} from '../api';

/** Submit in the click gesture so mobile Safari can open the native download UI.
 * The file streams to the browser; no cross-origin fetch or whole-file Blob is needed.
 * Credentials are sent in a same-origin POST body, never in the URL.
 */
export function startPhotoDownload(photoId: number, albumId: number | undefined, onError: (message:string)=>void) {
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const form = document.createElement('form');
  form.method='POST'; form.action=`/api/photos/${encodeURIComponent(photoId)}/download`;
  form.style.display='none'; form.setAttribute('rel','noopener');
  if (mobile) form.target='_blank';
  else {
    const frame=document.createElement('iframe');
    frame.name=`photo-download-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    frame.hidden=true; frame.title='Photo download';
    frame.onload=()=>{
      try {
        const content=frame.contentDocument?.body?.textContent?.trim();
        if (!content) return;
        const body=JSON.parse(content);
        if(body.error) {onError(body.error);frame.remove();}
      } catch {}
    };
    // Keep the target alive while the browser's download manager consumes the stream.
    document.body.appendChild(frame);form.target=frame.name;
  }
  const values={access_token:getToken(),album_token:albumId ? getAlbumToken(albumId) : ''};
  for (const [name,value] of Object.entries(values)) {
    const field=document.createElement('input');field.type='hidden';field.name=name;field.value=value;form.appendChild(field);
  }
  document.body.appendChild(form);
  try {form.submit();} finally {form.remove();}
}
