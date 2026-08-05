<script setup>
import { Check, Clipboard, Plus, RotateCcw, SlidersHorizontal, Trash2, X } from '@lucide/vue';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import {
  comparisonColorPatterns,
  comparisonInfoKeys,
  comparisonIntensityOptions,
  comparisonItemTapModeOptions,
  comparisonLabels,
  comparisonOptions,
  comparisonOrderTimeDisplayModeOptions,
  comparisonQuantityDisplayStyleOptions,
  comparisonQuantityInteractionModeOptions,
  comparisonRecipeGroups,
  comparisonRecipes,
  comparisonStatusColorModeOptions,
  comparisonThemeOptions,
  comparisonUrgencyOptions,
  getActiveComparisonColorPattern,
  getActiveComparisonRecipe,
  getComparisonDifferenceSummary,
} from '../../features/kitchen-monitor/comparisonConfig';
import { createQuantityDisplayModel } from '../../features/kitchen-monitor/quantityDisplay';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import {
  createDefaultReviewOrderDraft,
  createReviewOrderPresetDraft,
  reviewOrderCategoryOptions,
  reviewOrderQuickPresets,
  summarizeReviewOrderDraft,
} from '../../features/kitchen-monitor/comparisonReviewOrders';
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
const closeButtonRef = ref(null);
const reviewOrderDraft = reactive(createDefaultReviewOrderDraft(1));
let copiedTimer;

const isOpen = computed(() => comparison.isPanelOpen.value);
const selectedRecipe = computed(() => getActiveComparisonRecipe(comparison.settings));
const selectedColorPattern = computed(() => getActiveComparisonColorPattern(comparison.settings));
const differenceSummary = computed(() => getComparisonDifferenceSummary(comparison.settings));
const colorPatterns = Object.entries(comparisonColorPatterns).map(([id, pattern]) => ({
  id,
  ...pattern,
}));
const reviewOrderSummaries = computed(() =>
  comparison.reviewOrderDrafts.value.map((draft, index) =>
    summarizeReviewOrderDraft(draft, index + 1),
  ),
);
const reviewOrderLimitReached = computed(
  () => reviewOrderSummaries.value.length >= comparison.maxReviewOrderCount,
);
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
    display: createQuantityDisplayModel({
      style: option.id,
      quantityMode: 'current',
      processedCount: 2,
      totalQuantity: 4,
      aggregateTotalQuantity: 4,
      hasAggregate: true,
      showAggregate: true,
    }),
  })),
);
const activeViewLabel = computed(() =>
  viewModeGroups
    .flatMap((group) => group.views)
    .find((view) => view.id === props.activeView)?.label ?? props.activeView,
);

watch(isOpen, async (open) => {
  if (open) {
    await nextTick();
    closeButtonRef.value?.focus();
  }
});

function updateNumber(key, event) {
  comparison.setField(key, Number(event.target.value));
}

function updateText(key, event) {
  comparison.setField(key, event.target.value);
}

function updateMotion(event) {
  comparison.setField('motion', event.target.value === 'on');
}

function addReviewOrder() {
  const added = comparison.addReviewOrder(reviewOrderDraft);
  if (added) {
    reviewOrderDraft.tableNo = `R${reviewOrderSummaries.value.length + 1}`;
  }
}

function addReviewOrderPreset(presetId) {
  const added = comparison.addReviewOrder(
    createReviewOrderPresetDraft(presetId, reviewOrderSummaries.value.length + 1),
  );
  if (added) {
    reviewOrderDraft.tableNo = `R${reviewOrderSummaries.value.length + 1}`;
  }
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
    v-if="!isOpen"
    class="comparison-floating-entry"
    type="button"
    aria-label="比較パネルを開く"
    :aria-expanded="isOpen"
    @click="openPanel"
  >
    <SlidersHorizontal :size="19" :stroke-width="2.3" aria-hidden="true" />
    <span>比較ラボ</span>
  </button>

  <aside
    v-if="isOpen"
    class="comparison-panel"
    role="dialog"
    aria-modal="false"
    aria-labelledby="comparison-panel-title"
    @keydown.esc="closePanel"
  >
    <header class="comparison-panel-head">
      <div>
        <span>UI REVIEW LAB</span>
        <h2 id="comparison-panel-title">比較ラボ</h2>
        <p>{{ activeViewLabel }}を表示中</p>
      </div>
      <button ref="closeButtonRef" type="button" aria-label="比較パネルを閉じる" @click="closePanel">
        <X :size="22" :stroke-width="2.3" aria-hidden="true" />
      </button>
    </header>

    <div class="comparison-status-summary" aria-live="polite">
      <div>
        <span>選択レシピ</span>
        <strong>
          {{ differenceSummary.activeRecipeLabel }}{{ reviewOrderSummaries.length ? '＋追加注文' : '' }}
        </strong>
      </div>
      <div>
        <span>現行との差分</span>
        <strong>{{ differenceSummary.differenceCount + reviewOrderSummaries.length }}件</strong>
      </div>
      <div class="comparison-difference-chips">
        <span v-for="chip in differenceSummary.chips" :key="chip">{{ chip }}</span>
        <span v-if="reviewOrderSummaries.length">追加注文:{{ reviewOrderSummaries.length }}件</span>
        <span v-if="differenceSummary.extraCount > 0">ほか{{ differenceSummary.extraCount }}件</span>
      </div>
      <small>既定：N 左残数／合計・数量はその場で変更・行タップで全完了</small>
    </div>

    <div class="comparison-panel-scroll">
      <section class="comparison-control-section">
        <header class="comparison-section-heading">
          <div><span>01</span><h3>画面</h3></div>
          <p>表示単位とレイアウトを切り替えます</p>
        </header>
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
        <header class="comparison-section-heading">
          <div><span>02</span><h3>レシピ</h3></div>
          <p>検証目的に合わせて設定一式を適用します</p>
        </header>
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
        <header class="comparison-section-heading">
          <div><span>03</span><h3>配色</h3></div>
          <p>橙を基調に、状態色の面積とコントラストを比較します</p>
        </header>
        <div class="comparison-color-pattern-grid" aria-label="オレンジ基調の配色案">
          <button
            v-for="pattern in colorPatterns"
            :key="pattern.id"
            class="comparison-color-pattern"
            :class="[`pattern-${pattern.id}`, { active: selectedColorPattern === pattern.id }]"
            type="button"
            @click="comparison.applyColorPattern(pattern.id)"
          >
            <span class="comparison-color-pattern-swatches" aria-hidden="true">
              <i></i><i></i><i></i><i></i>
            </span>
            <span>
              <strong>
                {{ pattern.label }}
                <em v-if="pattern.recommended">おすすめ</em>
              </strong>
              <small>{{ pattern.description }}</small>
            </span>
          </button>
        </div>
        <details class="comparison-color-details">
          <summary>配色を個別に調整</summary>
          <label>
            <span>テーマ</span>
            <select :value="comparison.settings.theme" @change="updateText('theme', $event)">
              <option v-for="theme in comparisonThemeOptions" :key="theme.id" :value="theme.id">
                {{ theme.label }}
              </option>
            </select>
          </label>
          <label>
            <span>状態色の使い方</span>
            <select :value="comparison.settings.statusColorMode" @change="updateText('statusColorMode', $event)">
              <option v-for="mode in comparisonStatusColorModeOptions" :key="mode.id" :value="mode.id">
                {{ mode.label }}
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
        </details>
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
        <header class="comparison-section-heading">
          <div><span>04</span><h3>データ量</h3></div>
          <p>ピーク・長文・遅延などの固定データに切り替えます</p>
        </header>
        <select :value="comparison.settings.scenario" @change="updateText('scenario', $event)">
          <option v-for="scenario in comparisonOptions.scenarios" :key="scenario" :value="scenario">
            {{ comparisonLabels.scenarios[scenario] }}
          </option>
        </select>
      </section>

      <section class="comparison-control-section">
        <header class="comparison-section-heading">
          <div><span>05</span><h3>レビュー注文</h3></div>
          <p>現在のシナリオに具体的な確認用注文を追加します</p>
        </header>

        <div class="review-order-quick-grid">
          <button
            v-for="preset in reviewOrderQuickPresets"
            :key="preset.id"
            type="button"
            :disabled="reviewOrderLimitReached"
            @click="addReviewOrderPreset(preset.id)"
          >
            <Plus :size="15" aria-hidden="true" />
            <strong>{{ preset.label }}</strong>
            <span>{{ preset.description }}</span>
          </button>
        </div>

        <details class="review-order-custom-builder" open>
          <summary>内容を指定して追加</summary>
          <form @submit.prevent="addReviewOrder">
            <div class="review-order-form-grid">
              <label>
                <span>テーブル</span>
                <input v-model="reviewOrderDraft.tableNo" type="text" maxlength="12" aria-label="テーブル" required />
              </label>
              <label>
                <span>経過時間</span>
                <input v-model.number="reviewOrderDraft.elapsedMinutes" type="number" min="0" max="60" aria-label="経過時間" />
              </label>
              <label>
                <span>人数</span>
                <input v-model.number="reviewOrderDraft.guestCount" type="number" min="1" max="20" aria-label="人数" />
              </label>
              <label class="wide">
                <span>商品名</span>
                <input v-model="reviewOrderDraft.itemName" type="text" maxlength="40" aria-label="商品名" required />
              </label>
              <label>
                <span>商品数</span>
                <input v-model.number="reviewOrderDraft.itemCount" type="number" min="1" max="6" aria-label="商品数" />
              </label>
              <label>
                <span>各商品の数量</span>
                <input v-model.number="reviewOrderDraft.quantity" type="number" min="1" max="20" aria-label="各商品の数量" />
              </label>
              <label class="wide">
                <span>部門</span>
                <select v-model="reviewOrderDraft.categoryId" aria-label="部門">
                  <option v-for="category in reviewOrderCategoryOptions" :key="category.id" :value="category.id">
                    {{ category.label }}
                  </option>
                </select>
              </label>
              <label class="review-order-checkbox wide">
                <input v-model="reviewOrderDraft.courseEnabled" type="checkbox" aria-label="コース注文にする" />
                <span>コース注文にする</span>
              </label>
              <label v-if="reviewOrderDraft.courseEnabled" class="wide">
                <span>コース名</span>
                <input v-model="reviewOrderDraft.courseName" type="text" maxlength="30" aria-label="コース名" required />
              </label>
              <label>
                <span>トッピング数</span>
                <input v-model.number="reviewOrderDraft.toppingCount" type="number" min="0" max="20" aria-label="トッピング数" />
              </label>
              <label>
                <span>商品メモ文字数</span>
                <input v-model.number="reviewOrderDraft.itemMemoLength" type="number" min="0" max="500" aria-label="商品メモ文字数" />
              </label>
              <label>
                <span>注文メモ文字数</span>
                <input v-model.number="reviewOrderDraft.orderMemoLength" type="number" min="0" max="500" aria-label="注文メモ文字数" />
              </label>
            </div>
            <button
              class="review-order-add-button"
              type="submit"
              :disabled="reviewOrderLimitReached"
            >
              <Plus :size="16" aria-hidden="true" />
              この内容で追加
            </button>
          </form>
        </details>

        <div v-if="reviewOrderSummaries.length" class="review-order-added-list">
          <header>
            <div>
              <strong>追加済み {{ reviewOrderSummaries.length }}件</strong>
              <span>共有URLにも含まれます</span>
            </div>
            <button type="button" @click="comparison.clearReviewOrders">
              <Trash2 :size="14" aria-hidden="true" />
              全削除
            </button>
          </header>
          <article v-for="order in reviewOrderSummaries" :key="order.id">
            <div>
              <strong>{{ order.tableNo }}・{{ order.itemName }}</strong>
              <span>{{ order.features.join(' / ') }}</span>
            </div>
            <button
              type="button"
              :aria-label="`${order.tableNo}の追加注文を削除`"
              @click="comparison.removeReviewOrder(order.id)"
            >
              <X :size="16" aria-hidden="true" />
            </button>
          </article>
        </div>
        <p v-else class="review-order-empty">追加注文はありません</p>
        <small class="review-order-limit">最大{{ comparison.maxReviewOrderCount }}件</small>
      </section>

      <section class="comparison-control-section">
        <header class="comparison-section-heading">
          <div><span>06</span><h3>密度</h3></div>
          <p>列数・カード幅・行間を独立して試せます</p>
        </header>
        <div class="comparison-segmented-control" role="group" aria-label="カード列数">
          <button
            v-for="column in comparisonOptions.columnCounts"
            :key="column"
            type="button"
            :class="{ active: comparison.settings.columnCount === column }"
            :aria-pressed="comparison.settings.columnCount === column"
            @click="comparison.setField('columnCount', column)"
          >
            {{ column === 'auto' ? '自動' : `${column}列` }}
          </button>
        </div>
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
        <header class="comparison-section-heading">
          <div><span>07</span><h3>表示情報</h3></div>
          <p>数量表現とカード内に出す情報を比較します</p>
        </header>
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
              style.display.groupClass,
              { active: style.active },
            ]"
            @click="comparison.setField('quantityDisplayStyle', style.id)"
          >
            <strong>{{ style.label }}</strong>
            <span class="quantity-style-sample">
              <i class="sample-main">{{ style.display.primaryLabel }}</i>
              <i
                v-if="
                  style.display.showSourceTotal ||
                    style.display.showAggregateButton ||
                    style.display.showLeftAggregateTotal
                "
                class="sample-total"
              >
                {{ style.display.showSourceTotal
                  ? style.display.sourceTotalLabel
                  : style.display.showLeftAggregateTotal
                    ? style.display.leftAggregateTotalLabel
                    : style.display.aggregateLabel }}
              </i>
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
        <header class="comparison-section-heading">
          <div><span>08</span><h3>操作と時間</h3></div>
          <p>数量アクセス・完了方法・取消猶予・警告時刻を試します</p>
        </header>
        <label>
          <span>数量操作</span>
          <select
            :value="comparison.settings.quantityInteractionMode"
            @change="updateText('quantityInteractionMode', $event)"
          >
            <option
              v-for="mode in comparisonQuantityInteractionModeOptions"
              :key="mode.id"
              :value="mode.id"
            >
              {{ mode.label }}
            </option>
          </select>
        </label>
        <label>
          <span>商品タップ</span>
          <select :value="comparison.settings.itemTapMode" @change="updateText('itemTapMode', $event)">
            <option v-for="mode in comparisonItemTapModeOptions" :key="mode.id" :value="mode.id">
              {{ mode.label }}
            </option>
          </select>
        </label>
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
          <span>注文時間</span>
          <select
            :value="comparison.settings.orderTimeDisplayMode"
            @change="updateText('orderTimeDisplayMode', $event)"
          >
            <option
              v-for="mode in comparisonOrderTimeDisplayModeOptions"
              :key="mode.id"
              :value="mode.id"
            >
              {{ mode.label }}
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
