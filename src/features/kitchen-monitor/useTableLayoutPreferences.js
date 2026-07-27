import { ref } from 'vue';

const pinnedTableIds = ref(new Set(['T2']));
const manualOrder = ref([]);
const sortMode = ref('oldest');
const tableGroupingEnabled = ref(true);

export function useTableLayoutPreferences() {
  function setManualOrder(tableIds) {
    manualOrder.value = [...tableIds];
  }

  function togglePinned(tableId) {
    const nextPinnedTableIds = new Set(pinnedTableIds.value);

    if (nextPinnedTableIds.has(tableId)) {
      nextPinnedTableIds.delete(tableId);
    } else {
      nextPinnedTableIds.add(tableId);
    }

    pinnedTableIds.value = nextPinnedTableIds;
  }

  function moveTable(tableId, direction) {
    const currentIndex = manualOrder.value.indexOf(tableId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= manualOrder.value.length) {
      return;
    }

    const nextOrder = [...manualOrder.value];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [
      nextOrder[nextIndex],
      nextOrder[currentIndex],
    ];
    manualOrder.value = nextOrder;
  }

  return {
    manualOrder,
    moveTable,
    pinnedTableIds,
    setManualOrder,
    sortMode,
    tableGroupingEnabled,
    togglePinned,
  };
}
