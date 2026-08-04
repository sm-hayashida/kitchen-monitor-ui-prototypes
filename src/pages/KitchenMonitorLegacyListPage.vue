<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import KitchenMonitorSettingsModal from '../components/kitchen-monitor/KitchenMonitorSettingsModal.vue';
import KitchenMonitorShell from '../components/kitchen-monitor/KitchenMonitorShell.vue';
import { createScenarioOrders } from '../features/kitchen-monitor/comparisonScenarios';
import { useComparisonStore } from '../features/kitchen-monitor/comparisonState';
import { useKitchenMonitorSettings } from '../features/kitchen-monitor/useKitchenMonitorSettings';
import { useOrderDepartmentSettings } from '../features/kitchen-monitor/useOrderDepartmentSettings';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

defineEmits(['switch-view']);

const cancelledItemIds = new Set(['1004-2']);
const cookedItemIds = new Set(['1005-2']);
const servedItemIds = new Set(['1008-2']);
const comparison = useComparisonStore();
const { ordersCleared, settings } = useKitchenMonitorSettings();
const { selectedCategoryIds } = useOrderDepartmentSettings();
const isSettingsOpen = ref(false);
const sortField = ref('ordered_date');
const sortDirection = ref(settings.sortOrder === 'newest' ? 'asc' : 'desc');
const completionStartedAt = reactive({});
const removedItemIds = ref(new Set());
const nowMs = ref(Date.now());
const toast = ref('');
const completionTimers = new Map();
let toastTimer;

const clockTimer = window.setInterval(() => {
  nowMs.value = Date.now();
}, 100);

const sourceOrders = computed(() => (
  ordersCleared.value
    ? []
    : [
      ...createScenarioOrders(comparison.settings.scenario),
      ...comparison.reviewOrders.value,
    ]
));

const rows = computed(() => sourceOrders.value
  .flatMap((order) => order.items
    .filter((item) => selectedCategoryIds.value.has(item.category_id))
    .map((item) => ({
      id: item.order_item_id,
      tableNo: order.table_no,
      elapsedMinutes: order.ordered_elapsed_minutes,
      courseName: item.course_name ?? '',
      name: item.name,
      kitchenPrintName: item.kitchen_print_name ?? '',
      memo: item.memo ?? '',
      toppings: item.toppings ?? [],
      quantity: item.quantity,
      status: resolveLegacyStatus(item.order_item_id),
    })))
  .filter((row) => !removedItemIds.value.has(row.id))
  .sort(compareRows));

const visibleColumnCount = computed(() => 5
  + (settings.showCourseName ? 1 : 0)
  + (settings.showToppings ? 1 : 0));

watch(
  () => settings.sortOrder,
  (value) => {
    sortField.value = 'ordered_date';
    sortDirection.value = value === 'newest' ? 'asc' : 'desc';
  },
);

function resolveLegacyStatus(itemId) {
  if (cancelledItemIds.has(itemId)) return 'canceled';
  if (servedItemIds.has(itemId)) return 'served';
  if (cookedItemIds.has(itemId)) return 'cooked';
  return 'started';
}

function compareRows(left, right) {
  const direction = sortDirection.value === 'asc' ? 1 : -1;
  const fieldValue = (row) => {
    if (sortField.value === 'name') return row.tableNo;
    if (sortField.value === 'course_name') return row.courseName;
    if (sortField.value === 'menu') return row.name;
    return row.elapsedMinutes;
  };
  return String(fieldValue(left)).localeCompare(String(fieldValue(right)), 'ja', { numeric: true }) * direction;
}

function toggleSort(field) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  sortField.value = field;
  sortDirection.value = field === 'ordered_date' ? 'desc' : 'asc';
}

function rowClass(row) {
  return {
    'tr-danger': row.status === 'started' && row.elapsedMinutes >= comparison.settings.targetMinutes,
    'tr-warning': row.status === 'cooked' || row.status === 'canceled',
    'tr-inactive': row.status === 'canceled',
  };
}

function toggleCompletion(row) {
  if (completionStartedAt[row.id]) {
    window.clearTimeout(completionTimers.get(row.id));
    completionTimers.delete(row.id);
    delete completionStartedAt[row.id];
    showToast('調理済みを取り消しました');
    return;
  }

  const durationMs = settings.hideCompletedSeconds * 1000;
  completionStartedAt[row.id] = Date.now();
  completionTimers.set(row.id, window.setTimeout(() => finishCompletion(row), durationMs));
  showToast(`${settings.hideCompletedSeconds}秒以内なら取り消せます`);
}

function finishCompletion(row) {
  const nextRemovedIds = new Set(removedItemIds.value);
  nextRemovedIds.add(row.id);
  removedItemIds.value = nextRemovedIds;
  completionTimers.delete(row.id);
  delete completionStartedAt[row.id];
  showToast(`${row.name}を調理済みにしました`);
}

function completionProgress(rowId) {
  const startedAt = completionStartedAt[rowId];
  if (!startedAt) return 0;
  return Math.min(1, (nowMs.value - startedAt) / (settings.hideCompletedSeconds * 1000));
}

function showManualAddNotice() {
  showToast('注文追加は右下の比較ラボから操作できます');
}

function showToast(message) {
  toast.value = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = '';
  }, 1800);
}

onBeforeUnmount(() => {
  window.clearInterval(clockTimer);
  window.clearTimeout(toastTimer);
  completionTimers.forEach((timer) => window.clearTimeout(timer));
});
</script>

<template>
  <KitchenMonitorShell
    :active-view="activeView"
    :categories="[]"
    external-settings
    :now-ms="nowMs"
    page-class="legacy-list-layout"
    :show-navigation="false"
    :toast="toast"
    @open-settings="isSettingsOpen = true"
    @switch-view="$emit('switch-view', $event)"
  >
    <div class="legacy-list-workspace">
      <div class="legacy-list-table-container">
        <div class="legacy-list-table-scroll">
          <table
            class="legacy-order-table"
            :class="`legacy-density-${settings.lineHeight}`"
          >
            <thead>
              <tr>
                <th class="sortable" :class="{ active: sortField === 'name' }" @click="toggleSort('name')">
                  テーブル・番号
                  <span>{{ sortField === 'name' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}</span>
                </th>
                <th class="sortable elapsed-column" :class="{ active: sortField === 'ordered_date' }" @click="toggleSort('ordered_date')">
                  経過時間
                  <span>{{ sortField === 'ordered_date' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}</span>
                </th>
                <th
                  v-if="settings.showCourseName"
                  class="sortable course-column"
                  :class="{ active: sortField === 'course_name' }"
                  @click="toggleSort('course_name')"
                >
                  コース
                  <span>{{ sortField === 'course_name' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}</span>
                </th>
                <th class="sortable menu-column" :class="{ active: sortField === 'menu' }" @click="toggleSort('menu')">
                  メニュー
                  <span>{{ sortField === 'menu' ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}</span>
                </th>
                <th v-if="settings.showToppings" class="topping-column">トッピング</th>
                <th class="quantity-column">数量</th>
                <th class="status-column">状態</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" :class="rowClass(row)" :data-row-id="row.id">
                <td class="legacy-table-number">{{ row.tableNo }}</td>
                <td class="legacy-elapsed-time">{{ String(row.elapsedMinutes).padStart(2, '0') }} 分</td>
                <td v-if="settings.showCourseName" class="legacy-course-name">{{ row.courseName }}</td>
                <td class="legacy-product-desc">
                  <h6>{{ row.name }}</h6>
                  <div>
                    <p v-if="row.kitchenPrintName">{{ row.kitchenPrintName }}</p>
                    <p v-if="row.memo">メモ：{{ row.memo }}</p>
                  </div>
                </td>
                <td v-if="settings.showToppings" class="legacy-toppings">
                  <span v-for="topping in row.toppings" :key="topping.id">
                    - {{ topping.name }} x {{ topping.quantity * row.quantity }}
                  </span>
                </td>
                <td class="legacy-quantity">{{ row.quantity }}</td>
                <td class="legacy-status">
                  <button
                    v-if="row.status === 'started'"
                    type="button"
                    class="legacy-primary-button"
                    :class="{ completing: completionStartedAt[row.id] }"
                    :style="{ '--legacy-completion-progress': completionProgress(row.id) }"
                    @click="toggleCompletion(row)"
                  >
                    {{ completionStartedAt[row.id] ? 'キャンセル' : '調理済にする' }}
                  </button>
                  <button v-else-if="row.status === 'canceled'" type="button" class="legacy-danger-button">
                    <span aria-hidden="true">!</span> キャンセル済
                  </button>
                  <button v-else-if="row.status === 'served'" type="button" class="legacy-muted-button" disabled>
                    配膳済
                  </button>
                  <button v-else type="button" class="legacy-complete-button" disabled>
                    調理済
                  </button>
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td :colspan="visibleColumnCount" class="legacy-no-data">データがありません</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button class="legacy-manual-add" type="button" @click="showManualAddNotice">
        <span aria-hidden="true">＋</span> 手動追加
      </button>
    </div>

    <template #overlay>
      <KitchenMonitorSettingsModal
        v-if="isSettingsOpen"
        :active-view="activeView"
        @close="isSettingsOpen = false"
        @switch-view="$emit('switch-view', $event)"
      />
    </template>
  </KitchenMonitorShell>
</template>
