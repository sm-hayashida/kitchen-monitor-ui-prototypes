<script setup>
import { onMounted, ref } from 'vue';
import {
  columnCountPreferenceOptions,
  useColumnLayoutPreference,
} from '../../features/kitchen-monitor/useColumnLayoutPreference';
import ViewModeSettingsPanel from './ViewModeSettingsPanel.vue';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['close', 'switch-view']);
const closeButtonRef = ref(null);
const { columnCountPreference, setColumnCountPreference } = useColumnLayoutPreference();

onMounted(() => {
  closeButtonRef.value?.focus();
});
</script>

<template>
  <div
    class="comparison-settings-backdrop"
    role="presentation"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <section
      class="comparison-settings-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-settings-title"
    >
      <header>
        <div>
          <h2 id="comparison-settings-title">比較設定</h2>
          <p>表示レイアウトとカード列数を切り替えて比較します</p>
        </div>
        <button
          ref="closeButtonRef"
          type="button"
          aria-label="比較設定を閉じる"
          title="閉じる"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="comparison-settings-content">
        <ViewModeSettingsPanel
          :active-view="activeView"
          comparison-expanded
          @switch-view="emit('switch-view', $event)"
        />

        <section class="comparison-column-setting">
          <div class="comparison-setting-heading">
            <div>
              <h3>カード列数</h3>
              <p>自動は画面幅に合わせて2〜4列で調整します</p>
            </div>
            <strong>現在：{{ columnCountPreference === 'auto' ? '自動' : `${columnCountPreference}列` }}</strong>
          </div>
          <div class="comparison-column-choice" role="group" aria-label="比較用カード列数">
            <button
              v-for="option in columnCountPreferenceOptions"
              :key="option.value"
              type="button"
              :class="{ active: columnCountPreference === option.value }"
              :aria-pressed="columnCountPreference === option.value"
              @click="setColumnCountPreference(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </section>

        <section class="comparison-current-standard" aria-label="数量表示の現行基準">
          <span>N</span>
          <div>
            <h3>数量表示</h3>
            <p>残数／全注文の同一商品未調理合計を既定表示にしています</p>
          </div>
          <strong>現行基準</strong>
        </section>
      </div>

      <footer>
        <p>選択内容はすぐに画面へ反映されます</p>
        <button type="button" @click="emit('close')">閉じる</button>
      </footer>
    </section>
  </div>
</template>
