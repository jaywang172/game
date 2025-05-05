import { createRouter, createWebHistory } from 'vue-router'
import WelcomeView from '../views/WelcomeView.vue' // Path relative to this file (src/router/index.js)
import BattleView from '../views/BattleView.vue'   // Path relative to this file (src/router/index.js)

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: WelcomeView
  },
  {
    path: '/battle',
    name: 'Battle',
    component: BattleView
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router 