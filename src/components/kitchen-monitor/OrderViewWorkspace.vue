<script setup>
import { ListFilter } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { createOrderCardSegments } from '../../features/kitchen-monitor/orderCardSegments';
import { createOrderedMasonryPages } from '../../features/kitchen-monitor/orderMasonryLayout';
import { useColumnLayoutPreference } from '../../features/kitchen-monitor/useColumnLayoutPreference';
import { useOrderDepartmentSettings } from '../../features/kitchen-monitor/useOrderDepartmentSettings';
import { useOrderViewMock } from '../../features/kitchen-monitor/useOrderViewMock';
import { useResponsiveColumnLayout } from '../../features/kitchen-monitor/useResponsiveColumnLayout';
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
const isPaged = computed(() => props.layout === 'n-paged');
const isScroll = computed(() => props.layout === 'n-scroll');
const { columnCountPreference, setColumnCountPreference } = useColumnLayoutPreference();
const { columnCount, columnHeight, isLayoutReady } = useResponsiveColumnLayout(layoutBodyRef, {
  contentInset: props.layout === 'n-scroll' ? 8 : 0,
  preferredColumnCount: columnCountPreference,
  reservedHeight: props.layout === 'n-scroll' ? 44 : 0,
});

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
  toast,
  toggleItemAction,
  toggleOrderCompletion,
  visibleOrders,
} = useOrderViewMock();

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
  }),
);
const pagedOrderColumns = computed(() =>
  createOrderedMasonryPages(layoutOrders.value, {
    columnCount: columnCount.value,
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

function saveDepartmentSettings(departmentIds, preferences = {}) {
  saveDepartments(departmentIds);
  if (preferences.columnCountPreference !== undefined) {
    setColumnCountPreference(preferences.columnCountPreference);
  }
  closeAggregate();
  closeItemAction();
  isSettingsOpen.value = false;
}
</script>

<template>
  <KitchenMonitorShell
    :active-view="activeView"
    :categories="[]"
    external-settings
    :now-ms="nowMs"
    page-class="order-view-layout"
    :show-navigation="false"
    :toast="toast"
    @open-settings="isSettingsOpen = true"
    @switch-view="$emit('switch-view', $event)"
  >
    <template #header-actions>
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
      class="order-view-scroll"
      :class="`order-layout-${layout}`"
      @click="closeItemAction"
    >
      <div ref="layoutBodyRef" class="order-layout-body" :class="layout">
        <HorizontalColumnScroller
          v-if="isLayoutReady && isScroll"
          class="order-horizontal-scroller"
          aria-label="注文一覧を横スクロール"
          :column-count="columnCount"
          :columns="scrollOrderColumns"
        >
          <template #column="{ column }">
            <TransitionGroup
              tag="div"
              class="horizontal-column-stack"
              name="masonry-card"
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
                :order="order"
                :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
                @cancel-item-completion="cancelItemCompletion"
                @complete-item="completeItemRemaining"
                @complete-order="toggleOrderCompletion"
                @open-aggregate="openAggregate"
                @set-item-processed-quantity="setItemProcessedQuantity"
                @toggle-item-action="toggleItemAction"
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
              :order="order"
              :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
              @cancel-item-completion="cancelItemCompletion"
              @complete-item="completeItemRemaining"
              @complete-order="toggleOrderCompletion"
              @open-aggregate="openAggregate"
              @set-item-processed-quantity="setItemProcessedQuantity"
              @toggle-item-action="toggleItemAction"
            />
          </div>
        </div>

        <p v-if="isLayoutReady && displayedOrders.length === 0" class="order-view-empty">
          設定された部門の未調理注文はありません
        </p>
      </div>

      <footer v-if="isPaged" class="order-view-pagination">
        <button
          type="button"
          aria-label="最初のページ"
          title="最初のページ"
          :disabled="currentPage === 1"
          @click="setPage(1)"
        >
          «
        </button>
        <button
          type="button"
          aria-label="前のページ"
          title="前のページ"
          :disabled="currentPage === 1"
          @click="setPage(currentPage - 1)"
        >
          ‹
        </button>
        <strong>{{ currentPage }} / {{ pageCount }}</strong>
        <button
          type="button"
          aria-label="次のページ"
          title="次のページ"
          :disabled="currentPage === pageCount"
          @click="setPage(currentPage + 1)"
        >
          ›
        </button>
        <button
          type="button"
          aria-label="最後のページ"
          title="最後のページ"
          :disabled="currentPage === pageCount"
          @click="setPage(pageCount)"
        >
          »
        </button>
      </footer>
    </div>

    <ProductAggregateModal
      v-if="selectedAggregate"
      :aggregate="selectedAggregate"
      @close="closeAggregate"
    />

    <template #overlay>
      <OrderDepartmentSettingsModal
        v-if="isSettingsOpen"
        :active-view="activeView"
        :column-count-preference="columnCountPreference"
        :departments="departments"
        :selected-department-ids="selectedDepartmentIds"
        @close="isSettingsOpen = false"
        @save="saveDepartmentSettings"
        @switch-view="$emit('switch-view', $event)"
      />
    </template>
  </KitchenMonitorShell>
</template>
