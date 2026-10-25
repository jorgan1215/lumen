import { reactive } from 'vue';
import { OriginalQueue } from './originalQueue';
export const originalReady = reactive(new Set<string>());
export const originalErrors = reactive(new Set<string>());
export const originals = new OriginalQueue((url, priority, done) => {
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = priority ? 'high' : 'low';
  originalErrors.delete(url);
  let finished = false;
  const finish = (ok: boolean) => {
    if (finished) return;
    finished = true; window.clearTimeout(timer);
    image.onload = image.onerror = null;
    if (!ok) { originalErrors.add(url); image.src = ''; }
    done(ok);
  };
  const timer = window.setTimeout(() => finish(false), 45000);
  image.onload = () => finish(true);
  image.onerror = () => finish(false);
  image.src = url;
  const cancel = () => { finished = true; window.clearTimeout(timer); image.onload = image.onerror = null; image.src = ''; };
  cancel.promote = () => { image.fetchPriority = 'high'; };
  return cancel;
}, url => originalReady.add(url));
