<script setup>
import { Settings, Volume2, VolumeX } from '@lucide/vue';
import { ref } from 'vue';
import {
  resolveViewModeGroup,
  viewModeGroups,
} from '../../features/kitchen-monitor/viewModeOptions';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['open-settings', 'switch-view']);
const soundEnabled = ref(window.localStorage.getItem('kitchen-monitor-sound') !== 'off');

function switchView(viewId) {
  emit('switch-view', viewId);
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  window.localStorage.setItem('kitchen-monitor-sound', soundEnabled.value ? 'on' : 'off');
}
</script>

<template>
  <header class="top-bar">
    <nav class="top-bar-mode-switch" aria-label="表示単位">
      <button
        v-for="group in viewModeGroups"
        :key="group.id"
        type="button"
        :class="{ active: resolveViewModeGroup(props.activeView)?.id === group.id }"
        @click="switchView(group.defaultView)"
      >
        {{ group.shortLabel }}
      </button>
    </nav>

    <div class="top-bar-actions">
      <slot name="actions" />
      <button
        class="top-bar-icon-button"
        type="button"
        :aria-label="soundEnabled ? '通知音を消す' : '通知音を有効にする'"
        :aria-pressed="soundEnabled"
        :title="soundEnabled ? '通知音オン' : '通知音オフ'"
        @click="toggleSound"
      >
        <Volume2 v-if="soundEnabled" :size="18" :stroke-width="2.2" aria-hidden="true" />
        <VolumeX v-else :size="18" :stroke-width="2.2" aria-hidden="true" />
      </button>
      <button
        class="settings-button top-bar-icon-button"
        type="button"
        aria-label="設定を開く"
        title="設定"
        @click="$emit('open-settings')"
      >
        <Settings :size="19" :stroke-width="2.2" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>
