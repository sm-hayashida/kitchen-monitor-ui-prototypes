import { computed, onBeforeUnmount, ref, toValue } from 'vue';
import {
  orderCompletionWindowMs as defaultOrderCompletionWindowMs,
  orderViewCategoryDefinitions,
  orderViewMockOrders,
} from './orderViewMockData';
import {
  getOrderItemAggregateKey,
  getOrderItemDisplayName,
} from './orderItemPresentation';
import { createItemCompletionQuantity } from './itemActionRules';

const itemCompletionWindowMs = 5000;

export function useOrderViewMock({
  initialOrders = orderViewMockOrders,
  orderCompletionDurationMs = defaultOrderCompletionWindowMs,
  itemCompletionDurationMs = itemCompletionWindowMs,
} = {}) {
  const orders = ref(structuredClone(toValue(initialOrders)));
  const selectedCategoryId = ref('all');
  const selectedAggregateKey = ref(null);
  const selectedAggregateOriginItemId = ref(null);
  const activeItemActionId = ref(null);
  const completionStartedAt = ref({});
  const completionDurationByOrderId = ref({});
  const itemCompletionStartedAt = ref({});
  const itemCompletionDurationByItemId = ref({});
  const itemCompletionHideByItemId = ref({});
  const itemCompletionPreviousQuantityByItemId = ref({});
  const hiddenCompletedItemIds = ref(new Set());
  const processedUnitNumbersByItemId = ref({});
  const nowMs = ref(Date.now());
  const toast = ref('');
  const completionTimers = new Map();
  const itemCompletionTimers = new Map();
  let toastTimer;

  const completionWindowMs = computed(() =>
    normalizeDurationMs(orderCompletionDurationMs, defaultOrderCompletionWindowMs),
  );
  const tableItemCompletionWindowMs = computed(() =>
    normalizeDurationMs(itemCompletionDurationMs, itemCompletionWindowMs),
  );

  const clockTimer = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);

  const categories = computed(() =>
    orderViewCategoryDefinitions.map((category) => ({
      ...category,
      active: selectedCategoryId.value === category.id,
      count:
        category.id === 'all'
          ? orders.value.length
          : orders.value.filter((order) =>
              order.items.some((orderItem) => orderItem.category_id === category.id),
            ).length,
    })),
  );

  const visibleOrders = computed(() => {
    const filtered =
      selectedCategoryId.value === 'all'
        ? orders.value
        : orders.value.filter((order) =>
            order.items.some((orderItem) => orderItem.category_id === selectedCategoryId.value),
          );

    return [...filtered].sort(
      (left, right) => right.ordered_elapsed_minutes - left.ordered_elapsed_minutes,
    );
  });

  const aggregateByKey = computed(() => {
    const aggregates = {};

    orders.value.forEach((order) => {
      order.items.forEach((orderItem) => {
        const processedQuantity =
          processedUnitNumbersByItemId.value[orderItem.order_item_id]?.length ?? 0;
        const pendingQuantity = orderItem.quantity - processedQuantity;

        if (pendingQuantity <= 0) {
          return;
        }

        const aggregateKey = getOrderItemAggregateKey(orderItem);
        const aggregate = (aggregates[aggregateKey] ??= {
          aggregateKey,
          menuId: orderItem.menu_id,
          courseId: orderItem.course_id,
          courseName: orderItem.course_name,
          name: getOrderItemDisplayName(orderItem),
          totalQuantity: 0,
          orderCount: 0,
          matches: [],
        });

        aggregate.totalQuantity += pendingQuantity;
        aggregate.matches.push({
          order,
          orderItem: {
            ...orderItem,
            pending_quantity: pendingQuantity,
            processed_quantity: processedQuantity,
          },
        });
      });
    });

    Object.values(aggregates).forEach((aggregate) => {
      aggregate.orderCount = new Set(
        aggregate.matches.map((match) => match.order.order_id),
      ).size;
      aggregate.matches.sort(
        (left, right) =>
          right.order.ordered_elapsed_minutes - left.order.ordered_elapsed_minutes,
      );
    });

    return aggregates;
  });

  const selectedAggregate = computed(
    () => aggregateByKey.value[selectedAggregateKey.value] ?? null,
  );

  function selectCategory(categoryId) {
    selectedCategoryId.value = categoryId;
  }

  function openAggregate(payload) {
    const aggregateKey = typeof payload === 'string' ? payload : payload?.aggregateKey;

    if (!aggregateKey) {
      return;
    }

    closeItemAction();
    selectedAggregateKey.value = aggregateKey;
    selectedAggregateOriginItemId.value =
      typeof payload === 'string' ? null : payload?.originOrderItemId ?? null;
  }

  function closeAggregate() {
    selectedAggregateKey.value = null;
    selectedAggregateOriginItemId.value = null;
  }

  function toggleItemAction(orderItemId) {
    activeItemActionId.value =
      activeItemActionId.value === orderItemId ? null : orderItemId;
  }

  function closeItemAction() {
    activeItemActionId.value = null;
  }

  function findOrderItem(orderItemId) {
    return orders.value
      .flatMap((order) => order.items)
      .find((item) => item.order_item_id === orderItemId);
  }

  function openAggregateForItem(orderItemId) {
    const orderItem = findOrderItem(orderItemId);

    if (!orderItem) {
      return;
    }

    openAggregate({
      aggregateKey: getOrderItemAggregateKey(orderItem),
      originOrderItemId: orderItemId,
    });
  }

  function clearItemCompletion(orderItemId) {
    window.clearTimeout(itemCompletionTimers.get(orderItemId));
    itemCompletionTimers.delete(orderItemId);

    const nextStartedAt = { ...itemCompletionStartedAt.value };
    delete nextStartedAt[orderItemId];
    itemCompletionStartedAt.value = nextStartedAt;
    const nextDurations = { ...itemCompletionDurationByItemId.value };
    delete nextDurations[orderItemId];
    itemCompletionDurationByItemId.value = nextDurations;
    const nextHideByItemId = { ...itemCompletionHideByItemId.value };
    delete nextHideByItemId[orderItemId];
    itemCompletionHideByItemId.value = nextHideByItemId;

    const nextPreviousQuantities = {
      ...itemCompletionPreviousQuantityByItemId.value,
    };
    delete nextPreviousQuantities[orderItemId];
    itemCompletionPreviousQuantityByItemId.value = nextPreviousQuantities;

    if (hiddenCompletedItemIds.value.has(orderItemId)) {
      const nextHiddenItemIds = new Set(hiddenCompletedItemIds.value);
      nextHiddenItemIds.delete(orderItemId);
      hiddenCompletedItemIds.value = nextHiddenItemIds;
    }
  }

  function setItemProcessedQuantity({
    orderItemId,
    processedQuantity,
    hideWhenComplete = false,
    keepOpen = false,
  }) {
    const orderItem = findOrderItem(orderItemId);
    const nextQuantity = Number(processedQuantity);

    if (
      !orderItem ||
      !Number.isInteger(nextQuantity) ||
      nextQuantity < 0 ||
      nextQuantity > orderItem.quantity
    ) {
      return;
    }

    const previousQuantity = processedUnitNumbersByItemId.value[orderItemId]?.length ?? 0;
    const reachesCompletion =
      nextQuantity === orderItem.quantity && previousQuantity < orderItem.quantity;
    if (!keepOpen || reachesCompletion) {
      closeItemAction();
    }

    if (previousQuantity === nextQuantity) {
      return;
    }

    clearItemCompletion(orderItemId);
    processedUnitNumbersByItemId.value = {
      ...processedUnitNumbersByItemId.value,
      [orderItemId]: Array.from({ length: nextQuantity }, (_, index) => index + 1),
    };

    if (reachesCompletion) {
      const durationMs = tableItemCompletionWindowMs.value;
      if (durationMs === 0) {
        if (hideWhenComplete) {
          finishTableItem(orderItemId);
        }
        return;
      }

      itemCompletionStartedAt.value = {
        ...itemCompletionStartedAt.value,
        [orderItemId]: Date.now(),
      };
      itemCompletionDurationByItemId.value = {
        ...itemCompletionDurationByItemId.value,
        [orderItemId]: durationMs,
      };
      itemCompletionHideByItemId.value = {
        ...itemCompletionHideByItemId.value,
        [orderItemId]: Boolean(hideWhenComplete),
      };
      itemCompletionPreviousQuantityByItemId.value = {
        ...itemCompletionPreviousQuantityByItemId.value,
        [orderItemId]: previousQuantity,
      };
      itemCompletionTimers.set(
        orderItemId,
        window.setTimeout(() => finishItemCompletion(orderItemId), durationMs),
      );
      showToast(
        hideWhenComplete
          ? `${orderItem.name}は${formatSeconds(durationMs)}秒後にテーブル一覧から消えます`
          : `${formatSeconds(durationMs)}秒以内なら${orderItem.name}の完了を取り消せます`,
      );
    } else if (!keepOpen) {
      showToast(
        nextQuantity < previousQuantity
          ? `${orderItem.name}を${nextQuantity}/${orderItem.quantity}に戻しました`
          : `${orderItem.name}を${nextQuantity}/${orderItem.quantity}調理済みにしました`,
      );
    }

    if (selectedAggregateKey.value && !selectedAggregate.value) {
      closeAggregate();
    }
  }

  function cancelTableItemCompletion(orderItemId) {
    const previousQuantity = itemCompletionPreviousQuantityByItemId.value[orderItemId];

    if (!Number.isInteger(previousQuantity)) {
      return;
    }

    setItemProcessedQuantity({
      orderItemId,
      processedQuantity: previousQuantity,
    });
  }

  function finishTableItem(orderItemId) {
    const orderItem = findOrderItem(orderItemId);
    const nextHiddenItemIds = new Set(hiddenCompletedItemIds.value);
    nextHiddenItemIds.add(orderItemId);
    hiddenCompletedItemIds.value = nextHiddenItemIds;
    itemCompletionTimers.delete(orderItemId);

    const nextStartedAt = { ...itemCompletionStartedAt.value };
    delete nextStartedAt[orderItemId];
    itemCompletionStartedAt.value = nextStartedAt;
    const nextDurations = { ...itemCompletionDurationByItemId.value };
    delete nextDurations[orderItemId];
    itemCompletionDurationByItemId.value = nextDurations;
    const nextHideByItemId = { ...itemCompletionHideByItemId.value };
    delete nextHideByItemId[orderItemId];
    itemCompletionHideByItemId.value = nextHideByItemId;
    const nextPreviousQuantities = {
      ...itemCompletionPreviousQuantityByItemId.value,
    };
    delete nextPreviousQuantities[orderItemId];
    itemCompletionPreviousQuantityByItemId.value = nextPreviousQuantities;

    if (activeItemActionId.value === orderItemId) {
      closeItemAction();
    }
    if (selectedAggregateOriginItemId.value === orderItemId) {
      closeAggregate();
    }
    if (orderItem) {
      showToast(`${orderItem.name}をテーブル一覧から非表示にしました`);
    }
  }

  function finishItemCompletion(orderItemId) {
    if (itemCompletionHideByItemId.value[orderItemId]) {
      finishTableItem(orderItemId);
      return;
    }

    const orderItem = findOrderItem(orderItemId);
    clearItemCompletion(orderItemId);
    if (orderItem) {
      showToast(`${orderItem.name}を調理済みにしました`);
    }
  }

  function toggleOrderCompletion(orderId) {
    closeItemAction();
    if (completionStartedAt.value[orderId]) {
      window.clearTimeout(completionTimers.get(orderId));
      completionTimers.delete(orderId);
      const nextState = { ...completionStartedAt.value };
      delete nextState[orderId];
      completionStartedAt.value = nextState;
      const nextDurations = { ...completionDurationByOrderId.value };
      delete nextDurations[orderId];
      completionDurationByOrderId.value = nextDurations;
      showToast('完了を取り消しました');
      return;
    }

    const durationMs = completionWindowMs.value;
    if (durationMs === 0) {
      finishOrder(orderId);
      return;
    }

    completionStartedAt.value = {
      ...completionStartedAt.value,
      [orderId]: Date.now(),
    };
    completionDurationByOrderId.value = {
      ...completionDurationByOrderId.value,
      [orderId]: durationMs,
    };
    completionTimers.set(
      orderId,
      window.setTimeout(() => finishOrder(orderId), durationMs),
    );
    showToast(`${formatSeconds(durationMs)}秒以内なら完了を取り消せます`);
  }

  function finishOrder(orderId) {
    const finishedOrder = orders.value.find((order) => order.id === orderId);
    orders.value = orders.value.filter((order) => order.id !== orderId);
    completionTimers.delete(orderId);
    const nextState = { ...completionStartedAt.value };
    delete nextState[orderId];
    completionStartedAt.value = nextState;
    const nextDurations = { ...completionDurationByOrderId.value };
    delete nextDurations[orderId];
    completionDurationByOrderId.value = nextDurations;
    if (finishedOrder) {
      const finishedItemIds = new Set(
        finishedOrder.items.map((orderItem) => orderItem.order_item_id),
      );
      finishedItemIds.forEach((orderItemId) => clearItemCompletion(orderItemId));
      processedUnitNumbersByItemId.value = Object.fromEntries(
        Object.entries(processedUnitNumbersByItemId.value).filter(
          ([orderItemId]) => !finishedItemIds.has(orderItemId),
        ),
      );
      closeAggregate();
    }
    showToast('注文を調理済みにしました');

    if (!selectedAggregate.value) {
      closeAggregate();
    }
  }

  function showToast(message) {
    toast.value = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.value = '';
    }, 1800);
  }

  function completeItemRemaining(orderItemId, { hideWhenComplete = false } = {}) {
    const orderItem = findOrderItem(orderItemId);

    if (!orderItem) {
      return;
    }

    const processedCount =
      processedUnitNumbersByItemId.value[orderItem.order_item_id]?.length ?? 0;

    setItemProcessedQuantity({
      orderItemId,
      processedQuantity: createItemCompletionQuantity({
        processedCount,
        totalQuantity: orderItem.quantity,
      }),
      hideWhenComplete,
    });
  }

  function applyAggregateSelections(updates, { hideWhenComplete = false } = {}) {
    updates.forEach((update) => {
      setItemProcessedQuantity({
        orderItemId: update.orderItemId,
        processedQuantity: update.processedQuantity,
        hideWhenComplete,
      });
    });
    closeAggregate();
  }

  onBeforeUnmount(() => {
    window.clearInterval(clockTimer);
    window.clearTimeout(toastTimer);
    completionTimers.forEach((timer) => window.clearTimeout(timer));
    itemCompletionTimers.forEach((timer) => window.clearTimeout(timer));
  });

  return {
    activeItemActionId,
    aggregateByKey,
    cancelTableItemCompletion,
    categories,
    closeAggregate,
    closeItemAction,
    completeItemRemaining,
    completionStartedAt,
    completionDurationByOrderId,
    completionWindowMs,
    hiddenCompletedItemIds,
    itemCompletionStartedAt,
    itemCompletionDurationByItemId,
    itemCompletionHideByItemId,
    itemCompletionWindowMs: tableItemCompletionWindowMs,
    nowMs,
    applyAggregateSelections,
    openAggregate,
    openAggregateForItem,
    processedUnitNumbersByItemId,
    selectCategory,
    selectedAggregate,
    selectedAggregateOriginItemId,
    selectedCategoryId,
    toast,
    toggleItemAction,
    toggleOrderCompletion,
    visibleOrders,
  };
}

function normalizeDurationMs(duration, fallback) {
  const value = Number(toValue(duration));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function formatSeconds(durationMs) {
  return durationMs / 1000;
}
