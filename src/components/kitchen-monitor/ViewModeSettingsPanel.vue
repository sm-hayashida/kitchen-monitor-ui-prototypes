<script setup>
import { computed } from 'vue';
import {
  resolveViewModeGroup,
  viewModeGroups,
} from '../../features/kitchen-monitor/viewModeOptions';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
  comparisonExpanded: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['switch-view']);

const activeGroupId = computed(
  () => resolveViewModeGroup(props.activeView)?.id ?? 'order',
);
</script>

<template>
  <section class="view-mode-settings">
    <div class="view-mode-settings-head">
      <h3>表示単位</h3>
      <span>調理画面に表示する単位を選択</span>
    </div>

    <div class="view-mode-choice-grid">
      <button
        v-for="group in viewModeGroups"
        :key="group.id"
        type="button"
        :class="{ active: activeGroupId === group.id }"
        @click="emit('switch-view', group.defaultView)"
      >
        {{ group.label }}
      </button>
    </div>

    <details class="layout-comparison-settings" :open="comparisonExpanded">
      <summary>レイアウト比較</summary>
      <div class="layout-comparison-groups">
        <section v-for="group in viewModeGroups" :key="group.id">
          <h4>{{ group.label }}</h4>
          <div>
            <button
              v-for="view in group.views"
              :key="view.id"
              type="button"
              :class="{ active: activeView === view.id }"
              @click="emit('switch-view', view.id)"
            >
              {{ view.label }}
            </button>
          </div>
        </section>
      </div>
    </details>
  </section>
</template>
