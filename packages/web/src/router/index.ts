import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/review',
  },
  {
    path: '/review',
    name: 'review',
    component: () => import('../views/ReviewView.vue'),
  },
  {
    path: '/uml',
    name: 'uml',
    component: () => import('../views/UMLPage.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
