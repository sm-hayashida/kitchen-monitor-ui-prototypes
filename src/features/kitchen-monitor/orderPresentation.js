import { undoWindowMs } from './mockData';

export const chipLimit = 6;

const defaultMasonryLayout = {
  minColumns: 3,
  maxCardsPerColumn: 4,
  maxColumns: 12,
  targetColumnHeight: 470,
};

export function createMasonryColumns(orders, layout = {}) {
  if (!orders.length) {
    return [];
  }

  const minColumns = layout.minColumns ?? defaultMasonryLayout.minColumns;
  const maxCardsPerColumn = layout.maxCardsPerColumn ?? defaultMasonryLayout.maxCardsPerColumn;
  const maxColumns = layout.maxColumns ?? defaultMasonryLayout.maxColumns;
  const targetColumnHeight = layout.targetColumnHeight ?? defaultMasonryLayout.targetColumnHeight;
  const columns = [{ orders: [], height: 0 }];

  orders.forEach((order) => {
    const estimatedHeight = estimateCardHeight(order) + 12;
    let target = columns[columns.length - 1];
    const shouldStartNextColumn =
      target.orders.length > 0 &&
      columns.length < maxColumns &&
      (target.orders.length >= maxCardsPerColumn || target.height + estimatedHeight > targetColumnHeight);

    if (shouldStartNextColumn) {
      target = { orders: [], height: 0 };
      columns.push(target);
    }

    target.orders.push(order);
    target.height += estimatedHeight;
  });

  while (columns.length < minColumns) {
    columns.push({ orders: [], height: 0 });
  }

  return columns.map((column) => column.orders);
}

export function resolveMasonryColumnCount(orderCount, layout = {}) {
  if (orderCount <= 0) {
    return 0;
  }

  const minColumns = layout.minColumns ?? defaultMasonryLayout.minColumns;
  const maxCardsPerColumn = layout.maxCardsPerColumn ?? defaultMasonryLayout.maxCardsPerColumn;
  const maxColumns = layout.maxColumns ?? defaultMasonryLayout.maxColumns;
  const calculatedColumns = layout.columnCount ?? Math.ceil(orderCount / maxCardsPerColumn);

  return Math.min(Math.max(minColumns, calculatedColumns), maxColumns);
}

export function estimateCardHeight(order) {
  const hasOptions = order.options.length > 0;
  const chipRows = hasOptions ? Math.ceil(Math.min(order.options.length, chipLimit) / 2) : 0;
  const hasMemo = Boolean(order.memo);
  const optionHeight = chipRows * 28 + (optionOverflow(order) > 0 ? 26 : 0);
  const memoHeight = hasMemo ? (isMemoOmitted(order) ? 76 : 42) : 0;
  const separatorHeight = hasOptions && hasMemo ? 18 : 0;
  return 58 + optionHeight + memoHeight + separatorHeight;
}

export function isOverdue(order) {
  return order.elapsed >= 15;
}

export function isUndoable(order) {
  return order.status === 'undoable';
}

export function visibleOptions(order) {
  return order.options.slice(0, chipLimit);
}

export function optionOverflow(order) {
  return Math.max(order.options.length - chipLimit, 0);
}

export function memoLines(order) {
  if (!order.memo) {
    return [];
  }

  return order.memo.match(/.{1,21}/g) ?? [order.memo];
}

export function memoPreviewLines(order) {
  return memoLines(order).slice(0, 2);
}

export function isMemoOmitted(order) {
  return memoLines(order).length > 2;
}

export function detailMemoLines(order) {
  return memoLines(order);
}

export function hasBody(order) {
  return order.options.length > 0 || Boolean(order.memo);
}

export function buttonLabel(order) {
  return isUndoable(order) ? '↺ 取消' : '✓ 完了';
}

export function undoRemainingMs(order, nowMs) {
  if (!isUndoable(order)) {
    return 0;
  }

  const windowMs = order.undoWindowMs ?? undoWindowMs;
  const startedAt = order.undoStartedAtMs ?? nowMs;
  return Math.max(windowMs - (nowMs - startedAt), 0);
}

export function undoProgressPercent(order, nowMs) {
  const windowMs = order.undoWindowMs ?? undoWindowMs;
  return Math.round((undoRemainingMs(order, nowMs) / windowMs) * 100);
}

export function formatUndoRemaining(order, nowMs) {
  return `残り ${Math.ceil(undoRemainingMs(order, nowMs) / 1000)}秒`;
}
