import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { reveal } from './directives/reveal';
import './style.css';

createApp(App).use(router).directive('reveal', reveal).mount('#app');

// 图片（代理图 / 原图）用 Service Worker 做本地缓存，二次访问不再走网络
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[lumen] Service Worker 注册失败，图片将不缓存', err);
    });
  });
}
