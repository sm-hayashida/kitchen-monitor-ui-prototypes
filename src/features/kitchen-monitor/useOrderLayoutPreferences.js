import { ref } from 'vue';

const pinnedOrderIds = ref(new Set());

export function sortOrdersByPinned(orders, pinnedIds = new Set()) {
  return [...orders].sort((left, right) => {
    const leftPinned = pinnedIds.has(left.id);
    const rightPinned = pinnedIds.has(right.id);
    return leftPinned === rightPinned ? 0 : leftPinned ? -1 : 1;
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
    togglePinned,
  };
}
