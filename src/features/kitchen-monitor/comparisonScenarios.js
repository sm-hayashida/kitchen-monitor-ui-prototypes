import { orderViewMockOrders } from './orderViewMockData.js';

const longScenarioOrderIds = ['order-1010', 'order-1001', 'order-1008'];
const memoScenarioOrderIds = ['order-1010', 'order-1001', 'order-1004', 'order-1008'];
const delayElapsedMinutes = [32, 25, 20, 15, 14, 13, 11, 8, 5, 2];
const quantityOverrides = new Map([
  ['1001-1', 14],
  ['1006-1', 8],
  ['1009-1', 9],
]);

export function createScenarioOrders(scenarioId = 'normal') {
  const baseOrders = cloneOrders(orderViewMockOrders);

  switch (scenarioId) {
    case 'peak':
      return [...baseOrders, ...createPeakOrders(orderViewMockOrders)];
    case 'long':
      return pickOrders(baseOrders, longScenarioOrderIds);
    case 'quantity':
      return baseOrders.map((order) => ({
        ...order,
        items: order.items.map((orderItem) =>
          quantityOverrides.has(orderItem.order_item_id)
            ? { ...orderItem, quantity: quantityOverrides.get(orderItem.order_item_id) }
            : orderItem,
        ),
      }));
    case 'memo':
      return pickOrders(baseOrders, memoScenarioOrderIds);
    case 'delay':
      return baseOrders.map((order, index) => ({
        ...order,
        ordered_elapsed_minutes: delayElapsedMinutes[index],
      }));
    case 'normal':
    default:
      return baseOrders;
  }
}

export function cloneOrders(orders) {
  return structuredClone(orders);
}

function createPeakOrders(orders) {
  return cloneOrders(orders.slice(1, 5)).map((order, index) => {
    const suffix = order.order_id.replace(/^order-/, '');
    const tableNumber = 41 + index;

    return {
      ...order,
      id: `peak-${order.id}`,
      order_id: `peak-${order.order_id}`,
      table_info_id: `peak-table-${suffix}`,
      table_no: `T${tableNumber}`,
      table_name: `T${tableNumber}`,
      table_category: 'ピーク',
      table_sort: 200 + index,
      ordered_elapsed_minutes: Math.max(1, order.ordered_elapsed_minutes - 2),
      items: order.items.map((orderItem) => ({
        ...orderItem,
        order_item_id: `peak-${orderItem.order_item_id}`,
        toppings: orderItem.toppings.map((topping) => ({
          ...topping,
          id: `peak-${topping.id}`,
        })),
      })),
    };
  });
}

function pickOrders(orders, orderIds) {
  return orderIds
    .map((orderId) => orders.find((order) => order.id === orderId))
    .filter(Boolean);
}
