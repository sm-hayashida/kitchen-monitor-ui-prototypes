import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  categoryDefinitions,
  masonryLayoutByMenuId,
  mockOrderItems,
  stationByCategoryId,
  undoWindowMs,
} from './mockData';
import { buildDishSections } from './orderItemMapper';
import { isUndoable } from './orderPresentation';

export function useKitchenMonitorMock({ initialSelectedId = 'fried-t7' } = {}) {
  const nowMs = ref(Date.now());
  const orderItems = ref(createInitialOrderItems(nowMs.value));
  const hiddenIds = ref(new Set());
  const selectedId = ref(initialSelectedId);
  const toast = ref('');
  let clockTimer = 0;
  let toastTimer = 0;

  const visibleOrderItems = computed(() => orderItems.value.filter((item) => !hiddenIds.value.has(String(item.id))));

  const sections = computed(() =>
    buildDishSections(visibleOrderItems.value, nowMs.value, {
      masonryLayoutByMenuId,
      stationByCategoryId,
    }),
  );

  const visibleOrders = computed(() =>
    sections.value.flatMap((section) => section.orders.map((order) => ({ ...order, dish: section }))),
  );

  const selectedOrder = computed(() => {
    if (!selectedId.value) {
      return null;
    }

    return visibleOrders.value.find((order) => order.id === selectedId.value) ?? null;
  });

  const categories = computed(() => {
    const stationCounts = new Map();
    sections.value.forEach((section) => {
      stationCounts.set(section.station, (stationCounts.get(section.station) ?? 0) + section.orders.length);
    });

    return categoryDefinitions.map((category) => ({
      ...category,
      count: category.active
        ? visibleOrders.value.length
        : stationCounts.get(category.station) ?? category.fallbackCount ?? 0,
    }));
  });

  function toggleDetail(orderId) {
    selectedId.value = selectedId.value === orderId ? '' : orderId;
  }

  function closeDetail() {
    selectedId.value = '';
  }

  function handleOrderPrimaryAction(order) {
    if (isUndoable(order)) {
      cancelCompletion(order);
      return;
    }

    startCompletionGrace(order);
  }

  function completeSection(section) {
    const startedAt = nowMs.value;
    section.orders.forEach((order) => {
      if (!isUndoable(order)) {
        startCompletionGrace(order, startedAt, false);
      }
    });
    showToast(`${section.name} を取消猶予つきで完了しました`);
  }

  function startCompletionGrace(order, startedAt = nowMs.value, shouldToast = true) {
    const item = findOrderItem(order.id);
    if (!item) {
      return;
    }

    item.mock_ui_status = 'undoable';
    item.mock_undo_started_at_ms = startedAt;
    item.mock_undo_window_ms = undoWindowMs;

    if (shouldToast) {
      showToast(`${order.tableNo} を完了しました。取消猶予中です`);
    }
  }

  function cancelCompletion(order) {
    const item = findOrderItem(order.id);
    if (!item) {
      return;
    }

    item.mock_ui_status = 'normal';
    delete item.mock_undo_started_at_ms;
    delete item.mock_undo_window_ms;
    showToast(`${order.tableNo} の完了を取り消しました`);
  }

  function sweepExpiredUndoWindows() {
    const nextHiddenIds = new Set(hiddenIds.value);

    orderItems.value.forEach((item) => {
      if (isRawUndoable(item) && rawUndoRemainingMs(item, nowMs.value) <= 0) {
        nextHiddenIds.add(String(item.id));
      }
    });

    if (nextHiddenIds.size !== hiddenIds.value.size) {
      hiddenIds.value = nextHiddenIds;
    }

    if (selectedId.value && nextHiddenIds.has(selectedId.value)) {
      selectedId.value = '';
    }
  }

  function findOrderItem(orderId) {
    return orderItems.value.find((item) => String(item.id) === String(orderId));
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.value = message;
    toastTimer = window.setTimeout(() => {
      toast.value = '';
    }, 1800);
  }

  onMounted(() => {
    clockTimer = window.setInterval(() => {
      nowMs.value = Date.now();
      sweepExpiredUndoWindows();
    }, 250);
  });

  onUnmounted(() => {
    window.clearInterval(clockTimer);
    window.clearTimeout(toastTimer);
  });

  return {
    categories,
    closeDetail,
    completeSection,
    handleOrderPrimaryAction,
    nowMs,
    sections,
    selectedId,
    selectedOrder,
    toast,
    toggleDetail,
  };
}

function createInitialOrderItems(baseNowMs) {
  return mockOrderItems.map((item, index) => {
    const orderedAtMs = baseNowMs - (item.mock_elapsed_minutes ?? 0) * 60 * 1000;
    const createdAtMs = orderedAtMs + (item.mock_created_sequence ?? index + 1) * 1000;
    const isUndoableInitial = item.mock_ui_status === 'undoable';

    return {
      ...item,
      toppings: item.toppings.map((topping) => ({ ...topping })),
      tables: item.tables.map((table) => ({ ...table })),
      ordered_date: new Date(orderedAtMs).toISOString(),
      created_at: new Date(createdAtMs).toISOString(),
      updated_at: new Date(createdAtMs).toISOString(),
      mock_ui_status: item.mock_ui_status ?? 'normal',
      mock_undo_started_at_ms: isUndoableInitial ? baseNowMs - (item.mock_undo_started_ago_ms ?? 0) : undefined,
      mock_undo_window_ms: isUndoableInitial ? undoWindowMs : undefined,
    };
  });
}

function isRawUndoable(item) {
  return item.mock_ui_status === 'undoable';
}

function rawUndoRemainingMs(item, nowMs) {
  if (!isRawUndoable(item)) {
    return 0;
  }

  const startedAt = item.mock_undo_started_at_ms ?? nowMs;
  const windowMs = item.mock_undo_window_ms ?? undoWindowMs;
  return Math.max(windowMs - (nowMs - startedAt), 0);
}
