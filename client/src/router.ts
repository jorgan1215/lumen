import { setLocale, localePath } from './lib/i18n';
import { collectionsPosition } from './lib/navigation';
import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    // Changing the focused photograph must not move the album underneath it.
    if (to.meta.page === 'album' && from.meta.page === 'album' && to.params.id === from.params.id) return false;
    if (savedPosition) return savedPosition;
    if (to.meta.page === 'home' && to.hash === '#collections') return collectionsPosition();
    return { top: 0, behavior: 'smooth' };
  },
  routes: [
    ...[
      {path:'/',name:'home',component:()=>import('./views/HomeView.vue')},
      {path:'/albums',name:'albums',component:()=>import('./views/AlbumsView.vue')},
      {path:'/about',name:'about',component:()=>import('./views/AboutView.vue')},
      {path:'/album/:id',name:'album',component:()=>import('./views/AlbumView.vue')},
      {path:'/login',name:'login',component:()=>import('./views/LoginView.vue')},
      {path:'/admin',name:'admin',component:()=>import('./views/AdminView.vue'),meta:{requiresAuth:true}},
    ].flatMap(record => [
      {...record,meta:{...record.meta,page:record.name,language:'zh'}},
      {...record,path:record.path === '/' ? '/en' : `/en${record.path}`,name:`${record.name}-en`,meta:{...record.meta,page:record.name,language:'en'}},
    ]),
    {path:'/:pathMatch(.*)*',redirect:'/'},
  ],
});

router.beforeEach((to) => {
  const language = /^\/en(?:\/|$)/.test(to.path) ? 'en' : 'zh';
  setLocale(language);
  if (to.meta.requiresAuth && !localStorage.getItem('lumen_token')) {
    return { path: localePath('/login', language), query: { redirect: to.fullPath } };
  }
});
