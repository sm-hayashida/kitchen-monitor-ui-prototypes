export function getOrderItemDisplayName(orderItem) {
  return orderItem.kitchen_print_name || orderItem.name;
}

export function getOrderItemAggregateKey(orderItem) {
  return `${orderItem.course_id || 'uncoursed'}::${orderItem.menu_id}`;
}

export function getOrderItemInlineDetails(orderItem) {
  return {
    visibleToppings: orderItem.toppings,
    hiddenToppingCount: 0,
    memo: orderItem.memo,
    hasTruncatedMemo: false,
    hasOverflow: false,
  };
}
