import type { Directive } from 'vue';

// v-reveal：元素进入视口时添加 .is-visible，可选修饰符表示延迟 ms
// 用法：v-reveal 或 v-reveal:200
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.01, rootMargin: '0px 0px 8% 0px' },
);

const timers = new WeakMap<HTMLElement, number>();

export const reveal: Directive<HTMLElement> = {
  mounted(el, binding) {
    el.classList.add('reveal');
    const delay = binding.arg ? Number(binding.arg) : 0;
    if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);

    observer.observe(el);

    // 兜底：极端情况下（超长图、布局抖动）IntersectionObserver 没触发时，
    // 只要元素确实在视口里就直接显示，避免整块内容停在 opacity:0。
    const timer = window.setTimeout(() => {
      if (el.classList.contains('is-visible')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-visible');
        observer.unobserve(el);
      }
    }, 2500);
    timers.set(el, timer);
  },
  unmounted(el) {
    observer.unobserve(el);
    const timer = timers.get(el);
    if (timer) window.clearTimeout(timer);
  },
};
