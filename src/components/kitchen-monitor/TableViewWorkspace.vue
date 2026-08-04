<script setup>
import { ArrowUpDown, LayoutGrid, ListFilter } from '@lucide/vue';
import { computed, nextTick, ref, watch } from 'vue';
import {
  createCompactFlowColumns,
  createOrderedMasonryPages,
} from '../../features/kitchen-monitor/orderMasonryLayout';
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
import HorizontalColumnScroller from './HorizontalColumnScroller.vue';
import KitchenMonitorShell from './KitchenMonitorShell.vue';
import OrderDepartmentSettingsModal from './OrderDepartmentSettingsModal.vue';
import OrderItemDetailPopover from './OrderItemDetailPopover.vue';
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
const activeTableCategoryId = ref('');
const isPaged = computed(() => props.layout === 'n-paged');
const { columnCountPreference, setColumnCountPreference } = useColumnLayoutPreference();
const { columnCount, columnHeight, isLayoutReady } = useResponsiveColumnLayout(layoutBodyRef, {
  contentInset: props.layout === 'n-scroll' ? 8 : 0,
  preferredColumnCount: columnCountPreference,
  reservedHeight: props.layout === 'n-scroll' ? 44 : 0,
});

const {
  activeItemActionId,
  aggregateByKey,
  cancelTableItemCompletion,
  closeAggregate,
  closeItemDetail,
  closeItemAction,
  hiddenCompletedItemIds,
  itemCompletionStartedAt,
  itemCompletionWindowMs,
  nowMs,
  openAggregate,
  openItemDetail,
  processedUnitNumbersByItemId,
  setItemProcessedQuantity,
  selectedAggregate,
  selectedItemAnchor,
  selectedItemDetail,
  toast,
  toggleItemAction,
  visibleOrders,
} = useOrderViewMock();

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
  }),
);
const pagedTableColumns = computed(() =>
  createOrderedMasonryPages(tableSegments.value, {
    columnCount: columnCount.value,
    estimateCardHeight: estimateTableCardHeight,
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
    });
    const groupColumns = createCompactFlowColumns(segments, {
      estimateCardHeight: estimateTableCardHeight,
      maxColumnHeight: groupedColumnHeight,
    });
    const startColumnIndex = columns.length;
    const overdueTableCount = group.tables.filter(
      (table) => getOrderTimingStatus(table.earliest_elapsed_minutes).isOverdue,
    ).length;
    const warningTableCount = group.tables.filter(
      (table) => getOrderTimingStatus(table.earliest_elapsed_minutes).isWarning,
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
    page-class="table-view-layout"
    :show-navigation="false"
    :toast="toast"
    @open-settings="isSettingsOpen = true"
    @switch-view="$emit('switch-view', $event)"
  >
    <template #header-actions>
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
              name="masonry-card"
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
                @cancel-item-completion="cancelTableItemCompletion"
                @move-table="moveTableInOrder(table.source_table_id, $event)"
                @open-aggregate="openAggregate"
                @open-item-detail="openItemDetail"
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
              @cancel-item-completion="cancelTableItemCompletion"
              @move-table="moveTableInOrder(table.source_table_id, $event)"
              @open-aggregate="openAggregate"
              @open-item-detail="openItemDetail"
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
      @close="closeAggregate"
    />

    <OrderItemDetailPopover
      v-if="selectedItemDetail && selectedItemAnchor"
      :anchor-rect="selectedItemAnchor"
      :detail="selectedItemDetail"
      hide-when-complete
      @close="closeItemDetail"
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
