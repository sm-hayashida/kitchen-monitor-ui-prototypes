import {
  getOrderItemDisplayName,
  getOrderItemInlineDetails,
} from './orderItemPresentation';

const ITEM_HEIGHT = 43;
const ORDER_CARD_CHROME_HEIGHT = 73;
const ORDER_MEMO_PREVIEW_HEIGHT = 34;
const ROW_HEIGHT_BY_SPACING = Object.freeze({
  compact: 38,
  standard: ITEM_HEIGHT,
  comfortable: 52,
});
const DETAIL_LINE_HEIGHT_BY_SPACING = Object.freeze({
  compact: 12,
  standard: 13,
  comfortable: 15,
});

const ITEM_BUDGET_BY_LAYOUT = {
  'n-paged': 380,
  'n-scroll': 380,
};

function visibleInfoSet(visibleInfo) {
  return visibleInfo instanceof Set
    ? visibleInfo
    : new Set(visibleInfo ?? ['course', 'options', 'itemMemo', 'orderMemo', 'aggregate', 'bulkComplete']);
}

function charactersPerLine(cardMinWidth, reservedWidth, averageCharacterWidth) {
  const textWidth = Math.max(96, Number(cardMinWidth) - reservedWidth);
  return Math.max(9, Math.floor(textWidth / averageCharacterWidth));
}

export function estimateOrderItemHeight(orderItem, {
  cardMinWidth = 290,
  rowSpacing = 'standard',
  visibleInfo,
} = {}) {
  const displayName = getOrderItemDisplayName(orderItem);
  const inlineDetails = getOrderItemInlineDetails(orderItem);
  const info = visibleInfoSet(visibleInfo);
  const nameCharactersPerLine = charactersPerLine(cardMinWidth, 92, 8);
  const detailCharactersPerLine = charactersPerLine(cardMinWidth, 92, 7);
  const nameLineCount = Math.max(
    1,
    Math.ceil(displayName.length / nameCharactersPerLine),
  );
  const optionCharacterCount =
    (info.has('course') ? orderItem.course_name?.length ?? 0 : 0) +
    (info.has('options') ? inlineDetails.visibleToppings : []).reduce(
      (length, topping) => length + topping.name.length + 3,
      0,
    );
  const optionLineCount = optionCharacterCount
    ? Math.ceil(optionCharacterCount / detailCharactersPerLine)
    : 0;
  const memoLineCount = info.has('itemMemo') && inlineDetails.memo
    ? Math.ceil(inlineDetails.memo.length / detailCharactersPerLine)
    : 0;
  const extraNameHeight = (nameLineCount - 1) * 15;
  const detailLineCount = optionLineCount + memoLineCount;
  const extraDetailHeight = Math.max(0, detailLineCount - 1) *
    (DETAIL_LINE_HEIGHT_BY_SPACING[rowSpacing] ?? DETAIL_LINE_HEIGHT_BY_SPACING.standard);

  return (ROW_HEIGHT_BY_SPACING[rowSpacing] ?? ITEM_HEIGHT) + extraNameHeight + extraDetailHeight;
}

export function estimateOrderMemoHeight(orderMemo, {
  cardMinWidth = 290,
  visibleInfo,
} = {}) {
  if (!orderMemo || !visibleInfoSet(visibleInfo).has('orderMemo')) {
    return 0;
  }

  return Math.max(
    ORDER_MEMO_PREVIEW_HEIGHT,
    10 + Math.ceil(orderMemo.length / charactersPerLine(cardMinWidth, 62, 7)) * 14,
  );
}

function splitItemsByHeight(items, itemBudget, estimateOptions) {
  const chunks = [];
  let chunk = [];
  let chunkHeight = 0;

  items.forEach((orderItem) => {
    const itemHeight = estimateOrderItemHeight(orderItem, estimateOptions);
    const exceedsBudget = chunk.length > 0 && chunkHeight + itemHeight > itemBudget;

    if (exceedsBudget) {
      chunks.push(chunk);
      chunk = [];
      chunkHeight = 0;
    }

    chunk.push(orderItem);
    chunkHeight += itemHeight;
  });

  if (chunk.length) {
    chunks.push(chunk);
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

  const itemBudget = Number.isFinite(maxCardHeight)
    ? Math.max(ITEM_HEIGHT, Math.floor(maxCardHeight - ORDER_CARD_CHROME_HEIGHT))
    : defaultItemBudget;

  return orders.flatMap((order) => {
    const orderItemBudget = Math.max(
      ITEM_HEIGHT,
      itemBudget - estimateOrderMemoHeight(order.order_memo, estimateOptions),
    );
    const chunks = splitItemsByHeight(order.items, orderItemBudget, estimateOptions);

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
