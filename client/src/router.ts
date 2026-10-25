import { collectionsPosition } from './lib/navigation';
import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to) {
    if (to.path === '/' && to.hash === '#collections') return collectionsPosition();
    return { top: 0, behavior: 'smooth' };
  },
  routes: [
    { path: '/about', name: 'about', component: () => import('./views/AboutView.vue') },
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/album/:id', name: 'album', component: () => import('./views/AlbumView.vue') },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('./views/AdminView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('lumen_token')) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
});
