/** Wait for the routed page's enter transition before measuring its final position. */
export async function collectionsPosition() {
  const started = performance.now();
  let lastTop = NaN, stable = 0;
  return new Promise<{ top: number; left: number; behavior: ScrollBehavior }>(resolve => {
    function measure() {
      const section = document.getElementById('collections');
      if (section) {
        const absoluteTop = section.getBoundingClientRect().top + window.scrollY;
        const transitioning = section.closest('.page-enter-active, .page-leave-active');
        stable = !transitioning && Math.abs(absoluteTop - lastTop) < .5 ? stable + 1 : 0;
        lastTop = absoluteTop;
        if (stable >= 3 || performance.now() - started > 2000) {
          const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
          resolve({ top: Math.max(0, absoluteTop - headerHeight), left: 0, behavior: 'smooth' });
          return;
        }
      }
      if (performance.now() - started > 2000) { resolve({ top: 0, left: 0, behavior: 'smooth' }); return; }
      requestAnimationFrame(measure);
    }
    requestAnimationFrame(measure);
  });
}
