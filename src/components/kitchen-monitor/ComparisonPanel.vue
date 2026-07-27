<script setup>
import { Check, Clipboard, RotateCcw, SlidersHorizontal, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
  comparisonInfoKeys,
  comparisonIntensityOptions,
  comparisonLabels,
  comparisonOptions,
  comparisonQuantityDisplayStyleOptions,
  comparisonRecipeGroups,
  comparisonRecipes,
  comparisonThemeOptions,
  comparisonUrgencyOptions,
  getActiveComparisonRecipe,
  getComparisonDifferenceSummary,
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

const isOpen = computed(() => comparison.isPanelOpen.value);
const selectedRecipe = computed(() => getActiveComparisonRecipe(comparison.settings));
const differenceSummary = computed(() => getComparisonDifferenceSummary(comparison.settings));
const groupedRecipes = computed(() =>
  comparisonRecipeGroups.map((group) => ({
    ...group,
    recipes: Object.entries(comparisonRecipes)
      .filter(([, recipe]) => recipe.group === group.id)
      .map(([id, recipe]) => ({ id, ...recipe })),
  })),
);

const colorPreviewSamples = [
  { id: 'normal', label: '通常' },
  { id: 'warning', label: '期限間近' },
  { id: 'overdue', label: '超過' },
  { id: 'completed', label: '完了' },
  { id: 'selected', label: '選択中' },
];
const quantityPreviewSamples = computed(() =>
  comparisonQuantityDisplayStyleOptions.map((option) => ({
    ...option,
    active: comparison.settings.quantityDisplayStyle === option.id,
  })),
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

    <div class="comparison-status-summary" aria-live="polite">
      <div>
        <span>レシピ</span>
        <strong>{{ differenceSummary.activeRecipeLabel }}</strong>
      </div>
      <div>
        <span>現行との差分</span>
        <strong>{{ differenceSummary.differenceCount }}件</strong>
      </div>
      <div class="comparison-difference-chips">
        <span v-for="chip in differenceSummary.chips" :key="chip">{{ chip }}</span>
        <span v-if="differenceSummary.extraCount > 0">ほか{{ differenceSummary.extraCount }}件</span>
      </div>
    </div>

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
        <h3>レシピ</h3>
        <div class="comparison-recipe-groups">
          <section v-for="group in groupedRecipes" :key="group.id">
            <h4>{{ group.label }}</h4>
            <div class="comparison-recipe-grid">
              <button
                v-for="recipe in group.recipes"
                :key="recipe.id"
                type="button"
                :class="{ active: selectedRecipe === recipe.id }"
                @click="comparison.applyPreset(recipe.id)"
              >
                <strong>{{ recipe.label }}</strong>
                <span>{{ recipe.purpose }}</span>
                <small>{{ recipe.effectSummary }}</small>
              </button>
            </div>
          </section>
        </div>
      </section>

      <section class="comparison-control-section">
        <h3>色</h3>
        <label>
          <span>テーマ</span>
          <select :value="comparison.settings.theme" @change="updateText('theme', $event)">
            <option v-for="theme in comparisonThemeOptions" :key="theme.id" :value="theme.id">
              {{ theme.label }}
            </option>
          </select>
        </label>
        <label>
          <span>警告配色</span>
          <select :value="comparison.settings.urgency" @change="updateText('urgency', $event)">
            <option v-for="urgency in comparisonUrgencyOptions" :key="urgency.id" :value="urgency.id">
              {{ urgency.label }}
            </option>
          </select>
        </label>
        <label>
          <span>強度</span>
          <select :value="comparison.settings.intensity" @change="updateText('intensity', $event)">
            <option v-for="intensity in comparisonIntensityOptions" :key="intensity.id" :value="intensity.id">
              {{ intensity.label }}
            </option>
          </select>
        </label>
        <div class="comparison-color-preview" aria-label="色サンプル">
          <span
            v-for="sample in colorPreviewSamples"
            :key="sample.id"
            :class="`sample-${sample.id}`"
          >
            {{ sample.label }}
          </span>
        </div>
      </section>

      <section class="comparison-control-section">
        <h3>シナリオ</h3>
        <select :value="comparison.settings.scenario" @change="updateText('scenario', $event)">
          <option v-for="scenario in comparisonOptions.scenarios" :key="scenario" :value="scenario">
            {{ comparisonLabels.scenarios[scenario] }}
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
              {{ comparisonLabels.rowSpacings[rowSpacing] }}
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
              {{ comparisonLabels.quantityModes[mode] }}
            </option>
          </select>
        </label>
        <label>
          <span>数量表示</span>
          <select
            :value="comparison.settings.quantityDisplayStyle"
            @change="updateText('quantityDisplayStyle', $event)"
          >
            <option
              v-for="style in comparisonQuantityDisplayStyleOptions"
              :key="style.id"
              :value="style.id"
            >
              {{ style.label }}
            </option>
          </select>
        </label>
        <div class="comparison-quantity-style-preview" aria-label="数量表示サンプル">
          <button
            v-for="style in quantityPreviewSamples"
            :key="style.id"
            type="button"
            :class="[
              `quantity-style-${style.id}`,
              { active: style.active },
            ]"
            @click="comparison.setField('quantityDisplayStyle', style.id)"
          >
            <strong>{{ style.label }}</strong>
            <span class="quantity-style-sample">
              <i class="sample-main">3</i>
              <i
                v-if="style.id !== 'a'"
                class="sample-total"
              >{{ style.id === 'i' ? '(8)' : '8' }}</i>
            </span>
          </button>
        </div>
        <div class="comparison-toggle-grid">
          <label v-for="key in comparisonInfoKeys" :key="key">
            <input
              type="checkbox"
              :checked="comparison.settings.info.includes(key)"
              @change="comparison.toggleInfo(key)"
            />
            <span>{{ comparisonLabels.info[key] }}</span>
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
