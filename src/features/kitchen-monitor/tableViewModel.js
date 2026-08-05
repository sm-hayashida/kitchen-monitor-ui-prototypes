import {
  estimateOrderItemHeight,
  estimateOrderMemoHeight,
} from './orderCardSegments.js';

const DEFAULT_TABLE_CONTENT_BUDGET = 320;
const TABLE_CARD_HEADER_HEIGHT = 43;
const TABLE_CARD_SUMMARY_HEIGHT = 31;
const TABLE_CARD_BORDER_HEIGHT = 2;
const TABLE_CARD_MEASUREMENT_TOLERANCE = 6;
const TABLE_CARD_CHROME_HEIGHT =
  TABLE_CARD_HEADER_HEIGHT + TABLE_CARD_SUMMARY_HEIGHT + TABLE_CARD_BORDER_HEIGHT;
const ORDER_GROUP_HEADER_HEIGHT = 25;

function tableNumber(tableNo) {
  return Number.parseInt(tableNo.replace(/\D/g, ''), 10) || Number.MAX_SAFE_INTEGER;
}

export function createTableGroups(orders) {
  const groupsByTable = new Map();

  orders.forEach((order) => {
    const tableId = order.table_session_id ?? order.table_no;
    const table = groupsByTable.get(tableId) ?? {
      id: tableId,
      table_info_id: order.table_info_id ?? order.table_no,
      table_no: order.table_no,
      table_name: order.table_name ?? order.table_no,
      table_category: order.table_category ?? '未分類',
      table_sort: order.table_sort ?? Number.MAX_SAFE_INTEGER,
      orders: [],
      earliest_elapsed_minutes: 0,
      latest_elapsed_minutes: Number.MAX_SAFE_INTEGER,
      guest_count: 0,
      total_quantity: 0,
    };

    table.orders.push(order);
    table.earliest_elapsed_minutes = Math.max(
      table.earliest_elapsed_minutes,
      order.ordered_elapsed_minutes,
    );
    table.latest_elapsed_minutes = Math.min(
      table.latest_elapsed_minutes,
      order.ordered_elapsed_minutes,
    );
    table.guest_count = Math.max(table.guest_count, order.guest_count);
    table.total_quantity += order.items.reduce((total, item) => total + item.quantity, 0);
    groupsByTable.set(tableId, table);
  });

  return [...groupsByTable.values()].map((table) => ({
    ...table,
    orders: [...table.orders].sort(
      (left, right) => right.ordered_elapsed_minutes - left.ordered_elapsed_minutes,
    ),
  }));
}

export function groupTablesByCategory(tableGroups) {
  const categoryGroups = new Map();

  tableGroups.forEach((table) => {
    const categoryId = table.table_category || '未分類';
    const group = categoryGroups.get(categoryId) ?? {
      id: categoryId,
      name: categoryId,
      sort: table.table_sort,
      tables: [],
    };

    group.sort = Math.min(group.sort, table.table_sort);
    group.tables.push(table);
    categoryGroups.set(categoryId, group);
  });

  return [...categoryGroups.values()].sort(
    (left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'ja'),
  );
}

export function sortTableGroups(
  tableGroups,
  { pinnedTableIds = new Set(), manualOrder = [], sortMode = 'oldest' } = {},
) {
  const manualRanks = new Map(manualOrder.map((tableId, index) => [tableId, index]));

  return [...tableGroups].sort((left, right) => {
    const leftPinned = pinnedTableIds.has(left.id);
    const rightPinned = pinnedTableIds.has(right.id);

    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    if (leftPinned || sortMode === 'manual') {
      return (manualRanks.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (manualRanks.get(right.id) ?? Number.MAX_SAFE_INTEGER);
    }

    if (sortMode === 'table') {
      return tableNumber(left.table_no) - tableNumber(right.table_no);
    }

    if (sortMode === 'latest') {
      return left.latest_elapsed_minutes - right.latest_elapsed_minutes;
    }

    return right.earliest_elapsed_minutes - left.earliest_elapsed_minutes;
  });
}

function createOrderEntries(table) {
  return table.orders.flatMap((order, orderIndex) =>
    order.items.map((orderItem, orderItemIndex) => ({
      order,
      orderIndex,
      orderItem,
      isOrderStart: orderItemIndex === 0,
    })),
  );
}

function createOrderGroups(entries) {
  return entries.reduce((orderGroups, {
    isOrderStart,
    order,
    orderIndex,
    orderItem,
  }) => {
    let targetOrderGroup = orderGroups.at(-1);

    if (targetOrderGroup?.order_id !== order.id) {
      targetOrderGroup = {
        order_id: order.id,
        order_index: orderIndex + 1,
        elapsed_minutes: order.ordered_elapsed_minutes,
        order_memo: order.order_memo,
        show_order_memo: isOrderStart,
        items: [],
      };
      orderGroups.push(targetOrderGroup);
    }

    targetOrderGroup.items.push({
      ...orderItem,
      source_order_id: order.id,
    });
    return orderGroups;
  }, []);
}

function estimateEntriesHeight(entries, estimateOptions) {
  let previousOrderId = null;

  return entries.reduce((height, { isOrderStart, order, orderItem }) => {
    const dividerHeight =
      order.id === previousOrderId
        ? 0
        : ORDER_GROUP_HEADER_HEIGHT + (
          isOrderStart ? estimateOrderMemoHeight(order.order_memo, estimateOptions) : 0
        );
    previousOrderId = order.id;
    return height + dividerHeight + estimateOrderItemHeight(orderItem, estimateOptions);
  }, 0);
}

function takeEntriesWithinHeight(entries, contentBudget, estimateOptions) {
  const chunk = [];
  let chunkHeight = 0;
  let previousOrderId = null;

  for (const entry of entries) {
    const dividerHeight =
      entry.order.id === previousOrderId
        ? 0
        : ORDER_GROUP_HEADER_HEIGHT + (
          entry.isOrderStart
            ? estimateOrderMemoHeight(entry.order.order_memo, estimateOptions)
            : 0
        );
    const additionalHeight = dividerHeight + estimateOrderItemHeight(entry.orderItem, estimateOptions);

    if (chunk.length > 0 && chunkHeight + additionalHeight > contentBudget) {
      break;
    }

    chunk.push(entry);
    chunkHeight += additionalHeight;
    previousOrderId = entry.order.id;
  }

  return [chunk, entries.slice(chunk.length)];
}

function splitTableEntries(entries, maxCardHeight, estimateOptions) {
  const fullCardBudget = Math.max(
    ORDER_GROUP_HEADER_HEIGHT + 43,
    Math.floor(maxCardHeight - TABLE_CARD_CHROME_HEIGHT),
  );

  if (estimateEntriesHeight(entries, estimateOptions) <= fullCardBudget) {
    return [entries];
  }

  const firstCardBudget = Math.max(
    ORDER_GROUP_HEADER_HEIGHT + 43,
    Math.floor(maxCardHeight - TABLE_CARD_HEADER_HEIGHT - TABLE_CARD_BORDER_HEIGHT),
  );
  const middleCardBudget = Math.max(
    ORDER_GROUP_HEADER_HEIGHT + 43,
    Math.floor(maxCardHeight - TABLE_CARD_BORDER_HEIGHT),
  );
  const lastCardBudget = Math.max(
    ORDER_GROUP_HEADER_HEIGHT + 43,
    Math.floor(maxCardHeight - TABLE_CARD_SUMMARY_HEIGHT - TABLE_CARD_BORDER_HEIGHT),
  );
  const chunks = [];
  let [firstChunk, remainingEntries] = takeEntriesWithinHeight(
    entries,
    firstCardBudget,
    estimateOptions,
  );

  if (remainingEntries.length === 0) {
    if (firstChunk.length === 1) {
      return [firstChunk];
    }
    remainingEntries = firstChunk.slice(-1);
    firstChunk = firstChunk.slice(0, -1);
  }
  chunks.push(firstChunk);

  while (remainingEntries.length > 0) {
    if (estimateEntriesHeight(remainingEntries, estimateOptions) <= lastCardBudget) {
      chunks.push(remainingEntries);
      break;
    }

    let [middleChunk, nextEntries] = takeEntriesWithinHeight(
      remainingEntries,
      middleCardBudget,
      estimateOptions,
    );

    if (nextEntries.length === 0 && middleChunk.length > 1) {
      nextEntries = middleChunk.slice(-1);
      middleChunk = middleChunk.slice(0, -1);
    }
    chunks.push(middleChunk);
    remainingEntries = nextEntries;
  }

  return chunks;
}

export function estimateTableCardHeight(table, estimateOptions = {}) {
  const contentHeight = table.order_groups.reduce(
    (height, orderGroup) =>
      height +
      ORDER_GROUP_HEADER_HEIGHT +
      (orderGroup.show_order_memo
        ? estimateOrderMemoHeight(orderGroup.order_memo, estimateOptions)
        : 0) +
      orderGroup.items.reduce(
        (itemHeight, orderItem) =>
          itemHeight + estimateOrderItemHeight(orderItem, estimateOptions),
        0,
      ),
    0,
  );

  return (
    contentHeight +
    (table.is_first_segment ? TABLE_CARD_HEADER_HEIGHT : 0) +
    (table.is_last_segment ? TABLE_CARD_SUMMARY_HEIGHT : 0) +
    TABLE_CARD_BORDER_HEIGHT +
    TABLE_CARD_MEASUREMENT_TOLERANCE
  );
}

export function createTableCardSegments(tableGroups, {
  maxCardHeight,
  estimateOptions = {},
} = {}) {
  return tableGroups.flatMap((table) => {
    const entries = createOrderEntries(table);
    let chunks;

    if (Number.isFinite(maxCardHeight)) {
      chunks = splitTableEntries(entries, maxCardHeight, estimateOptions);
    } else {
      chunks = [];
      let remainingEntries = entries;

      while (remainingEntries.length > 0) {
        const [chunk, nextEntries] = takeEntriesWithinHeight(
          remainingEntries,
          DEFAULT_TABLE_CONTENT_BUDGET,
          estimateOptions,
        );
        chunks.push(chunk);
        remainingEntries = nextEntries;
      }
    }

    return chunks.map((segmentEntries, index) => {
      const segmentOrderGroups = createOrderGroups(segmentEntries);

      return {
        ...table,
        id: `${table.id}-segment-${index + 1}`,
        source_order_id: table.id,
        source_table_id: table.id,
        segment_index: index + 1,
        segment_count: chunks.length,
        is_first_segment: index === 0,
        is_last_segment: index === chunks.length - 1,
        order_groups: segmentOrderGroups,
        items: segmentOrderGroups.flatMap((orderGroup) => orderGroup.items),
      };
    });
  });
}
