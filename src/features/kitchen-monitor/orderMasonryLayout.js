import {
  estimateOrderItemHeight,
  estimateOrderMemoHeight,
} from './orderCardSegments.js';

const CARD_GAP = 14;
const COMPACT_HEADER_HEIGHT = 37;
const COMPLETE_FOOTER_HEIGHT = 34;
const CARD_BORDER_HEIGHT = 2;
const CARD_MEASUREMENT_TOLERANCE = 6;

export function estimateOrderCardHeight(order) {
  const isContinuation = (order.segment_index ?? 1) > 1;
  const isLastSegment = order.is_last_segment ?? true;
  const itemHeight = order.items.reduce(
    (height, orderItem) => height + estimateOrderItemHeight(orderItem),
    0,
  );

  return (
    itemHeight +
    (isContinuation ? 0 : COMPACT_HEADER_HEIGHT) +
    (isContinuation ? 0 : estimateOrderMemoHeight(order.order_memo)) +
    (isLastSegment ? COMPLETE_FOOTER_HEIGHT : 0) +
    CARD_BORDER_HEIGHT +
    CARD_MEASUREMENT_TOLERANCE
  );
}

function estimateColumnHeight(orders, estimateCardHeight = estimateOrderCardHeight) {
  if (!orders.length) {
    return 0;
  }

  return (
    orders.reduce((height, order) => height + estimateCardHeight(order), 0) +
    CARD_GAP * (orders.length - 1)
  );
}

export function createOrderedMasonryColumns(
  orders,
  columnCount = 3,
  estimateCardHeight = estimateOrderCardHeight,
) {
  if (!orders.length) {
    return Array.from({ length: columnCount }, () => []);
  }

  const activeColumnCount = Math.min(columnCount, orders.length);
  let bestColumns = null;
  let bestScore = null;

  function visit(startIndex, columnsLeft, columns) {
    if (columnsLeft === 1) {
      const candidate = [...columns, orders.slice(startIndex)];
      const heights = candidate.map((column) => estimateColumnHeight(column, estimateCardHeight));
      const score = [Math.max(...heights), Math.max(...heights) - Math.min(...heights)];

      if (
        !bestScore ||
        score[0] < bestScore[0] ||
        (score[0] === bestScore[0] && score[1] < bestScore[1])
      ) {
        bestColumns = candidate;
        bestScore = score;
      }
      return;
    }

    const lastEndIndex = orders.length - columnsLeft + 1;
    for (let endIndex = startIndex + 1; endIndex <= lastEndIndex; endIndex += 1) {
      visit(endIndex, columnsLeft - 1, [...columns, orders.slice(startIndex, endIndex)]);
    }
  }

  visit(0, activeColumnCount, []);

  return [
    ...bestColumns,
    ...Array.from({ length: columnCount - activeColumnCount }, () => []),
  ];
}

export function createCompactFlowColumns(
  orders,
  {
    estimateCardHeight = estimateOrderCardHeight,
    maxColumnHeight = 410,
  } = {},
) {
  if (!orders.length) {
    return [];
  }

  const columns = [];
  let currentColumn = [];
  let currentHeight = 0;

  orders.forEach((order) => {
    const cardHeight = estimateCardHeight(order);
    const nextHeight =
      currentHeight + cardHeight + (currentColumn.length > 0 ? CARD_GAP : 0);

    if (currentColumn.length > 0 && nextHeight > maxColumnHeight) {
      columns.push(currentColumn);
      currentColumn = [order];
      currentHeight = cardHeight;
      return;
    }

    currentColumn.push(order);
    currentHeight = nextHeight;
  });

  if (currentColumn.length > 0) {
    columns.push(currentColumn);
  }

  return columns;
}

export function createOrderedMasonryPages(
  orders,
  {
    columnCount = 3,
    estimateCardHeight = estimateOrderCardHeight,
    maxColumnHeight = 410,
  } = {},
) {
  const emptyPage = Array.from({ length: columnCount }, () => []);

  if (!orders.length) {
    return [emptyPage];
  }

  const pages = [];
  let pageOrders = [];
  const orderGroups = [];

  function addOrdersToPage(ordersToAdd) {
    const candidateOrders = [...pageOrders, ...ordersToAdd];
    const candidateColumns = createOrderedMasonryColumns(
      candidateOrders,
      columnCount,
      estimateCardHeight,
    );
    const candidateHeight = Math.max(
      ...candidateColumns.map((column) => estimateColumnHeight(column, estimateCardHeight)),
    );

    if (candidateHeight <= maxColumnHeight) {
      pageOrders = candidateOrders;
      return;
    }

    if (pageOrders.length > 0) {
      pages.push(createOrderedMasonryColumns(pageOrders, columnCount, estimateCardHeight));
      pageOrders = [];
      addOrdersToPage(ordersToAdd);
      return;
    }

    if (ordersToAdd.length > 1) {
      ordersToAdd.forEach((order) => addOrdersToPage([order]));
      return;
    }

    pageOrders = ordersToAdd;
  }

  orders.forEach((order) => {
    const sourceOrderId = order.source_order_id ?? order.id;
    const lastGroup = orderGroups.at(-1);

    if (lastGroup?.sourceOrderId === sourceOrderId) {
      lastGroup.orders.push(order);
      return;
    }

    orderGroups.push({ sourceOrderId, orders: [order] });
  });

  orderGroups.forEach((orderGroup) => addOrdersToPage(orderGroup.orders));

  pages.push(createOrderedMasonryColumns(pageOrders, columnCount, estimateCardHeight));
  return pages;
}
