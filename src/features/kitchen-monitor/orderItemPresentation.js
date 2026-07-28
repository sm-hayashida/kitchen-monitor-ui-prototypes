export const INLINE_TOPPING_LIMIT = 3;
export const INLINE_MEMO_LIMIT = 24;

export function getOrderItemDisplayName(orderItem) {
  return orderItem.kitchen_print_name || orderItem.name;
}

export function getOrderItemAggregateKey(orderItem) {
  return `${orderItem.course_id || 'uncoursed'}::${orderItem.menu_id}`;
}

export function getOrderItemInlineDetails(orderItem) {
  const visibleToppings = orderItem.toppings;

  return {
    visibleToppings,
    hiddenToppingCount: 0,
    memo: orderItem.memo,
    hasTruncatedMemo: false,
    hasOverflow: false,
  };
}
