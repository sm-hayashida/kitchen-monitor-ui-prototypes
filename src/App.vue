<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import KitchenMonitorOrderPage from './pages/KitchenMonitorOrderPage.vue';
import KitchenMonitorOrderNPagedPage from './pages/KitchenMonitorOrderNPagedPage.vue';
import KitchenMonitorOrderNScrollPage from './pages/KitchenMonitorOrderNScrollPage.vue';
import KitchenMonitorTableNPagedPage from './pages/KitchenMonitorTableNPagedPage.vue';
import KitchenMonitorTableNScrollPage from './pages/KitchenMonitorTableNScrollPage.vue';

const defaultView = 'order-n-scroll';

const pages = {
  order: KitchenMonitorOrderPage,
  'order-n-page': KitchenMonitorOrderNPagedPage,
  'order-n-scroll': KitchenMonitorOrderNScrollPage,
  'table-n-page': KitchenMonitorTableNPagedPage,
  'table-n-scroll': KitchenMonitorTableNScrollPage,
};

const activeView = ref(resolveView());
const activePage = computed(() => pages[activeView.value] ?? pages[defaultView]);

function resolveView() {
  const view = window.location.hash.replace(/^#/, '');
  return Object.hasOwn(pages, view) ? view : defaultView;
}

function syncView() {
  activeView.value = resolveView();
}

function switchView(nextView) {
  window.location.hash = Object.hasOwn(pages, nextView) ? nextView : defaultView;
}

onMounted(() => window.addEventListener('hashchange', syncView));
onUnmounted(() => window.removeEventListener('hashchange', syncView));
</script>

<template>
  <component :is="activePage" :active-view="activeView" @switch-view="switchView" />
</template>
