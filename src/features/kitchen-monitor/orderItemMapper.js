import { createMasonryColumns, isOverdue } from './orderPresentation';

export function buildDishSections(orderItems, nowMs, { stationByCategoryId = {}, masonryLayoutByMenuId = {} } = {}) {
  const groups = new Map();
  const sortedItems = [...orderItems].sort(compareOrderItemAge);

  sortedItems.forEach((item, index) => {
    if (!shouldShowOrderItem(item)) {
      return;
    }

    const groupKey = createDishGroupKey(item);
    const group = getOrCreateGroup(groups, groupKey, item, stationByCategoryId);
    group.orders.push(toOrderCard(item, nowMs, index));
  });

  return [...groups.values()].map((group) => {
    const layout = masonryLayoutByMenuId[group.menuId] ?? {};
    const orders = group.orders;

    return {
      ...group,
      orders,
      totalQuantity: orders.reduce((sum, order) => sum + order.quantity, 0),
      overdueCount: orders.filter((order) => isOverdue(order)).length,
      columns: createMasonryColumns(orders, layout),
    };
  });
}

export function toOrderCard(item, nowMs, index = 0) {
  const orderedAtMs = parseDateMs(item.ordered_date) ?? parseDateMs(item.created_at) ?? nowMs;

  return {
    id: String(item.id),
    orderItemId: String(item.order_item_id ?? item.id),
    orderId: String(item.order_id ?? ''),
    categoryId: String(item.category_id ?? ''),
    menuId: String(item.menu_id ?? ''),
    tableNo: resolveTableName(item.tables),
    elapsed: Math.max(Math.floor((nowMs - orderedAtMs) / 60000), 0),
    quantity: Number(item.quantity ?? 1),
    options: normalizeToppings(item.toppings),
    memo: item.memo ?? '',
    status: resolveUiStatus(item),
    undoStartedAtMs: item.mock_undo_started_at_ms,
    undoWindowMs: item.mock_undo_window_ms,
    createdOffset: item.mock_created_sequence ?? index,
    orderedAtMs,
    source: item,
  };
}

export function compareOrderItemAge(a, b) {
  return (
    (parseDateMs(a.ordered_date) ?? Number.MAX_SAFE_INTEGER) -
      (parseDateMs(b.ordered_date) ?? Number.MAX_SAFE_INTEGER) ||
    (parseDateMs(a.created_at) ?? Number.MAX_SAFE_INTEGER) -
      (parseDateMs(b.created_at) ?? Number.MAX_SAFE_INTEGER) ||
    String(a.id).localeCompare(String(b.id), 'ja')
  );
}

function shouldShowOrderItem(item) {
  return Boolean(item) && !item.cooked_once;
}

function getOrCreateGroup(groups, key, item, stationByCategoryId) {
  if (!groups.has(key)) {
    const categoryId = String(item.category_id ?? '');
    const menuId = String(item.menu_id ?? item.name ?? key);

    groups.set(key, {
      id: `dish-${menuId}`,
      categoryId,
      menuId,
      name: item.name ?? '名称未設定',
      station: stationByCategoryId[categoryId] ?? '未割当',
      orders: [],
    });
  }

  return groups.get(key);
}

function createDishGroupKey(item) {
  return [item.category_id ?? '', item.menu_id ?? '', item.name ?? ''].join(':');
}

function resolveUiStatus(item) {
  if (item.mock_ui_status) {
    return item.mock_ui_status;
  }

  return String(item.chef_status ?? '').includes('undo') ? 'undoable' : 'normal';
}

function resolveTableName(tables) {
  if (!Array.isArray(tables) || tables.length === 0) {
    return 'T-';
  }

  return tables
    .map((table) => table.name ?? table.table_id)
    .filter(Boolean)
    .join(' / ');
}

function normalizeToppings(toppings) {
  if (!Array.isArray(toppings)) {
    return [];
  }

  return toppings
    .map((topping) => {
      if (typeof topping === 'string') {
        return topping;
      }

      return topping.name ?? topping.topping_name ?? topping.custom_content_name ?? '';
    })
    .filter(Boolean);
}

function parseDateMs(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}
