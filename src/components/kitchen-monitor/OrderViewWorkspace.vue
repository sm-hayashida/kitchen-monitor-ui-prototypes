<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { createOrderCardSegments } from '../../features/kitchen-monitor/orderCardSegments';
import {
  createOrderedMasonryPages,
  estimateOrderCardHeight,
} from '../../features/kitchen-monitor/orderMasonryLayout';
import { createScenarioOrders } from '../../features/kitchen-monitor/comparisonScenarios';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import { useColumnLayoutPreference } from '../../features/kitchen-monitor/useColumnLayoutPreference';
import { useKitchenMonitorSettings } from '../../features/kitchen-monitor/useKitchenMonitorSettings';
import { useOrderDepartmentSettings } from '../../features/kitchen-monitor/useOrderDepartmentSettings';
import {
  sortOrdersByPinned,
  useOrderLayoutPreferences,
} from '../../features/kitchen-monitor/useOrderLayoutPreferences';
import { useOrderViewMock } from '../../features/kitchen-monitor/useOrderViewMock';
import { useResponsiveColumnLayout } from '../../features/kitchen-monitor/useResponsiveColumnLayout';
import HeaderLayoutNavigation from './HeaderLayoutNavigation.vue';
import HorizontalColumnScroller from './HorizontalColumnScroller.vue';
import KitchenMonitorSettingsModal from './KitchenMonitorSettingsModal.vue';
import KitchenMonitorShell from './KitchenMonitorShell.vue';
import OrderViewCard from './OrderViewCard.vue';
import ProductAggregateModal from './ProductAggregateModal.vue';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
  layout: {
    type: String,
    required: true,
    validator: (value) => ['z', 'n-paged', 'n-scroll'].includes(value),
  },
});

defineEmits(['switch-view']);

const currentPage = ref(1);
const isSettingsOpen = ref(false);
const layoutBodyRef = ref(null);
const horizontalScrollerRef = ref(null);
const horizontalNavigation = ref({
  canNext: false,
  canPrevious: false,
  firstVisibleColumn: 0,
  lastVisibleColumn: 0,
  scrollProgress: 1,
  totalColumnCount: 0,
});
const isPaged = computed(() => props.layout === 'n-paged');
const isScroll = computed(() => props.layout === 'n-scroll');
const comparison = useComparisonStore();
const { ordersCleared, settings } = useKitchenMonitorSettings();
const scenarioOrders = computed(() => (
  ordersCleared.value
    ? []
    : [
      ...createScenarioOrders(comparison.settings.scenario),
      ...comparison.reviewOrders.value,
    ]
));
const comparisonPageClass = computed(() => [
  'order-view-layout',
  `comparison-columns-${columnCount.value}`,
  `comparison-rows-${comparison.settings.rowSpacing}`,
  comparison.settings.motion ? 'comparison-motion-on' : 'comparison-motion-off',
].join(' '));
const cardTransitionName = computed(() => comparison.settings.motion ? 'masonry-card' : '');
const cardEstimateOptions = computed(() => ({
  cardMinWidth: 230,
  rowSpacing: comparison.settings.rowSpacing,
  visibleInfo: comparison.settings.info,
}));
const { columnCountPreference } = useColumnLayoutPreference();
const { columnCount, columnHeight, isLayoutReady } = useResponsiveColumnLayout(layoutBodyRef, {
  contentInset: props.layout === 'z' ? 0 : 16,
  minColumnWidth: 230,
  preferredColumnCount: columnCountPreference,
});
const visibleJoinedTableNameLimit = computed(() => columnCount.value === 4 ? 2 : 3);

const {
  activeItemActionId,
  aggregateByKey,
  cancelItemCompletion,
  closeAggregate,
  closeItemAction,
  completeItemRemaining,
  completionStartedAt,
  completionWindowMs,
  itemCompletionStartedAt,
  itemCompletionWindowMs,
  nowMs,
  openAggregate,
  processedUnitNumbersByItemId,
  setItemProcessedQuantity,
  selectedAggregate,
  selectedAggregateSourceOrderId,
  selectedAggregateSourceOrderItemId,
  toast,
  toggleItemAction,
  toggleOrderCompletion,
  visibleOrders,
} = useOrderViewMock({
  initialOrders: scenarioOrders,
  orderCompletionDurationMs: computed(() => settings.hideCompletedSeconds * 1000),
  itemCompletionDurationMs: computed(() => settings.hideCompletedSeconds * 1000),
});
const {
  pinnedOrderIds,
  sortMode,
  togglePinned: toggleOrderPinnedPreference,
} = useOrderLayoutPreferences();

const {
  selectedCategoryIds,
  selectedDepartmentIds,
} = useOrderDepartmentSettings();

const departmentFilteredOrders = computed(() =>
  visibleOrders.value
    .map((order) => ({
      ...order,
      items: order.items.filter((orderItem) =>
        selectedCategoryIds.value.has(orderItem.category_id),
      ),
    }))
    .filter((order) => order.items.length > 0),
);
const sortedDepartmentFilteredOrders = computed(() =>
  sortOrdersByPinned(departmentFilteredOrders.value, pinnedOrderIds.value, sortMode.value),
);

const layoutOrders = computed(() =>
  createOrderCardSegments(sortedDepartmentFilteredOrders.value, props.layout, {
    maxCardHeight: columnHeight.value,
    estimateOptions: cardEstimateOptions.value,
  }),
);
const pagedOrderColumns = computed(() =>
  createOrderedMasonryPages(layoutOrders.value, {
    columnCount: columnCount.value,
    estimateCardHeight: (order) => estimateOrderCardHeight(order, cardEstimateOptions.value),
    maxColumnHeight: columnHeight.value,
  }),
);
const scrollOrderColumns = computed(() =>
  pagedOrderColumns.value.flat().filter((column) => column.length > 0),
);
const pageCount = computed(() => pagedOrderColumns.value.length);
const currentPageColumns = computed(() => {
  const pageIndex = Math.min(currentPage.value, pageCount.value) - 1;
  return pagedOrderColumns.value[pageIndex];
});
const displayedOrders = computed(() => {
  if (!isPaged.value) {
    return layoutOrders.value;
  }

  return currentPageColumns.value.flat();
});
const displayedOrderColumns = computed(() =>
  isPaged.value ? currentPageColumns.value : [displayedOrders.value],
);

watch(pageCount, (nextPageCount) => {
  currentPage.value = Math.min(currentPage.value, nextPageCount);
});

watch(selectedDepartmentIds, () => {
  resetOrderPosition();
});

function setPage(nextPage) {
  currentPage.value = Math.min(pageCount.value, Math.max(1, nextPage));
}

function updateHorizontalNavigation(state) {
  horizontalNavigation.value = state;
}

function scrollOrderByColumn(direction) {
  horizontalScrollerRef.value?.scrollByColumn(direction);
}

function scrollOrderByPage(direction) {
  horizontalScrollerRef.value?.scrollByPage(direction);
}

function resetOrderPosition() {
  currentPage.value = 1;
  nextTick(() => horizontalScrollerRef.value?.scrollToColumn(0, 'auto'));
}

function openAggregateForQuantityMode(request) {
  openAggregate(request.aggregateKey, {
    includeCompleted: true,
    sourceOrderId: request.orderId,
    sourceOrderItemId: request.orderItemId,
  });
}

function toggleOrderPinned(orderId) {
  const isPinned = toggleOrderPinnedPreference(orderId);
  if (!isPinned) {
    return;
  }

  resetOrderPosition();
}

</script>

<template>
  <KitchenMonitorShell
    :active-view="activeView"
    :categories="[]"
    external-settings
    :now-ms="nowMs"
    :page-class="comparisonPageClass"
    :show-navigation="false"
    :toast="toast"
    @open-settings="isSettingsOpen = true"
    @switch-view="$emit('switch-view', $event)"
  >
    <template #header-actions>
      <HeaderLayoutNavigation
        v-if="isScroll"
        mode="horizontal"
        :can-next="horizontalNavigation.canNext"
        :can-previous="horizontalNavigation.canPrevious"
        :first-visible-column="horizontalNavigation.firstVisibleColumn"
        :last-visible-column="horizontalNavigation.lastVisibleColumn"
        :scroll-progress="horizontalNavigation.scrollProgress"
        :total-column-count="horizontalNavigation.totalColumnCount"
        @previous-column="scrollOrderByColumn(-1)"
        @next-column="scrollOrderByColumn(1)"
        @previous-view="scrollOrderByPage(-1)"
        @next-view="scrollOrderByPage(1)"
      />
      <HeaderLayoutNavigation
        v-else-if="isPaged"
        mode="paged"
        :current-page="currentPage"
        :page-count="pageCount"
        @first-page="setPage(1)"
        @previous-page="setPage(currentPage - 1)"
        @next-page="setPage(currentPage + 1)"
        @last-page="setPage(pageCount)"
      />
      <label class="top-bar-sort-control" title="注文の並び順">
        <span class="visually-hidden">注文の並び順</span>
        <select v-model="sortMode" @change="resetOrderPosition">
          <option value="oldest">古い注文順</option>
          <option value="table">テーブル番号順</option>
          <option value="latest">新しい注文順</option>
        </select>
      </label>
    </template>

    <div
      class="order-view-scroll"
      :class="`order-layout-${layout}`"
      @click="closeItemAction"
    >
      <div ref="layoutBodyRef" class="order-layout-body" :class="layout">
        <HorizontalColumnScroller
          v-if="isLayoutReady && isScroll"
          ref="horizontalScrollerRef"
          class="order-horizontal-scroller"
          aria-label="注文一覧を横スクロール"
          :column-count="columnCount"
          :columns="scrollOrderColumns"
          @navigation-state-change="updateHorizontalNavigation"
        >
          <template #column="{ column }">
            <TransitionGroup
              tag="div"
              class="horizontal-column-stack"
              :name="cardTransitionName"
            >
              <OrderViewCard
                v-for="order in column"
                :key="order.id"
                :active-item-action-id="activeItemActionId"
                :aggregate-by-key="aggregateByKey"
                :completion-started-at="completionStartedAt[order.source_order_id ?? order.id]"
                :completion-window-ms="completionWindowMs"
                :item-completion-started-at="itemCompletionStartedAt"
                :item-completion-window-ms="itemCompletionWindowMs"
                :is-pinned="pinnedOrderIds.has(order.source_order_id ?? order.id)"
                :order="order"
                :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
                :table-name-limit="visibleJoinedTableNameLimit"
                @cancel-item-completion="cancelItemCompletion"
                @complete-item="completeItemRemaining"
                @complete-order="toggleOrderCompletion"
                @open-aggregate="openAggregateForQuantityMode"
                @set-item-processed-quantity="setItemProcessedQuantity"
                @toggle-item-action="toggleItemAction"
                @toggle-pinned="toggleOrderPinned"
              />
            </TransitionGroup>
          </template>
        </HorizontalColumnScroller>

        <div
          v-else-if="isLayoutReady"
          class="order-view-grid"
          :class="layout"
          :style="{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }"
        >
          <div
            v-for="(column, columnIndex) in displayedOrderColumns"
            :key="columnIndex"
            :class="isPaged ? 'order-masonry-column' : 'order-card-contents'"
          >
            <OrderViewCard
              v-for="order in column"
              :key="order.id"
              :active-item-action-id="activeItemActionId"
              :aggregate-by-key="aggregateByKey"
              :completion-started-at="completionStartedAt[order.source_order_id ?? order.id]"
              :completion-window-ms="completionWindowMs"
              :item-completion-started-at="itemCompletionStartedAt"
              :item-completion-window-ms="itemCompletionWindowMs"
              :is-pinned="pinnedOrderIds.has(order.source_order_id ?? order.id)"
              :order="order"
              :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
              :table-name-limit="visibleJoinedTableNameLimit"
              @cancel-item-completion="cancelItemCompletion"
              @complete-item="completeItemRemaining"
              @complete-order="toggleOrderCompletion"
              @open-aggregate="openAggregateForQuantityMode"
              @set-item-processed-quantity="setItemProcessedQuantity"
              @toggle-item-action="toggleItemAction"
              @toggle-pinned="toggleOrderPinned"
            />
          </div>
        </div>

        <p v-if="isLayoutReady && displayedOrders.length === 0" class="order-view-empty">
          設定された部門の未調理注文はありません
        </p>
      </div>

    </div>

    <ProductAggregateModal
      v-if="selectedAggregate"
      :aggregate="selectedAggregate"
      quantity-selection-enabled
      :source-order-id="selectedAggregateSourceOrderId"
      :source-order-item-id="selectedAggregateSourceOrderItemId"
      @close="closeAggregate"
      @set-item-processed-quantity="setItemProcessedQuantity"
    />

    <template #overlay>
      <KitchenMonitorSettingsModal
        v-if="isSettingsOpen"
        @close="isSettingsOpen = false"
      />
    </template>
  </KitchenMonitorShell>
</template>
