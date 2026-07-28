import {
  getOrderItemDisplayName,
  getOrderItemInlineDetails,
} from './orderItemPresentation.js';

const ITEM_HEIGHT = 43;
const ORDER_CARD_HEADER_HEIGHT = 60;
const ORDER_CONTINUATION_HEADER_HEIGHT = 31;
const ORDER_CARD_FOOTER_HEIGHT = 43;
const ORDER_CARD_BORDER_HEIGHT = 2;
const ORDER_CARD_MEASUREMENT_TOLERANCE = 8;
const ORDER_MEMO_PREVIEW_HEIGHT = 34;

const ITEM_BUDGET_BY_LAYOUT = {
  z: 380,
  'n-paged': 380,
  'n-scroll': 380,
};

const ROW_SPACING_HEIGHT = Object.freeze({
  compact: 48,
  standard: 62,
  comfortable: 72,
});

const ROW_DETAIL_LINE_HEIGHT = Object.freeze({
  compact: 12,
  standard: 14,
  comfortable: 16,
});

function visibleInfoSet(visibleInfo) {
  return visibleInfo instanceof Set
    ? visibleInfo
    : new Set(visibleInfo ?? ['course', 'options', 'itemMemo', 'orderMemo', 'aggregate', 'bulkComplete']);
}

function isVisible(visibleInfo, key) {
  return visibleInfoSet(visibleInfo).has(key);
}

function estimateNameLineCount(displayName, cardMinWidth) {
  const textColumnWidth = Math.max(96, Number(cardMinWidth) - 112);
  const charactersPerLine = Math.max(9, Math.floor(textColumnWidth / 8));
  return Math.max(1, Math.ceil(displayName.length / charactersPerLine));
}

function estimateTextLineCount(text, cardMinWidth, averageCharacterWidth = 7) {
  const textColumnWidth = Math.max(96, Number(cardMinWidth) - 112);
  const charactersPerLine = Math.max(9, Math.floor(textColumnWidth / averageCharacterWidth));
  return Math.max(1, Math.ceil(String(text ?? '').length / charactersPerLine));
}

export function estimateOrderItemHeight(orderItem, {
  cardMinWidth = 290,
  rowSpacing = 'standard',
  visibleInfo,
} = {}) {
  const displayName = getOrderItemDisplayName(orderItem);
  const inlineDetails = getOrderItemInlineDetails(orderItem);
  const info = visibleInfoSet(visibleInfo);
  const baseHeight = ROW_SPACING_HEIGHT[rowSpacing] ?? ROW_SPACING_HEIGHT.standard;
  const detailLineHeight = ROW_DETAIL_LINE_HEIGHT[rowSpacing] ?? ROW_DETAIL_LINE_HEIGHT.standard;
  const hasOptionLine = Boolean(
    (info.has('course') && orderItem.course_name) ||
      (info.has('options') && inlineDetails.visibleToppings.length),
  );
  const hasMemoLine = Boolean(info.has('itemMemo') && inlineDetails.memo);
  const extraNameHeight = (estimateNameLineCount(displayName, cardMinWidth) - 1) * 18;
  const optionText = [
    info.has('course') ? orderItem.course_name : '',
    ...(info.has('options') ? inlineDetails.visibleToppings.map((topping) => topping.name) : []),
  ].filter(Boolean).join('・');
  const detailLineCount =
    (hasOptionLine ? estimateTextLineCount(optionText, cardMinWidth, 6) : 0) +
    (hasMemoLine ? estimateTextLineCount(inlineDetails.memo, cardMinWidth, 6) : 0);
  const extraDetailHeight = Math.max(0, detailLineCount - 1) * detailLineHeight;

  return baseHeight + extraNameHeight + extraDetailHeight;
}

function estimateItemsHeight(items, estimateOptions) {
  return items.reduce(
    (height, orderItem) => height + estimateOrderItemHeight(orderItem, estimateOptions),
    0,
  );
}

function takeItemsWithinHeight(items, itemBudget, estimateOptions) {
  const chunk = [];
  let chunkHeight = 0;

  for (const orderItem of items) {
    const itemHeight = estimateOrderItemHeight(orderItem, estimateOptions);
    const exceedsBudget = chunk.length > 0 && chunkHeight + itemHeight > itemBudget;

    if (exceedsBudget) {
      break;
    }

    chunk.push(orderItem);
    chunkHeight += itemHeight;
  }

  return [chunk, items.slice(chunk.length)];
}

function estimateOrderCardChromeHeight(order, {
  isFirstSegment = true,
  isLastSegment = true,
  visibleInfo,
} = {}) {
  return (
    (isFirstSegment ? ORDER_CARD_HEADER_HEIGHT : ORDER_CONTINUATION_HEADER_HEIGHT) +
    (isFirstSegment && isVisible(visibleInfo, 'orderMemo') && order.order_memo
      ? ORDER_MEMO_PREVIEW_HEIGHT
      : 0) +
    (isLastSegment && isVisible(visibleInfo, 'bulkComplete') ? ORDER_CARD_FOOTER_HEIGHT : 0) +
    ORDER_CARD_BORDER_HEIGHT +
    ORDER_CARD_MEASUREMENT_TOLERANCE
  );
}

export function estimateOrderCardHeight(order, estimateOptions = {}) {
  return (
    estimateItemsHeight(order.items, estimateOptions) +
    estimateOrderCardChromeHeight(order, {
      ...estimateOptions,
      isFirstSegment: order.is_first_segment ?? true,
      isLastSegment: order.is_last_segment ?? true,
    })
  );
}

function splitItemsByHeight(order, maxCardHeight, estimateOptions) {
  const items = order.items;
  const minimumItemBudget = estimateOrderItemHeight(items[0] ?? {}, estimateOptions);
  const fullCardBudget = Math.max(
    ITEM_HEIGHT,
    Math.floor(maxCardHeight - estimateOrderCardChromeHeight(order, {
      ...estimateOptions,
      isFirstSegment: true,
      isLastSegment: true,
    })),
  );

  if (estimateItemsHeight(items, estimateOptions) <= fullCardBudget) {
    return [items];
  }

  const firstCardBudget = Math.max(
    minimumItemBudget,
    Math.floor(maxCardHeight - estimateOrderCardChromeHeight(order, {
      ...estimateOptions,
      isFirstSegment: true,
      isLastSegment: false,
    })),
  );
  const middleCardBudget = Math.max(
    minimumItemBudget,
    Math.floor(maxCardHeight - estimateOrderCardChromeHeight(order, {
      ...estimateOptions,
      isFirstSegment: false,
      isLastSegment: false,
    })),
  );
  const lastCardBudget = Math.max(
    minimumItemBudget,
    Math.floor(maxCardHeight - estimateOrderCardChromeHeight(order, {
      ...estimateOptions,
      isFirstSegment: false,
      isLastSegment: true,
    })),
  );
  const chunks = [];
  let [firstChunk, remainingItems] = takeItemsWithinHeight(items, firstCardBudget, estimateOptions);

  chunks.push(firstChunk);

  while (remainingItems.length > 0) {
    if (estimateItemsHeight(remainingItems, estimateOptions) <= lastCardBudget) {
      chunks.push(remainingItems);
      break;
    }

    const [middleChunk, nextItems] = takeItemsWithinHeight(
      remainingItems,
      middleCardBudget,
      estimateOptions,
    );
    if (nextItems.length === 0 && middleChunk.length > 1) {
      chunks.push(middleChunk.slice(0, -1));
      remainingItems = middleChunk.slice(-1);
    } else {
      chunks.push(middleChunk);
      remainingItems = nextItems;
    }
  }

  return chunks;
}

export function createOrderCardSegments(orders, layout, {
  maxCardHeight,
  estimateOptions = {},
} = {}) {
  const defaultItemBudget = ITEM_BUDGET_BY_LAYOUT[layout];

  if (!defaultItemBudget) {
    return orders;
  }

  return orders.flatMap((order) => {
    const segmentMaxCardHeight = Number.isFinite(maxCardHeight)
      ? maxCardHeight
      : defaultItemBudget + estimateOrderCardChromeHeight(order, estimateOptions);
    const chunks = splitItemsByHeight(order, segmentMaxCardHeight, estimateOptions);

    return chunks.map((items, index) => ({
      ...order,
      id: `${order.id}-segment-${index + 1}`,
      source_order_id: order.id,
      segment_index: index + 1,
      segment_count: chunks.length,
      is_first_segment: index === 0,
      is_last_segment: index === chunks.length - 1,
      items,
    }));
  });
}
