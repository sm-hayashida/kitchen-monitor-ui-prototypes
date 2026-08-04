<script setup>
import { ref } from 'vue';
import CategoryRail from './CategoryRail.vue';
import ComparisonSettingsPanel from './ComparisonSettingsPanel.vue';
import OrderDetailDrawer from './OrderDetailDrawer.vue';
import TopBar from './TopBar.vue';
import ViewSettingsModal from './ViewSettingsModal.vue';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
  categories: {
    type: Array,
    required: true,
  },
  detailLayout: {
    type: String,
    default: 'overlay',
  },
  externalSettings: {
    type: Boolean,
    default: false,
  },
  nowMs: {
    type: Number,
    required: true,
  },
  navigationCollapsed: {
    type: Boolean,
    default: false,
  },
  navigationCollapsible: {
    type: Boolean,
    default: false,
  },
  pageClass: {
    type: String,
    default: '',
  },
  selectedOrder: {
    type: Object,
    default: null,
  },
  showNavigation: {
    type: Boolean,
    default: true,
  },
  toast: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'close-detail',
  'open-settings',
  'return-to-order',
  'select-category',
  'switch-view',
  'toggle-navigation',
]);

const isViewSettingsOpen = ref(false);
const isComparisonSettingsOpen = ref(false);

function openSettings() {
  if (props.externalSettings) {
    emit('open-settings');
    return;
  }

  isViewSettingsOpen.value = true;
}

function switchView(nextView) {
  isComparisonSettingsOpen.value = false;
  isViewSettingsOpen.value = false;
  emit('switch-view', nextView);
}
</script>

<template>
  <main class="stage" :class="pageClass">
    <section class="monitor-frame">
      <TopBar
        :active-view="activeView"
        @open-comparison="isComparisonSettingsOpen = true"
        @open-settings="openSettings"
        @switch-view="switchView"
      >
        <template #actions>
          <slot name="header-actions" />
        </template>
      </TopBar>

      <div class="monitor-content">
        <div
          class="content-grid"
          :class="{
            'has-detail': selectedOrder,
            'no-navigation': !showNavigation,
            'navigation-collapsed': navigationCollapsed,
            'split-detail': detailLayout === 'split',
          }"
        >
          <template v-if="showNavigation">
            <slot name="navigation">
              <CategoryRail
                :categories="categories"
                :collapsed="navigationCollapsed"
                :collapsible="navigationCollapsible"
                @select-category="$emit('select-category', $event)"
                @toggle="$emit('toggle-navigation')"
              />
            </slot>
          </template>

          <slot />

          <OrderDetailDrawer
            v-if="selectedOrder"
            :now-ms="nowMs"
            :order="selectedOrder"
            @close="$emit('close-detail')"
            @return-to-order="$emit('return-to-order')"
          />
        </div>
      </div>

      <slot name="overlay" />

      <ComparisonSettingsPanel
        v-if="isComparisonSettingsOpen"
        :active-view="activeView"
        @close="isComparisonSettingsOpen = false"
        @switch-view="switchView"
      />

      <ViewSettingsModal
        v-if="isViewSettingsOpen"
        :active-view="activeView"
        @close="isViewSettingsOpen = false"
        @switch-view="switchView"
      />

      <p v-if="toast" class="toast">{{ toast }}</p>
    </section>
  </main>
</template>
