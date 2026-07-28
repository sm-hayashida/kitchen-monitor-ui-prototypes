export function clampSelection(value, pendingQuantity) {
  const pending = Math.max(0, Number(pendingQuantity) || 0);
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.min(pending, Math.max(0, Math.trunc(quantity)));
}

export function createModalSelections(matches = [], focusedOrderItemId = null) {
  return Object.fromEntries(
    matches.map((match) => {
      const orderItemId = match.orderItem.order_item_id;
      const pendingQuantity = match.orderItem.pending_quantity ?? 0;
      const selectedQuantity =
        focusedOrderItemId === orderItemId && pendingQuantity > 0 ? 1 : 0;

      return [orderItemId, selectedQuantity];
    }),
  );
}

export function setModalSelection(selections, orderItemId, value, pendingQuantity) {
  return {
    ...selections,
    [orderItemId]: clampSelection(value, pendingQuantity),
  };
}

export function createModalSelectionUpdates(matches = [], selections = {}) {
  return matches
    .map((match) => {
      const selectedQuantity = clampSelection(
        selections[match.orderItem.order_item_id],
        match.orderItem.pending_quantity,
      );

      return {
        orderItemId: match.orderItem.order_item_id,
        processedQuantity: match.orderItem.processed_quantity + selectedQuantity,
        selectedQuantity,
      };
    })
    .filter((update) => update.selectedQuantity > 0);
}

export function sumModalSelections(selections = {}) {
  return Object.values(selections).reduce(
    (total, value) => total + clampSelection(value, Number.MAX_SAFE_INTEGER),
    0,
  );
}
