<script setup>
import { ListFilter } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import {
  createOrderCardSegments,
  estimateOrderCardHeight,
} from '../../features/kitchen-monitor/orderCardSegments';
import { createOrderedMasonryPages } from '../../features/kitchen-monitor/orderMasonryLayout';
import { createScenarioOrders } from '../../features/kitchen-monitor/comparisonScenarios';
import { decideItemBodyAction } from '../../features/kitchen-monitor/itemActionRules';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import { useOrderDepartmentSettings } from '../../features/kitchen-monitor/useOrderDepartmentSettings';
import { useOrderViewMock } from '../../features/kitchen-monitor/useOrderViewMock';
import { useResponsiveColumnLayout } from '../../features/kitchen-monitor/useResponsiveColumnLayout';
import HeaderLayoutNavigation from './HeaderLayoutNavigation.vue';
import HorizontalColumnScroller from './HorizontalColumnScroller.vue';
import KitchenMonitorShell from './KitchenMonitorShell.vue';
import OrderDepartmentSettingsModal from './OrderDepartmentSettingsModal.vue';
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
const layoutScrollRef = ref(null);
const horizontalScrollerRef = ref(null);
const horizontalNavigation = ref({
  canNext: false,
  canPrevious: false,
  firstVisibleColumn: 0,
  lastVisibleColumn: 0,
  scrollProgress: 1,
  totalColumnCount: 0,
});
const comparison = useComparisonStore();
const scenarioOrders = computed(() => createScenarioOrders(comparison.settings.scenario));
const comparisonPageClass = computed(() => [
  'order-view-layout',
  `comparison-rows-${comparison.settings.rowSpacing}`,
  comparison.settings.motion ? 'comparison-motion-on' : 'comparison-motion-off',
].join(' '));
const cardTransitionName = computed(() =>
  comparison.settings.motion ? 'masonry-card' : '',
);
const cardEstimateOptions = computed(() => ({
  cardMinWidth: comparison.settings.cardMinWidth,
  rowSpacing: comparison.settings.rowSpacing,
  visibleInfo: comparison.settings.info,
}));
const isPaged = computed(() => props.layout === 'n-paged');
const isScroll = computed(() => props.layout === 'n-scroll');
const layoutHeightTargetRef = computed(() =>
  props.layout === 'z' ? layoutScrollRef.value : layoutBodyRef.value,
);
const layoutContentInset = computed(() => {
  if (props.layout === 'z') {
    return 26;
  }
  return props.layout === 'n-scroll' ? 8 : 0;
});
const { columnCount, columnHeight, isLayoutReady } = useResponsiveColumnLayout(layoutBodyRef, {
  contentInset: layoutContentInset,
  heightTargetRef: layoutHeightTargetRef,
  minColumnWidth: computed(() => comparison.settings.cardMinWidth),
});

const {
  activeItemActionId,
  aggregateByKey,
  applyAggregateSelections,
  cancelTableItemCompletion,
  closeAggregate,
  closeItemAction,
  completeItemRemaining,
  completionDurationByOrderId,
  completionStartedAt,
  completionWindowMs,
  itemCompletionDurationByItemId,
  itemCompletionStartedAt,
  itemCompletionWindowMs,
  nowMs,
  openAggregate,
  openAggregateForItem,
  processedUnitNumbersByItemId,
  selectedAggregate,
  selectedAggregateOriginItemId,
  toast,
  toggleOrderCompletion,
  visibleOrders,
} = useOrderViewMock({
  initialOrders: scenarioOrders,
  orderCompletionDurationMs: computed(() => comparison.settings.orderUndoMs),
  itemCompletionDurationMs: computed(() => comparison.settings.itemHideMs),
});

const {
  departments,
  saveDepartments,
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

const layoutOrders = computed(() =>
  createOrderCardSegments(departmentFilteredOrders.value, props.layout, {
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
  currentPage.value = 1;
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

function saveDepartmentSettings(departmentIds) {
  saveDepartments(departmentIds);
  closeAggregate();
  closeItemAction();
  isSettingsOpen.value = false;
}

function activateOrderItem(payload) {
  const action = decideItemBodyAction({
    itemTapMode: comparison.settings.itemTapMode,
    remainingCount: payload.remainingCount,
  });

  if (action === 'complete-remaining') {
    completeItemRemaining(payload.orderItemId);
  } else if (action === 'open-modal') {
    openAggregateForItem(payload.orderItemId);
  }
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
      />
      <HeaderLayoutNavigation
        v-if="isPaged"
        mode="paged"
        :current-page="currentPage"
        :page-count="pageCount"
        @first-page="setPage(1)"
        @previous-page="setPage(currentPage - 1)"
        @next-page="setPage(currentPage + 1)"
        @last-page="setPage(pageCount)"
      />
      <button
        class="top-bar-icon-button top-bar-filter-button"
        type="button"
        aria-label="表示部門を変更"
        title="表示部門"
        @click="isSettingsOpen = true"
      >
        <ListFilter :size="18" :stroke-width="2.2" aria-hidden="true" />
        <span>{{ selectedDepartmentIds.length }}</span>
      </button>
    </template>

    <div
      ref="layoutScrollRef"
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
                :completion-window-ms="completionDurationByOrderId[order.source_order_id ?? order.id] ?? completionWindowMs"
                :item-completion-started-at="itemCompletionStartedAt"
                :item-completion-duration-by-item-id="itemCompletionDurationByItemId"
                :item-completion-window-ms="itemCompletionWindowMs"
                :order="order"
                :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
                @activate-item="activateOrderItem"
                @cancel-item-completion="cancelTableItemCompletion"
                @complete-order="toggleOrderCompletion"
                @open-aggregate="openAggregate"
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
              :completion-window-ms="completionDurationByOrderId[order.source_order_id ?? order.id] ?? completionWindowMs"
              :item-completion-started-at="itemCompletionStartedAt"
              :item-completion-duration-by-item-id="itemCompletionDurationByItemId"
              :item-completion-window-ms="itemCompletionWindowMs"
              :order="order"
              :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
              @activate-item="activateOrderItem"
              @cancel-item-completion="cancelTableItemCompletion"
              @complete-order="toggleOrderCompletion"
              @open-aggregate="openAggregate"
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
      :origin-order-item-id="selectedAggregateOriginItemId"
      @apply-selections="applyAggregateSelections"
      @close="closeAggregate"
    />

    <template #overlay>
      <OrderDepartmentSettingsModal
        v-if="isSettingsOpen"
        :active-view="activeView"
        :departments="departments"
        :selected-department-ids="selectedDepartmentIds"
        @close="isSettingsOpen = false"
        @save="saveDepartmentSettings"
        @switch-view="$emit('switch-view', $event)"
      />
    </template>
  </KitchenMonitorShell>
</template>
