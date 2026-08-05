<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import KitchenMonitorSettingsModal from '../components/kitchen-monitor/KitchenMonitorSettingsModal.vue';
import KitchenMonitorShell from '../components/kitchen-monitor/KitchenMonitorShell.vue';
import { createScenarioOrders } from '../features/kitchen-monitor/comparisonScenarios';
import { useComparisonStore } from '../features/kitchen-monitor/comparisonState';
import { useKitchenMonitorSettings } from '../features/kitchen-monitor/useKitchenMonitorSettings';
import { useOrderDepartmentSettings } from '../features/kitchen-monitor/useOrderDepartmentSettings';

const props = defineProps({
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
const isModernList = computed(() => props.activeView === 'list-modern');
const pageClass = computed(() => (
  isModernList.value
    ? 'legacy-list-layout modern-list-layout'
    : 'legacy-list-layout'
));
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
      course_name: item.course_name ?? '',
      name: item.name,
      custom_content_name: item.kitchen_print_name ?? '',
      memo: item.memo ?? '',
      toppings: item.toppings ?? [],
      quantity: item.quantity,
      status: resolveLegacyStatus(item.order_item_id),
    })))
  .filter((row) => !removedItemIds.value.has(row.id))
  .sort(compareRows));

const columns = [
  { name: 'name', display: 'テーブル・番号', sortable: true, class: ' order-sort tw-cursor-pointer' },
  { name: 'ordered_date', display: '経過時間', sortable: true, class: 'elapse-time order-sort tw-cursor-pointer' },
  { name: 'course_name', display: 'コース', sortable: true, class: 'product-course-td order-sort tw-cursor-pointer' },
  { name: 'menu', display: 'メニュー', sortable: true, class: 'product-desc order-sort tw-cursor-pointer' },
  { name: 'topping', display: 'トッピング', sortable: false, class: 'text-left ' },
  { name: 'quantity', display: '数量', sortable: false, class: 'course-qty-td ' },
  { name: 'status', display: '状態', sortable: false, class: 'course-action-td ' },
];

const displayColumns = computed(() => columns.filter((column) => (
  (column.name !== 'course_name' || settings.showCourseName)
  && (column.name !== 'topping' || settings.showToppings)
)));

const densityClass = computed(() => [
  `${settings.lineHeight}-density`,
  `legacy-density-${settings.lineHeight}`,
]);

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
    if (sortField.value === 'course_name') return row.course_name;
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

function sortAriaValue(field) {
  if (sortField.value !== field) return 'none';
  return sortDirection.value === 'asc' ? 'ascending' : 'descending';
}

function sortIndicator(field) {
  if (sortField.value !== field) return '↕';
  return sortDirection.value === 'asc' ? '▲' : '▼';
}

function sortButtonAriaLabel(column) {
  if (sortField.value !== column.name) return `${column.display}で並び替え`;
  return `${column.display}、現在${sortDirection.value === 'asc' ? '昇順' : '降順'}。タップして反転`;
}

function rowClass(row) {
  return {
    [`status-${row.status}`]: true,
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
    :page-class="pageClass"
    :show-navigation="false"
    :toast="toast"
    @open-settings="isSettingsOpen = true"
    @switch-view="$emit('switch-view', $event)"
  >
    <div class="legacy-list-workspace">
      <div class="legacy-production-container">
        <div class="history-wrapper mt-4">
          <div class="history-table-container">
            <div class="history-tbl-wrapper">
              <div>
                <table class="table legacy-order-table" :class="densityClass">
                  <thead>
                    <tr>
                      <th
                        v-for="column in displayColumns"
                        :key="column.name"
                        scope="col"
                        :class="[{ active: column.name === sortField }, column.class]"
                        :aria-sort="isModernList && column.sortable ? sortAriaValue(column.name) : undefined"
                        @click="column.sortable && !isModernList && toggleSort(column.name)"
                      >
                        <button
                          v-if="isModernList && column.sortable"
                          type="button"
                          class="legacy-list-sort-button"
                          :aria-label="sortButtonAriaLabel(column)"
                          @click.stop="toggleSort(column.name)"
                        >
                          {{ column.display }}
                          <span class="legacy-list-sort-indicator" aria-hidden="true">
                            {{ sortIndicator(column.name) }}
                          </span>
                        </button>
                        <span v-else>{{ column.display }}</span>
                        <span v-if="!isModernList && column.sortable" class="material-icons" aria-hidden="true">
                          {{ column.name === sortField ? (sortDirection === 'desc' ? '▼' : '▲') : '' }}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in rows"
                      :id="`order-item${row.id}`"
                      :key="row.id"
                      :class="rowClass(row)"
                      :data-row-id="row.id"
                    >
                      <td class="exNo">{{ row.tableNo }}</td>
                      <td class="text-bold exp-time">
                        <span>{{ row.elapsedMinutes }} 分</span>
                      </td>
                      <td v-if="settings.showCourseName" class="text-link t-16 course-item-td">
                        <span class="legacy-course-label">{{ row.course_name }}</span>
                      </td>
                      <td class="product-desc">
                        <h6>{{ row.name }}</h6>
                        <div class="sub-desc">
                          <p v-if="row.custom_content_name" class="legacy-print-name">{{ row.custom_content_name }}</p>
                          <p v-if="row.memo" class="legacy-item-memo">メモ：{{ row.memo }}</p>
                        </div>
                      </td>
                      <td v-if="settings.showToppings" class="t-16 topping">
                        <div
                          v-if="row.toppings.length"
                          class="text-left align-center"
                          :class="{ 'legacy-topping-list': isModernList }"
                        >
                          <template v-for="topping in row.toppings" :key="topping.id">
                            <span v-if="isModernList" class="legacy-topping-chip">
                              {{ topping.name }} x {{ topping.quantity * row.quantity }}
                            </span>
                            <template v-else>
                              - {{ topping.name }} x {{ topping.quantity * row.quantity }} <br />
                            </template>
                          </template>
                        </div>
                      </td>
                      <td class="text-bold order-quantity">
                        <span class="legacy-quantity-badge">{{ row.quantity }}</span>
                      </td>
                      <td class="status" style="white-space: nowrap">
                        <button
                          v-if="row.status === 'started' && !completionStartedAt[row.id]"
                          type="button"
                          class="btn btn-primary pr-4 pl-4 legacy-primary-button"
                          @click="toggleCompletion(row)"
                        >
                          調理済にする
                        </button>
                        <button
                          v-else-if="row.status === 'started'"
                          type="button"
                          class="btn btn-primary pr-4 pl-4 custom-ladda-button danger-btn ladda-button legacy-primary-button"
                          data-style="slide-left"
                          data-loading
                          @click="toggleCompletion(row)"
                        >
                          <span class="ladda-label">キャンセル</span>
                          <span
                            class="ladda-progress"
                            :style="{ width: `${completionProgress(row.id) * 100}%` }"
                          />
                        </button>
                        <template v-else-if="row.status === 'canceled'">
                          <span class="alert-btn material-icons" aria-hidden="true">!</span>
                          <button type="button" class="btn btn-primary pr-4 pl-4 danger-btn">
                            キャンセル済
                          </button>
                        </template>
                        <button v-else-if="row.status === 'served'" type="button" class="btn btn-gray-trans">
                          配膳済
                        </button>
                        <button v-else type="button" class="btn btn-primary pr-4 pl-4 btn-primary-trans">
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
              <div class="addmenu">
                <a href="javascript:void(0)" @click.prevent="showManualAddNotice">
                  <span class="material-icons" aria-hidden="true">＋</span> 手動追加
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
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
