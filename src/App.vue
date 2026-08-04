<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import ComparisonPanel from './components/kitchen-monitor/ComparisonPanel.vue';
import {
  createComparisonStore,
  provideComparisonStore,
} from './features/kitchen-monitor/comparisonState';
import { useColumnLayoutPreference } from './features/kitchen-monitor/useColumnLayoutPreference';
import { useKitchenMonitorSettings } from './features/kitchen-monitor/useKitchenMonitorSettings';
import KitchenMonitorLegacyListPage from './pages/KitchenMonitorLegacyListPage.vue';
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
  list: KitchenMonitorLegacyListPage,
};

const activeView = ref(resolveView());
const activePage = computed(() => pages[activeView.value] ?? pages[defaultView]);
const comparison = createComparisonStore(window.location.hash);
provideComparisonStore(comparison);
const { columnCountPreference, setColumnCountPreference } = useColumnLayoutPreference();
const { orderDataRevision } = useKitchenMonitorSettings();
const activePageKey = computed(() => [
  activeView.value,
  comparison.settings.scenario,
  comparison.reviewOrderRevision.value,
  orderDataRevision.value,
].join(':'));
const comparisonTokenClasses = computed(() => [
  'comparison-token-root',
  `comparison-theme-${comparison.settings.theme}`,
  `comparison-urgency-${comparison.settings.urgency}`,
  `comparison-intensity-${comparison.settings.intensity}`,
]);
let isSyncingHash = false;

function resolveView() {
  const view = window.location.hash.replace(/^#/, '').split('?')[0];
  return Object.hasOwn(pages, view) ? view : defaultView;
}

function syncView() {
  isSyncingHash = true;
  activeView.value = comparison.updateFromHash(window.location.hash);
  isSyncingHash = false;
}

function switchView(nextView) {
  const route = Object.hasOwn(pages, nextView) ? nextView : defaultView;
  window.location.hash = comparison.serialize(route);
}

onMounted(() => window.addEventListener('hashchange', syncView));
onUnmounted(() => window.removeEventListener('hashchange', syncView));

watch(
  [
    () => comparison.resetKey.value,
    () => comparison.reviewOrderRevision.value,
  ],
  () => {
    if (isSyncingHash) {
      return;
    }
    const nextHash = comparison.serialize(activeView.value);
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  },
);

watch(
  () => comparison.settings.columnCount,
  (nextColumnCount) => setColumnCountPreference(nextColumnCount),
  { immediate: true },
);

watch(columnCountPreference, (nextColumnCount) => {
  if (comparison.settings.columnCount !== nextColumnCount) {
    comparison.setField('columnCount', nextColumnCount);
  }
});
</script>

<template>
  <div :class="comparisonTokenClasses">
    <component
      :is="activePage"
      :key="activePageKey"
      :active-view="activeView"
      @switch-view="switchView"
    />
    <ComparisonPanel :active-view="activeView" @switch-view="switchView" />
  </div>
</template>
