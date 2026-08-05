import { ref } from 'vue';

const pinnedOrderIds = ref(new Set());
const sortMode = ref('oldest');

export function sortOrdersByPinned(orders, pinnedIds = new Set(), orderSortMode = 'oldest') {
  return [...orders].sort((left, right) => {
    const leftPinned = pinnedIds.has(left.id);
    const rightPinned = pinnedIds.has(right.id);
    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    if (orderSortMode === 'table') {
      return String(left.table_no).localeCompare(String(right.table_no), 'ja', {
        numeric: true,
        sensitivity: 'base',
      });
    }

    const elapsedDifference = Number(right.ordered_elapsed_minutes ?? 0)
      - Number(left.ordered_elapsed_minutes ?? 0);
    return orderSortMode === 'latest' ? -elapsedDifference : elapsedDifference;
  });
}

export function useOrderLayoutPreferences() {
  function togglePinned(orderId) {
    const nextPinnedOrderIds = new Set(pinnedOrderIds.value);
    const willPin = !nextPinnedOrderIds.has(orderId);

    if (willPin) {
      nextPinnedOrderIds.add(orderId);
    } else {
      nextPinnedOrderIds.delete(orderId);
    }

    pinnedOrderIds.value = nextPinnedOrderIds;
    return willPin;
  }

  return {
    pinnedOrderIds,
    sortMode,
    togglePinned,
  };
}
