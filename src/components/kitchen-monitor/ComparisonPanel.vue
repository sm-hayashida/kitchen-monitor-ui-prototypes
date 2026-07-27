<script setup>
import { Check, Clipboard, RotateCcw, SlidersHorizontal, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
  comparisonInfoKeys,
  comparisonOptions,
  comparisonPresets,
} from '../../features/kitchen-monitor/comparisonConfig';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import { viewModeGroups } from '../../features/kitchen-monitor/viewModeOptions';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['switch-view']);
const comparison = useComparisonStore();
const copied = ref(false);
let copiedTimer;

const scenarioLabels = {
  normal: '通常',
  peak: 'ピーク',
  long: '長い注文',
  quantity: '数量多め',
  memo: 'メモ多め',
  delay: '遅延',
};
const rowLabels = {
  compact: '詰める',
  standard: '標準',
  comfortable: '広め',
};
const quantityLabels = {
  current: '現行',
  remaining: '残数',
  progress: '進捗',
};
const infoLabels = {
  course: 'コース',
  options: 'オプション',
  itemMemo: '商品メモ',
  orderMemo: '注文メモ',
  aggregate: '横断集計',
  bulkComplete: '注文完了',
};
const presetLabels = {
  current: '現行値',
  dense: '高密度',
  comfortable: 'ゆったり',
  careful: '慎重',
  instant: '即時',
  peak: 'ピーク',
};

const isOpen = computed(() => comparison.isPanelOpen.value);
const selectedPreset = computed(() =>
  Object.entries(comparisonPresets).find(([presetId, preset]) => {
    if (presetId === 'current') {
      return isCurrentDefaults.value;
    }
    return Object.entries(preset).every(([key, value]) => comparison.settings[key] === value);
  })?.[0] ?? '',
);
const isCurrentDefaults = computed(() =>
  comparison.settings.scenario === 'normal' &&
  comparison.settings.cardMinWidth === 290 &&
  comparison.settings.rowSpacing === 'standard' &&
  comparison.settings.quantityMode === 'current' &&
  comparison.settings.orderUndoMs === 3000 &&
  comparison.settings.itemHideMs === 5000 &&
  comparison.settings.targetMinutes === 15 &&
  comparison.settings.warningMinutes === 3 &&
  comparison.settings.motion &&
  comparison.settings.info.length === comparisonInfoKeys.length &&
  comparisonInfoKeys.every((key) => comparison.settings.info.includes(key)),
);

function updateNumber(key, event) {
  comparison.setField(key, Number(event.target.value));
}

function updateText(key, event) {
  comparison.setField(key, event.target.value);
}

function updateMotion(event) {
  comparison.setField('motion', event.target.value === 'on');
}

function openPanel() {
  comparison.isPanelOpen.value = true;
}

function closePanel() {
  comparison.isPanelOpen.value = false;
}

async function copyShareUrl() {
  const shareUrl = comparison.createShareUrl(props.activeView);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl);
  } else {
    const field = document.createElement('textarea');
    field.value = shareUrl;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
  copied.value = true;
  window.clearTimeout(copiedTimer);
  copiedTimer = window.setTimeout(() => {
    copied.value = false;
  }, 1600);
}
</script>

<template>
  <button
    class="comparison-floating-entry"
    type="button"
    aria-label="比較パネルを開く"
    :aria-expanded="isOpen"
    @click="openPanel"
  >
    <SlidersHorizontal :size="19" :stroke-width="2.3" aria-hidden="true" />
    <span>比較</span>
  </button>

  <aside
    v-if="isOpen"
    class="comparison-panel"
    aria-label="比較設定"
  >
    <header class="comparison-panel-head">
      <div>
        <span>レビュー用</span>
        <h2>比較</h2>
      </div>
      <button type="button" aria-label="比較パネルを閉じる" @click="closePanel">
        <X :size="22" :stroke-width="2.3" aria-hidden="true" />
      </button>
    </header>

    <div class="comparison-panel-scroll">
      <section class="comparison-control-section">
        <h3>画面</h3>
        <div class="comparison-route-groups">
          <div v-for="group in viewModeGroups" :key="group.id">
            <strong>{{ group.label }}</strong>
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
          </div>
        </div>
      </section>

      <section class="comparison-control-section">
        <h3>プリセット</h3>
        <div class="comparison-preset-grid">
          <button
            v-for="(_preset, presetId) in comparisonPresets"
            :key="presetId"
            type="button"
            :class="{ active: selectedPreset === presetId }"
            @click="comparison.applyPreset(presetId)"
          >
            {{ presetLabels[presetId] }}
          </button>
        </div>
      </section>

      <section class="comparison-control-section">
        <h3>シナリオ</h3>
        <select :value="comparison.settings.scenario" @change="updateText('scenario', $event)">
          <option v-for="scenario in comparisonOptions.scenarios" :key="scenario" :value="scenario">
            {{ scenarioLabels[scenario] }}
          </option>
        </select>
      </section>

      <section class="comparison-control-section">
        <h3>密度</h3>
        <label>
          <span>カード幅</span>
          <select :value="comparison.settings.cardMinWidth" @change="updateNumber('cardMinWidth', $event)">
            <option v-for="width in comparisonOptions.cardMinWidths" :key="width" :value="width">
              {{ width }}px
            </option>
          </select>
        </label>
        <label>
          <span>行間</span>
          <select :value="comparison.settings.rowSpacing" @change="updateText('rowSpacing', $event)">
            <option v-for="rowSpacing in comparisonOptions.rowSpacings" :key="rowSpacing" :value="rowSpacing">
              {{ rowLabels[rowSpacing] }}
            </option>
          </select>
        </label>
      </section>

      <section class="comparison-control-section">
        <h3>表示情報</h3>
        <label>
          <span>数量</span>
          <select :value="comparison.settings.quantityMode" @change="updateText('quantityMode', $event)">
            <option v-for="mode in comparisonOptions.quantityModes" :key="mode" :value="mode">
              {{ quantityLabels[mode] }}
            </option>
          </select>
        </label>
        <div class="comparison-toggle-grid">
          <label v-for="key in comparisonInfoKeys" :key="key">
            <input
              type="checkbox"
              :checked="comparison.settings.info.includes(key)"
              @change="comparison.toggleInfo(key)"
            />
            <span>{{ infoLabels[key] }}</span>
          </label>
        </div>
      </section>

      <section class="comparison-control-section">
        <h3>時間</h3>
        <label>
          <span>注文取消</span>
          <select :value="comparison.settings.orderUndoMs" @change="updateNumber('orderUndoMs', $event)">
            <option v-for="value in comparisonOptions.orderUndoMs" :key="value" :value="value">
              {{ value / 1000 }}秒
            </option>
          </select>
        </label>
        <label>
          <span>商品非表示</span>
          <select :value="comparison.settings.itemHideMs" @change="updateNumber('itemHideMs', $event)">
            <option v-for="value in comparisonOptions.itemHideMs" :key="value" :value="value">
              {{ value / 1000 }}秒
            </option>
          </select>
        </label>
        <label>
          <span>目標</span>
          <select :value="comparison.settings.targetMinutes" @change="updateNumber('targetMinutes', $event)">
            <option v-for="value in comparisonOptions.targetMinutes" :key="value" :value="value">
              {{ value }}分
            </option>
          </select>
        </label>
        <label>
          <span>期限間近</span>
          <select :value="comparison.settings.warningMinutes" @change="updateNumber('warningMinutes', $event)">
            <option v-for="value in comparisonOptions.warningMinutes" :key="value" :value="value">
              {{ value }}分
            </option>
          </select>
        </label>
        <label>
          <span>動き</span>
          <select :value="comparison.settings.motion ? 'on' : 'off'" @change="updateMotion">
            <option value="on">オン</option>
            <option value="off">オフ</option>
          </select>
        </label>
      </section>
    </div>

    <footer class="comparison-panel-actions">
      <button type="button" class="comparison-reset-button" @click="comparison.resetToCurrent">
        <RotateCcw :size="17" aria-hidden="true" />
        <span>現行値へ戻す</span>
      </button>
      <button type="button" class="comparison-copy-button" @click="copyShareUrl">
        <Check v-if="copied" :size="17" aria-hidden="true" />
        <Clipboard v-else :size="17" aria-hidden="true" />
        <span>{{ copied ? 'コピー済み' : '共有URL' }}</span>
      </button>
    </footer>
  </aside>
</template>
