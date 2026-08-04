import {
  getOrderItemDisplayName,
  getOrderItemInlineDetails,
} from './orderItemPresentation';

const ITEM_HEIGHT = 43;
const ORDER_CARD_CHROME_HEIGHT = 73;
const ORDER_MEMO_PREVIEW_HEIGHT = 34;
const ESTIMATED_NAME_CHARACTERS_PER_LINE = 16;
const ESTIMATED_DETAIL_CHARACTERS_PER_LINE = 20;

const ITEM_BUDGET_BY_LAYOUT = {
  'n-paged': 380,
  'n-scroll': 380,
};

export function estimateOrderItemHeight(orderItem) {
  const displayName = getOrderItemDisplayName(orderItem);
  const inlineDetails = getOrderItemInlineDetails(orderItem);
  const nameLineCount = Math.max(
    1,
    Math.ceil(displayName.length / ESTIMATED_NAME_CHARACTERS_PER_LINE),
  );
  const optionCharacterCount =
    (orderItem.course_name?.length ?? 0) +
    inlineDetails.visibleToppings.reduce(
      (length, topping) => length + topping.name.length + 3,
      0,
    );
  const optionLineCount = optionCharacterCount
    ? Math.ceil(optionCharacterCount / ESTIMATED_DETAIL_CHARACTERS_PER_LINE)
    : 0;
  const memoLineCount = inlineDetails.memo
    ? Math.ceil(inlineDetails.memo.length / ESTIMATED_DETAIL_CHARACTERS_PER_LINE)
    : 0;
  const extraNameHeight = (nameLineCount - 1) * 15;
  const detailLineCount = optionLineCount + memoLineCount;
  const extraDetailHeight = Math.max(0, detailLineCount - 1) * 13;

  return ITEM_HEIGHT + extraNameHeight + extraDetailHeight;
}

export function estimateOrderMemoHeight(orderMemo) {
  if (!orderMemo) {
    return 0;
  }

  return Math.max(
    ORDER_MEMO_PREVIEW_HEIGHT,
    10 + Math.ceil(orderMemo.length / 26) * 14,
  );
}

function splitItemsByHeight(items, itemBudget) {
  const chunks = [];
  let chunk = [];
  let chunkHeight = 0;

  items.forEach((orderItem) => {
    const itemHeight = estimateOrderItemHeight(orderItem);
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

export function createOrderCardSegments(orders, layout, { maxCardHeight } = {}) {
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
      itemBudget - estimateOrderMemoHeight(order.order_memo),
    );
    const chunks = splitItemsByHeight(order.items, orderItemBudget);

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
