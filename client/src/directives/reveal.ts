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
  { threshold: 0.12 },
);

export const reveal: Directive<HTMLElement> = {
  mounted(el, binding) {
    el.classList.add('reveal');
    const delay = binding.arg ? Number(binding.arg) : 0;
    if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
    observer.observe(el);
  },
  unmounted(el) {
    observer.unobserve(el);
  },
};
