export const INLINE_TOPPING_LIMIT = 3;
export const INLINE_MEMO_LIMIT = 24;

export function getOrderItemDisplayName(orderItem) {
  return orderItem.kitchen_print_name || orderItem.name;
}

export function getOrderItemAggregateKey(orderItem) {
  return `${orderItem.course_id || 'uncoursed'}::${orderItem.menu_id}`;
}

export function getOrderItemInlineDetails(orderItem) {
  const visibleToppings = orderItem.toppings.slice(0, INLINE_TOPPING_LIMIT);
  const hiddenToppingCount = Math.max(0, orderItem.toppings.length - visibleToppings.length);
  const hasTruncatedMemo = orderItem.memo.length > INLINE_MEMO_LIMIT;

  return {
    visibleToppings,
    hiddenToppingCount,
    memo: hasTruncatedMemo
      ? `${orderItem.memo.slice(0, INLINE_MEMO_LIMIT)}…`
      : orderItem.memo,
    hasTruncatedMemo,
    hasOverflow: hiddenToppingCount > 0 || hasTruncatedMemo,
  };
}
