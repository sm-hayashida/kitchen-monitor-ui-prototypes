<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { RotateCcw } from '@lucide/vue';
import CompletedHistoryItem from '../components/kitchen-monitor/CompletedHistoryItem.vue';
import KitchenMonitorSettingsModal from '../components/kitchen-monitor/KitchenMonitorSettingsModal.vue';
import KitchenMonitorShell from '../components/kitchen-monitor/KitchenMonitorShell.vue';
import { createScenarioOrders } from '../features/kitchen-monitor/comparisonScenarios';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

defineEmits(['switch-view']);

const displayModes = [
  { id: 'item', label: '商品単位' },
  { id: 'order', label: '注文単位' },
  { id: 'table', label: 'テーブル単位' },
];

const sortOptions = [
  { id: 'completed-desc', label: '完了日時・新しい順' },
  { id: 'completed-asc', label: '完了日時・古い順' },
  { id: 'ordered-desc', label: '注文日時・新しい順' },
  { id: 'ordered-asc', label: '注文日時・古い順' },
  { id: 'table-asc', label: 'テーブル番号順' },
];

const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}時台`,
}));

const nowMs = Date.now();
const displayMode = ref('item');
const sortMode = ref('completed-desc');
const completedItems = ref(createCompletedItems());
const draftFilters = reactive(createEmptyFilters());
const appliedFilters = ref(createEmptyFilters());
const pendingRestoreItem = ref(null);
const isSettingsOpen = ref(false);
const toast = ref('');
let toastTimer;

const activeFilterCount = computed(() => {
  const filters = appliedFilters.value;
  return [
    filters.keyword,
    filters.tableNumber,
    filters.orderedDate,
    filters.orderedTime,
    filters.statuses.length ? filters.statuses : null,
  ].filter(Boolean).length;
});

const filteredCompletedItems = computed(() => {
  const filters = appliedFilters.value;
  const keyword = normalizeSearchText(filters.keyword);
  const tableNumber = normalizeSearchText(filters.tableNumber);

  return completedItems.value.filter((item) => {
    if (tableNumber && !normalizeSearchText(item.tableNo).includes(tableNumber)) return false;
    if (filters.orderedDate && item.orderedDate !== filters.orderedDate) return false;
    if (filters.orderedTime && item.orderedAt.slice(0, 2) !== filters.orderedTime.padStart(2, '0')) return false;
    if (filters.statuses.length && !filters.statuses.includes(item.status)) return false;

    if (keyword) {
      const searchableText = normalizeSearchText([
        item.tableNo,
        item.name,
        item.kitchenPrintName,
        item.courseName,
        item.memo,
        item.orderMemo,
        ...item.toppings.map((topping) => topping.name),
      ].filter(Boolean).join(' '));
      if (!searchableText.includes(keyword)) return false;
    }

    return true;
  });
});

const sortedCompletedItems = computed(() => [...filteredCompletedItems.value].sort(compareCompletedItems));

const orderGroups = computed(() => groupCompletedItems(
  sortedCompletedItems.value,
  (item) => item.orderId,
));

const tableGroups = computed(() => groupCompletedItems(
  sortedCompletedItems.value,
  (item) => item.tableNo,
).map((table) => ({
  ...table,
  orders: groupCompletedItems(table.items, (item) => item.orderId),
})));

const resultSummary = computed(() => {
  const itemCount = sortedCompletedItems.value.length;
  if (displayMode.value === 'order') return `${orderGroups.value.length}注文・${itemCount}商品`;
  if (displayMode.value === 'table') return `${tableGroups.value.length}テーブル・${itemCount}商品`;
  return `${itemCount}商品`;
});

function createEmptyFilters() {
  return {
    keyword: '',
    tableNumber: '',
    orderedDate: '',
    orderedTime: '',
    statuses: [],
  };
}

function createCompletedItems() {
  const orders = createScenarioOrders('normal');
  const seedDefinitions = [
    { orderIndex: 0, itemIndexes: [0, 1, 2], dayOffset: 0, completedAt: '12:42', status: 'cooked' },
    { orderIndex: 2, itemIndexes: [1], dayOffset: 0, completedAt: '11:40', status: 'cooked' },
    { orderIndex: 3, itemIndexes: [0], dayOffset: 1, completedAt: '18:39', status: 'cooked' },
    { orderIndex: 4, itemIndexes: [1], dayOffset: 2, completedAt: '09:36', status: 'cooked' },
    { orderIndex: 7, itemIndexes: [0, 1], dayOffset: 4, completedAt: '20:31', status: 'served' },
    { orderIndex: 9, itemIndexes: [0, 1, 2], dayOffset: 6, completedAt: '12:28', status: 'cooked' },
  ];

  return seedDefinitions.flatMap((seed) => {
    const order = orders[seed.orderIndex];
    const completedDate = dateDaysAgo(seed.dayOffset);
    const ordered = subtractMinutes(completedDate, seed.completedAt, order.ordered_elapsed_minutes);

    return seed.itemIndexes.map((itemIndex) => {
      const orderItem = order.items[itemIndex];
      return {
        id: `completed-${orderItem.order_item_id}`,
        orderId: order.order_id,
        orderItemId: orderItem.order_item_id,
        tableNo: order.table_no,
        tableCategory: order.table_category,
        orderedDate: ordered.date,
        orderedAt: ordered.time,
        orderedDateTime: `${ordered.date}T${ordered.time}`,
        completedDate,
        completedAt: seed.completedAt,
        completedDateTime: `${completedDate}T${seed.completedAt}`,
        status: seed.status,
        orderMemo: order.order_memo,
        name: orderItem.name,
        kitchenPrintName: orderItem.kitchen_print_name,
        courseName: orderItem.course_name,
        memo: orderItem.memo,
        quantity: orderItem.quantity,
        toppings: orderItem.toppings ?? [],
      };
    });
  });
}

function groupCompletedItems(items, getKey) {
  const groups = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    const group = groups.get(key) ?? {
      id: key,
      tableNo: item.tableNo,
      tableCategory: item.tableCategory,
      orderedDate: item.orderedDate,
      orderedAt: item.orderedAt,
      orderedDateTime: item.orderedDateTime,
      completedDate: item.completedDate,
      completedAt: item.completedAt,
      completedDateTime: item.completedDateTime,
      orderMemo: item.orderMemo,
      orderIds: new Set(),
      items: [],
    };

    group.items.push(item);
    group.orderIds.add(item.orderId);
    if (item.completedDateTime > group.completedDateTime) {
      group.completedDate = item.completedDate;
      group.completedAt = item.completedAt;
      group.completedDateTime = item.completedDateTime;
    }
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => ({
    ...group,
    orderCount: group.orderIds.size,
  }));
}

function compareCompletedItems(left, right) {
  let compared = 0;

  if (sortMode.value === 'completed-desc') compared = right.completedDateTime.localeCompare(left.completedDateTime);
  if (sortMode.value === 'completed-asc') compared = left.completedDateTime.localeCompare(right.completedDateTime);
  if (sortMode.value === 'ordered-desc') compared = right.orderedDateTime.localeCompare(left.orderedDateTime);
  if (sortMode.value === 'ordered-asc') compared = left.orderedDateTime.localeCompare(right.orderedDateTime);
  if (sortMode.value === 'table-asc') {
    compared = left.tableNo.localeCompare(right.tableNo, 'ja', { numeric: true, sensitivity: 'base' });
  }

  return compared || String(left.id).localeCompare(String(right.id), 'ja', { numeric: true });
}

function dateDaysAgo(daysAgo) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return toDateKey(date);
}

function subtractMinutes(dateKey, time, minutes) {
  const date = new Date(`${dateKey}T${time}:00`);
  date.setMinutes(date.getMinutes() - minutes);
  return {
    date: toDateKey(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function normalizeSearchText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('ja');
}

function formatDate(dateKey) {
  return dateKey.replaceAll('-', '/');
}

function formatShortDateTime(dateKey, time) {
  return `${dateKey.slice(5).replace('-', '/')} ${time}`;
}

function statusLabel(status) {
  return status === 'served' ? '配膳済み' : '調理済み';
}

function canRestore(item) {
  return item.status === 'cooked';
}

function applyFilters() {
  appliedFilters.value = {
    ...draftFilters,
    statuses: [...draftFilters.statuses],
  };
}

function clearFilters() {
  Object.assign(draftFilters, createEmptyFilters());
  appliedFilters.value = createEmptyFilters();
}

function requestRestore(item) {
  if (!canRestore(item)) return;
  pendingRestoreItem.value = item;
}

function cancelRestore() {
  pendingRestoreItem.value = null;
}

function restoreItem() {
  const item = pendingRestoreItem.value;
  if (!item) return;

  completedItems.value = completedItems.value.filter((candidate) => candidate.id !== item.id);
  pendingRestoreItem.value = null;
  showToast(`${item.name}を未調理に戻しました（モック）`);
}

function resetCompletedItems() {
  completedItems.value = createCompletedItems();
  clearFilters();
  showToast('調理済みの固定データを再表示しました');
}

function showToast(message) {
  toast.value = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = '';
  }, 1800);
}

onBeforeUnmount(() => window.clearTimeout(toastTimer));
</script>

<template>
  <KitchenMonitorShell
    :active-view="activeView"
    :categories="[]"
    external-settings
    :now-ms="nowMs"
    page-class="completed-history-layout"
    :show-navigation="false"
    :toast="toast"
    @open-settings="isSettingsOpen = true"
    @switch-view="$emit('switch-view', $event)"
  >
    <section class="completed-history-workspace">
      <header class="completed-history-toolbar">
        <div>
          <span>直近7日分・固定モックデータ</span>
          <h1>調理済み</h1>
          <p>商品・注文・テーブルで表示を比較</p>
        </div>
        <div class="completed-history-toolbar-actions">
          <div class="completed-history-mode-switch" role="group" aria-label="調理済みの表示単位">
            <button
              v-for="mode in displayModes"
              :key="mode.id"
              type="button"
              :class="{ active: displayMode === mode.id }"
              @click="displayMode = mode.id"
            >
              {{ mode.label }}
            </button>
          </div>
          <label class="completed-history-sort-control">
            <span>並び順</span>
            <select v-model="sortMode" aria-label="調理済みの並び順">
              <option v-for="option in sortOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
          <strong>{{ resultSummary }}</strong>
        </div>
      </header>

      <form class="completed-history-filter" role="search" @submit.prevent="applyFilters">
        <div class="completed-history-filter-heading">
          <div>
            <strong>検索条件</strong>
            <span>現行項目＋キーワード検索</span>
          </div>
          <span v-if="activeFilterCount">{{ activeFilterCount }}条件を適用中</span>
          <span v-else>すべて表示</span>
        </div>
        <div class="completed-history-filter-fields">
          <label class="completed-filter-field keyword">
            <span>キーワード</span>
            <input
              v-model="draftFilters.keyword"
              type="search"
              placeholder="商品・トッピング・メモ"
            >
          </label>
          <label class="completed-filter-field">
            <span>テーブル番号</span>
            <input v-model="draftFilters.tableNumber" type="text" placeholder="例：T2">
          </label>
          <label class="completed-filter-field">
            <span>注文日</span>
            <input v-model="draftFilters.orderedDate" type="date">
          </label>
          <label class="completed-filter-field">
            <span>注文時間</span>
            <select v-model="draftFilters.orderedTime">
              <option value="">すべて</option>
              <option v-for="hour in hourOptions" :key="hour.value" :value="hour.value">
                {{ hour.label }}
              </option>
            </select>
          </label>
          <fieldset class="completed-filter-status">
            <legend>状態 <small>未選択はすべて</small></legend>
            <label>
              <input v-model="draftFilters.statuses" type="checkbox" value="cooked">
              調理済み
            </label>
            <label>
              <input v-model="draftFilters.statuses" type="checkbox" value="served">
              配膳済み
            </label>
          </fieldset>
          <div class="completed-history-filter-actions">
            <button type="button" class="clear" @click="clearFilters">クリア</button>
            <button type="submit" class="search">検索</button>
          </div>
        </div>
      </form>

      <div class="completed-history-scroll">
        <div v-if="completedItems.length === 0" class="completed-history-empty">
          <strong>表示する調理済み商品がありません</strong>
          <button type="button" @click="resetCompletedItems">固定データを再表示</button>
        </div>

        <div v-else-if="sortedCompletedItems.length === 0" class="completed-history-empty">
          <strong>検索条件に一致する商品がありません</strong>
          <button type="button" @click="clearFilters">検索条件をクリア</button>
        </div>

        <div v-else-if="displayMode === 'order'" class="completed-history-card-grid">
          <article v-for="group in orderGroups" :key="group.id" class="completed-history-card">
            <header>
              <div>
                <strong>{{ group.tableNo }}</strong>
                <span>{{ formatShortDateTime(group.orderedDate, group.orderedAt) }} 注文</span>
              </div>
              <div>
                <b>{{ formatShortDateTime(group.completedDate, group.completedAt) }} 更新</b>
                <span>{{ group.items.length }}商品</span>
              </div>
            </header>
            <p v-if="group.orderMemo" class="completed-order-memo">注文メモ：{{ group.orderMemo }}</p>
            <ul>
              <li v-for="item in group.items" :key="item.id">
                <CompletedHistoryItem :item="item" />
                <button
                  v-if="canRestore(item)"
                  type="button"
                  class="completed-restore-button"
                  @click="requestRestore(item)"
                >
                  <RotateCcw :size="14" aria-hidden="true" />
                  未調理に戻す
                </button>
                <span v-else class="completed-restore-unavailable">変更不可</span>
              </li>
            </ul>
          </article>
        </div>

        <div v-else-if="displayMode === 'table'" class="completed-history-card-grid">
          <article v-for="group in tableGroups" :key="group.id" class="completed-history-card table-group-card">
            <header>
              <div>
                <strong>{{ group.tableNo }}</strong>
                <span>{{ group.tableCategory }}</span>
              </div>
              <div>
                <b>{{ formatShortDateTime(group.completedDate, group.completedAt) }} 最終更新</b>
                <span>{{ group.orderCount }}注文・{{ group.items.length }}商品</span>
              </div>
            </header>
            <div class="completed-table-order-list">
              <section v-for="order in group.orders" :key="order.id" class="completed-table-order-group">
                <div class="completed-order-divider">
                  <span>注文 {{ formatShortDateTime(order.orderedDate, order.orderedAt) }}</span>
                  <span>{{ order.items.length }}商品</span>
                </div>
                <ul>
                  <li v-for="item in order.items" :key="item.id">
                    <CompletedHistoryItem :item="item" />
                    <button
                      v-if="canRestore(item)"
                      type="button"
                      class="completed-restore-button"
                      @click="requestRestore(item)"
                    >
                      <RotateCcw :size="14" aria-hidden="true" />
                      未調理に戻す
                    </button>
                    <span v-else class="completed-restore-unavailable">変更不可</span>
                  </li>
                </ul>
              </section>
            </div>
          </article>
        </div>

        <div v-else class="completed-history-table-wrap">
          <table class="completed-history-table">
            <thead>
              <tr>
                <th>テーブル</th>
                <th>注文日時</th>
                <th>メニュー</th>
                <th>トッピング・メモ</th>
                <th>数量</th>
                <th>状態・完了日時</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in sortedCompletedItems" :key="item.id">
                <td><strong>{{ item.tableNo }}</strong></td>
                <td>
                  <span>{{ formatDate(item.orderedDate) }}</span>
                  <strong>{{ item.orderedAt }}</strong>
                </td>
                <td>
                  <strong>{{ item.name }}</strong>
                  <span v-if="item.courseName">{{ item.courseName }}</span>
                </td>
                <td>
                  <span v-for="topping in item.toppings" :key="topping.id">
                    {{ topping.name }}
                  </span>
                  <small v-if="item.memo">メモ：{{ item.memo }}</small>
                </td>
                <td><strong>{{ item.quantity }}</strong></td>
                <td>
                  <button
                    v-if="canRestore(item)"
                    type="button"
                    class="completed-list-status"
                    @click="requestRestore(item)"
                  >
                    <strong>{{ statusLabel(item.status) }}</strong>
                    <span>{{ formatShortDateTime(item.completedDate, item.completedAt) }}</span>
                  </button>
                  <span v-else class="completed-list-status served">
                    <strong>{{ statusLabel(item.status) }}</strong>
                    <span>{{ formatShortDateTime(item.completedDate, item.completedAt) }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <template #overlay>
      <KitchenMonitorSettingsModal
        v-if="isSettingsOpen"
        :active-view="activeView"
        @close="isSettingsOpen = false"
        @switch-view="$emit('switch-view', $event)"
      />

      <div v-if="pendingRestoreItem" class="completed-restore-backdrop" @click.self="cancelRestore">
        <section class="completed-restore-dialog" role="dialog" aria-modal="true" aria-labelledby="restore-title">
          <span>調理済みから戻す</span>
          <h2 id="restore-title">{{ pendingRestoreItem.name }}を未調理に戻しますか？</h2>
          <p>{{ pendingRestoreItem.tableNo }}・{{ pendingRestoreItem.quantity }}個の状態を戻す確認用モックです。</p>
          <div>
            <button type="button" @click="cancelRestore">キャンセル</button>
            <button type="button" class="primary" @click="restoreItem">未調理に戻す</button>
          </div>
        </section>
      </div>
    </template>
  </KitchenMonitorShell>
</template>
