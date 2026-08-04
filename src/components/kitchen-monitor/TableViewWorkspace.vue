<script setup>
import { ArrowUpDown, LayoutGrid, ListFilter } from '@lucide/vue';
import { computed, nextTick, ref, watch } from 'vue';
import {
  createCompactFlowColumns,
  createOrderedMasonryPages,
} from '../../features/kitchen-monitor/orderMasonryLayout';
import { createScenarioOrders } from '../../features/kitchen-monitor/comparisonScenarios';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import {
  createTableCardSegments,
  createTableGroups,
  estimateTableCardHeight,
  groupTablesByCategory,
  sortTableGroups,
} from '../../features/kitchen-monitor/tableViewModel';
import { getOrderTimingStatus } from '../../features/kitchen-monitor/orderTimingStatus';
import { useColumnLayoutPreference } from '../../features/kitchen-monitor/useColumnLayoutPreference';
import { useOrderDepartmentSettings } from '../../features/kitchen-monitor/useOrderDepartmentSettings';
import { useOrderViewMock } from '../../features/kitchen-monitor/useOrderViewMock';
import { useResponsiveColumnLayout } from '../../features/kitchen-monitor/useResponsiveColumnLayout';
import { useTableLayoutPreferences } from '../../features/kitchen-monitor/useTableLayoutPreferences';
import HeaderLayoutNavigation from './HeaderLayoutNavigation.vue';
import HorizontalColumnScroller from './HorizontalColumnScroller.vue';
import KitchenMonitorShell from './KitchenMonitorShell.vue';
import OrderDepartmentSettingsModal from './OrderDepartmentSettingsModal.vue';
import ProductAggregateModal from './ProductAggregateModal.vue';
import TableViewCard from './TableViewCard.vue';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
  layout: {
    type: String,
    required: true,
    validator: (value) => ['n-paged', 'n-scroll'].includes(value),
  },
});

defineEmits(['switch-view']);

const currentPage = ref(1);
const isReorderMode = ref(false);
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
const activeTableCategoryId = ref('');
const isPaged = computed(() => props.layout === 'n-paged');
const comparison = useComparisonStore();
const quantitySelectionInAggregate = computed(
  () => comparison.settings.quantityInteractionMode === 'aggregate',
);
const scenarioOrders = computed(() => createScenarioOrders(comparison.settings.scenario));
const comparisonPageClass = computed(() => [
  'table-view-layout',
  `comparison-rows-${comparison.settings.rowSpacing}`,
  comparison.settings.motion ? 'comparison-motion-on' : 'comparison-motion-off',
].join(' '));
const cardTransitionName = computed(() => comparison.settings.motion ? 'masonry-card' : '');
const cardEstimateOptions = computed(() => ({
  cardMinWidth: comparison.settings.cardMinWidth,
  rowSpacing: comparison.settings.rowSpacing,
  visibleInfo: comparison.settings.info,
}));
const timingOptions = computed(() => ({
  targetMinutes: comparison.settings.targetMinutes,
  warningWindowMinutes: comparison.settings.warningMinutes,
}));
const { columnCountPreference, setColumnCountPreference } = useColumnLayoutPreference();
const { columnCount, columnHeight, isLayoutReady } = useResponsiveColumnLayout(layoutBodyRef, {
  contentInset: props.layout === 'n-scroll' ? 8 : 0,
  minColumnWidth: computed(() => comparison.settings.cardMinWidth),
  preferredColumnCount: columnCountPreference,
});

const {
  activeItemActionId,
  aggregateByKey,
  cancelItemCompletion,
  closeAggregate,
  closeItemAction,
  completeItemRemaining,
  hiddenCompletedItemIds,
  itemCompletionStartedAt,
  itemCompletionWindowMs,
  nowMs,
  openAggregate,
  processedUnitNumbersByItemId,
  setItemProcessedQuantity,
  selectedAggregate,
  toast,
  toggleItemAction,
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

const {
  manualOrder,
  moveTable,
  pinnedTableIds,
  setManualOrder,
  sortMode,
  tableGroupingEnabled,
  togglePinned,
} = useTableLayoutPreferences();
const isGroupedScroll = computed(() => !isPaged.value && tableGroupingEnabled.value);

const departmentFilteredOrders = computed(() =>
  visibleOrders.value
    .map((order) => ({
      ...order,
      items: order.items.filter(
        (orderItem) =>
          selectedCategoryIds.value.has(orderItem.category_id) &&
          !hiddenCompletedItemIds.value.has(orderItem.order_item_id),
      ),
    }))
    .filter((order) => order.items.length > 0),
);
const tableGroups = computed(() => createTableGroups(departmentFilteredOrders.value));
const globallySortedTableGroups = computed(() =>
  sortTableGroups(tableGroups.value, {
    pinnedTableIds: pinnedTableIds.value,
    manualOrder: manualOrder.value,
    sortMode: sortMode.value,
  }),
);
const sortedTableCategoryGroups = computed(() =>
  groupTablesByCategory(tableGroups.value).map((group) => ({
    ...group,
    tables: sortTableGroups(group.tables, {
      pinnedTableIds: pinnedTableIds.value,
      manualOrder: manualOrder.value,
      sortMode: sortMode.value,
    }),
  })),
);
const sortedTableGroups = computed(() =>
  isGroupedScroll.value
    ? sortedTableCategoryGroups.value.flatMap((group) => group.tables)
    : globallySortedTableGroups.value,
);
const tableSegments = computed(() =>
  createTableCardSegments(globallySortedTableGroups.value, {
    maxCardHeight: columnHeight.value,
    estimateOptions: cardEstimateOptions.value,
  }),
);
const pagedTableColumns = computed(() =>
  createOrderedMasonryPages(tableSegments.value, {
    columnCount: columnCount.value,
    estimateCardHeight: (table) => estimateTableCardHeight(table, cardEstimateOptions.value),
    maxColumnHeight: columnHeight.value,
  }),
);
const scrollTableColumns = computed(() =>
  isGroupedScroll.value
    ? groupedScrollLayout.value.columns
    : pagedTableColumns.value.flat().filter((column) => column.length > 0),
);
const scrollTableColumnMeta = computed(() =>
  isGroupedScroll.value ? groupedScrollLayout.value.columnMeta : [],
);
const tableCategoryIndex = computed(() =>
  isGroupedScroll.value ? groupedScrollLayout.value.groups : [],
);
const pageCount = computed(() => pagedTableColumns.value.length);
const currentPageColumns = computed(() => {
  const pageIndex = Math.min(currentPage.value, pageCount.value) - 1;
  return pagedTableColumns.value[pageIndex];
});
const orderedTableIds = computed(() => sortedTableGroups.value.map((table) => table.id));

const groupedScrollLayout = computed(() => {
  const columns = [];
  const columnMeta = [];
  const groups = [];
  const groupedColumnHeight = Math.max(260, columnHeight.value - 34);

  sortedTableCategoryGroups.value.forEach((group, groupIndex) => {
    const segments = createTableCardSegments(group.tables, {
      maxCardHeight: groupedColumnHeight,
      estimateOptions: cardEstimateOptions.value,
    });
    const groupColumns = createCompactFlowColumns(segments, {
      estimateCardHeight: (table) => estimateTableCardHeight(table, cardEstimateOptions.value),
      maxColumnHeight: groupedColumnHeight,
    });
    const startColumnIndex = columns.length;
    const overdueTableCount = group.tables.filter(
      (table) => getOrderTimingStatus(table.earliest_elapsed_minutes, timingOptions.value).isOverdue,
    ).length;
    const warningTableCount = group.tables.filter(
      (table) => getOrderTimingStatus(table.earliest_elapsed_minutes, timingOptions.value).isWarning,
    ).length;

    groups.push({
      id: group.id,
      name: group.name,
      startColumnIndex,
      columnCount: groupColumns.length,
      tableCount: group.tables.length,
      overdueTableCount,
      warningTableCount,
    });

    groupColumns.forEach((column, columnIndex) => {
      columns.push(column);
      columnMeta.push({
        id: group.id,
        name: group.name,
        tableCount: group.tables.length,
        overdueTableCount,
        warningTableCount,
        isStart: columnIndex === 0,
        isEnd: columnIndex === groupColumns.length - 1,
        toneClass: `column-group-tone-${groupIndex % 3}`,
      });
    });
  });

  return { columns, columnMeta, groups };
});

watch(pageCount, (nextPageCount) => {
  currentPage.value = Math.min(currentPage.value, nextPageCount);
});

watch(selectedDepartmentIds, () => {
  currentPage.value = 1;
});

watch(
  tableCategoryIndex,
  (groups) => {
    if (!groups.some((group) => group.id === activeTableCategoryId.value)) {
      activeTableCategoryId.value = groups[0]?.id ?? '';
    }
  },
  { immediate: true },
);

function setPage(nextPage) {
  currentPage.value = Math.min(pageCount.value, Math.max(1, nextPage));
}

function updateHorizontalNavigation(state) {
  horizontalNavigation.value = state;
}

function scrollTableByColumn(direction) {
  horizontalScrollerRef.value?.scrollByColumn(direction);
}

function openAggregateForQuantityMode(aggregateKey) {
  openAggregate(aggregateKey, { includeCompleted: quantitySelectionInAggregate.value });
}

function toggleReorderMode() {
  if (!isReorderMode.value) {
    setManualOrder(orderedTableIds.value);
    sortMode.value = 'manual';
    closeAggregate();
    closeItemAction();
  }

  isReorderMode.value = !isReorderMode.value;
  currentPage.value = 1;
}

function moveTableInOrder(tableId, direction) {
  moveTable(tableId, direction);
  currentPage.value = 1;
}

function setTableItemProcessedQuantity(payload) {
  setItemProcessedQuantity({ ...payload, hideWhenComplete: true });
}

function completeTableItemRemaining(orderItemId) {
  completeItemRemaining(orderItemId, { hideWhenComplete: true });
}

function canMoveTable(tableId, direction) {
  const currentIndex = orderedTableIds.value.indexOf(tableId);
  const targetTableId = orderedTableIds.value[currentIndex + direction];
  const currentTable = sortedTableGroups.value[currentIndex];
  const targetTable = sortedTableGroups.value[currentIndex + direction];

  if (!targetTableId || !currentTable || !targetTable) {
    return false;
  }

  if (isGroupedScroll.value && currentTable.table_category !== targetTable.table_category) {
    return false;
  }

  return pinnedTableIds.value.has(tableId) === pinnedTableIds.value.has(targetTableId);
}

function toggleTablePinned(tableId) {
  togglePinned(tableId);
  currentPage.value = 1;
}

function saveDepartmentSettings(departmentIds, preferences = {}) {
  saveDepartments(departmentIds);
  if (preferences.columnCountPreference !== undefined) {
    setColumnCountPreference(preferences.columnCountPreference);
  }
  if (typeof preferences.tableGroupingEnabled === 'boolean') {
    tableGroupingEnabled.value = preferences.tableGroupingEnabled;
  }
  closeAggregate();
  closeItemAction();
  isSettingsOpen.value = false;
}

async function jumpToTableCategory(event) {
  const groupId = event.target.value;
  const targetGroup = tableCategoryIndex.value.find((group) => group.id === groupId);

  activeTableCategoryId.value = groupId;
  await nextTick();
  horizontalScrollerRef.value?.scrollToColumn(targetGroup?.startColumnIndex ?? 0, 'auto');
}

function syncActiveTableCategory(columnIndex) {
  const activeGroup = tableCategoryIndex.value.find(
    (group) =>
      columnIndex >= group.startColumnIndex &&
      columnIndex < group.startColumnIndex + group.columnCount,
  );

  if (activeGroup) {
    activeTableCategoryId.value = activeGroup.id;
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
        v-if="!isPaged"
        mode="horizontal"
        :can-next="horizontalNavigation.canNext"
        :can-previous="horizontalNavigation.canPrevious"
        :first-visible-column="horizontalNavigation.firstVisibleColumn"
        :last-visible-column="horizontalNavigation.lastVisibleColumn"
        :scroll-progress="horizontalNavigation.scrollProgress"
        :total-column-count="horizontalNavigation.totalColumnCount"
        @previous-column="scrollTableByColumn(-1)"
        @next-column="scrollTableByColumn(1)"
      />
      <label v-if="isGroupedScroll" class="top-bar-group-control" title="テーブルカテゴリ">
        <LayoutGrid :size="17" :stroke-width="2.2" aria-hidden="true" />
        <span class="visually-hidden">テーブルカテゴリ</span>
        <select :value="activeTableCategoryId" @change="jumpToTableCategory">
          <option v-for="group in tableCategoryIndex" :key="group.id" :value="group.id">
            {{ group.name }} {{ group.tableCount }}卓
          </option>
        </select>
      </label>
      <label class="top-bar-sort-control" title="並び順">
        <span class="visually-hidden">並び順</span>
        <select v-model="sortMode" :disabled="isReorderMode" @change="currentPage = 1">
          <option value="oldest">最古注文順</option>
          <option value="table">テーブル番号順</option>
          <option value="latest">最終追加順</option>
          <option value="manual">手動順</option>
        </select>
      </label>
      <button
        class="top-bar-icon-button"
        :class="{ active: isReorderMode }"
        type="button"
        :aria-pressed="isReorderMode"
        :aria-label="isReorderMode ? '並び替えを完了' : '並び替えを開始'"
        :title="isReorderMode ? '並び替え完了' : '並び替え'"
        @click="toggleReorderMode"
      >
        <ArrowUpDown :size="18" :stroke-width="2.2" aria-hidden="true" />
      </button>
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
      class="table-view-workspace"
      :class="`table-layout-${layout}`"
      @click="closeItemAction"
    >
      <div ref="layoutBodyRef" class="table-layout-body">
        <HorizontalColumnScroller
          v-if="isLayoutReady && !isPaged"
          ref="horizontalScrollerRef"
          class="table-horizontal-scroller"
          aria-label="テーブル一覧を横スクロール"
          :align-last-column-to-start="isGroupedScroll"
          :column-count="columnCount"
          :column-meta="scrollTableColumnMeta"
          :columns="scrollTableColumns"
          @navigation-state-change="updateHorizontalNavigation"
          @visible-column-change="syncActiveTableCategory"
        >
          <template #column-header="{ meta }">
            <header v-if="meta?.isStart" class="table-category-column-header">
              <div>
                <strong>{{ meta.name }}</strong>
                <span>{{ meta.tableCount }}卓</span>
              </div>
              <div class="table-category-status">
                <small v-if="meta.overdueTableCount > 0" class="overdue">
                  超過 {{ meta.overdueTableCount }}卓
                </small>
                <small v-if="meta.warningTableCount > 0" class="warning">
                  間近 {{ meta.warningTableCount }}卓
                </small>
              </div>
            </header>
          </template>
          <template #column="{ column }">
            <TransitionGroup
              tag="div"
              class="horizontal-column-stack"
              :name="cardTransitionName"
            >
              <TableViewCard
                v-for="table in column"
                :key="table.id"
                :active-item-action-id="activeItemActionId"
                :aggregate-by-key="aggregateByKey"
                :can-move-next="canMoveTable(table.source_table_id, 1)"
                :can-move-previous="canMoveTable(table.source_table_id, -1)"
                :is-pinned="pinnedTableIds.has(table.source_table_id)"
                :is-reorder-mode="isReorderMode"
                :item-completion-started-at="itemCompletionStartedAt"
                :item-completion-window-ms="itemCompletionWindowMs"
                :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
                :table="table"
                @cancel-item-completion="cancelItemCompletion"
                @complete-item="completeTableItemRemaining"
                @move-table="moveTableInOrder(table.source_table_id, $event)"
                @open-aggregate="openAggregateForQuantityMode"
                @set-item-processed-quantity="setTableItemProcessedQuantity"
                @toggle-item-action="toggleItemAction"
                @toggle-pinned="toggleTablePinned"
              />
            </TransitionGroup>
          </template>
        </HorizontalColumnScroller>

        <div
          v-else-if="isLayoutReady"
          class="table-view-grid"
          :style="{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }"
        >
          <div
            v-for="(column, columnIndex) in currentPageColumns"
            :key="columnIndex"
            class="order-masonry-column"
          >
            <TableViewCard
              v-for="table in column"
              :key="table.id"
              :active-item-action-id="activeItemActionId"
              :aggregate-by-key="aggregateByKey"
              :can-move-next="canMoveTable(table.source_table_id, 1)"
              :can-move-previous="canMoveTable(table.source_table_id, -1)"
              :is-pinned="pinnedTableIds.has(table.source_table_id)"
              :is-reorder-mode="isReorderMode"
              :item-completion-started-at="itemCompletionStartedAt"
              :item-completion-window-ms="itemCompletionWindowMs"
              :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
              :table="table"
              @cancel-item-completion="cancelItemCompletion"
              @complete-item="completeTableItemRemaining"
              @move-table="moveTableInOrder(table.source_table_id, $event)"
              @open-aggregate="openAggregateForQuantityMode"
              @set-item-processed-quantity="setTableItemProcessedQuantity"
              @toggle-item-action="toggleItemAction"
              @toggle-pinned="toggleTablePinned"
            />
          </div>
        </div>

        <p v-if="isLayoutReady && tableGroups.length === 0" class="order-view-empty">
          設定された部門の未調理テーブルはありません
        </p>
      </div>

      <footer v-if="isPaged" class="order-view-pagination table-view-pagination">
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
      :quantity-selection-enabled="quantitySelectionInAggregate"
      @close="closeAggregate"
      @set-item-processed-quantity="setTableItemProcessedQuantity"
    />

    <template #overlay>
      <OrderDepartmentSettingsModal
        v-if="isSettingsOpen"
        :active-view="activeView"
        :column-count-preference="columnCountPreference"
        :departments="departments"
        :selected-department-ids="selectedDepartmentIds"
        show-table-grouping-option
        :table-grouping-enabled="tableGroupingEnabled"
        @close="isSettingsOpen = false"
        @save="saveDepartmentSettings"
        @switch-view="$emit('switch-view', $event)"
      />
    </template>
  </KitchenMonitorShell>
</template>
