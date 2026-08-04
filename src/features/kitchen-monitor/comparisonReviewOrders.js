import { orderViewMockTableInfoList } from './orderViewMockData.js';

export const maxReviewOrderCount = 12;

export const reviewOrderCategoryOptions = Object.freeze([
  Object.freeze({ id: 'fried', label: '揚げ場' }),
  Object.freeze({ id: 'griddle', label: '鉄板・焼き' }),
  Object.freeze({ id: 'noodle', label: '麺・パスタ' }),
  Object.freeze({ id: 'salad', label: 'サラダ・前菜' }),
  Object.freeze({ id: 'dessert', label: 'デザート' }),
  Object.freeze({ id: 'drink', label: 'ドリンク' }),
]);

export const reviewOrderQuickPresets = Object.freeze([
  Object.freeze({
    id: 'course',
    label: 'コース4品',
    description: '同一コース4品・各2トッピング',
    draft: Object.freeze({
      itemName: 'レビューコース料理',
      itemCount: 4,
      quantity: 1,
      categoryId: 'fried',
      courseEnabled: true,
      courseName: 'レビューコース',
      toppingCount: 2,
      itemMemoLength: 24,
      orderMemoLength: 40,
    }),
  }),
  Object.freeze({
    id: 'toppings',
    label: 'トッピング12件',
    description: '1商品にオプションを12件表示',
    draft: Object.freeze({
      itemName: 'トッピング確認商品',
      itemCount: 1,
      quantity: 2,
      categoryId: 'griddle',
      courseEnabled: false,
      toppingCount: 12,
      itemMemoLength: 0,
      orderMemoLength: 0,
    }),
  }),
  Object.freeze({
    id: 'memo',
    label: '長文メモ',
    description: '商品120字・注文160字',
    draft: Object.freeze({
      itemName: '長文メモ確認商品',
      itemCount: 1,
      quantity: 1,
      categoryId: 'salad',
      courseEnabled: false,
      toppingCount: 0,
      itemMemoLength: 120,
      orderMemoLength: 160,
    }),
  }),
]);

const categoryIds = new Set(reviewOrderCategoryOptions.map((category) => category.id));
const tableInfoByNo = new Map(
  orderViewMockTableInfoList.map((table) => [table.tableNo, table]),
);

export function createDefaultReviewOrderDraft(index = 1) {
  return {
    id: '',
    tableNo: `R${index}`,
    elapsedMinutes: 8,
    guestCount: 2,
    itemName: 'レビュー商品',
    itemCount: 1,
    quantity: 1,
    categoryId: 'fried',
    courseEnabled: false,
    courseName: 'レビューコース',
    toppingCount: 0,
    itemMemoLength: 0,
    orderMemoLength: 0,
  };
}

export function createReviewOrderPresetDraft(presetId, index = 1) {
  const preset = reviewOrderQuickPresets.find((candidate) => candidate.id === presetId);
  return {
    ...createDefaultReviewOrderDraft(index),
    ...(preset?.draft ?? {}),
  };
}

export function normalizeReviewOrderDraft(candidate = {}, index = 1) {
  const defaults = createDefaultReviewOrderDraft(index);
  const courseEnabled = Boolean(candidate.courseEnabled);

  return {
    id: normalizeId(candidate.id, index),
    tableNo: textValue(candidate.tableNo, defaults.tableNo, 12),
    elapsedMinutes: integerValue(candidate.elapsedMinutes, 0, 60, defaults.elapsedMinutes),
    guestCount: integerValue(candidate.guestCount, 1, 20, defaults.guestCount),
    itemName: textValue(candidate.itemName, defaults.itemName, 40),
    itemCount: integerValue(candidate.itemCount, 1, 6, defaults.itemCount),
    quantity: integerValue(candidate.quantity, 1, 20, defaults.quantity),
    categoryId: categoryIds.has(candidate.categoryId) ? candidate.categoryId : defaults.categoryId,
    courseEnabled,
    courseName: courseEnabled
      ? textValue(candidate.courseName, defaults.courseName, 30)
      : '',
    toppingCount: integerValue(candidate.toppingCount, 0, 20, defaults.toppingCount),
    itemMemoLength: integerValue(candidate.itemMemoLength, 0, 500, defaults.itemMemoLength),
    orderMemoLength: integerValue(candidate.orderMemoLength, 0, 500, defaults.orderMemoLength),
  };
}

export function normalizeReviewOrderDrafts(candidates = []) {
  if (!Array.isArray(candidates)) {
    return [];
  }

  const usedIds = new Set();
  return candidates.slice(0, maxReviewOrderCount).map((candidate, index) => {
    const normalized = normalizeReviewOrderDraft(candidate, index + 1);
    let id = normalized.id;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${normalized.id}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    return { ...normalized, id };
  });
}

export function createReviewOrder(candidate, index = 1) {
  const draft = normalizeReviewOrderDraft(candidate, index);
  const table = tableInfoByNo.get(draft.tableNo);
  const orderId = `review-order-${draft.id}`;
  const courseId = draft.courseEnabled
    ? `review-course-${stableTextId(draft.courseName)}`
    : null;

  return {
    id: orderId,
    order_id: orderId,
    table_info_id: table?.tableInfoId ?? `review-table-${stableTextId(draft.tableNo)}`,
    table_no: draft.tableNo,
    table_name: table?.tableName ?? draft.tableNo,
    table_category: table?.tableCategory ?? 'レビュー追加',
    table_sort: table?.sort ?? 900 + index,
    ordered_elapsed_minutes: draft.elapsedMinutes,
    guest_count: draft.guestCount,
    items: Array.from({ length: draft.itemCount }, (_, itemIndex) =>
      createReviewOrderItem(draft, orderId, courseId, itemIndex),
    ),
    order_memo: createFixedLengthText('注文メモ', draft.orderMemoLength),
    order_source: 'reviewer',
    staff_name: 'レビュワー',
  };
}

export function summarizeReviewOrderDraft(candidate, index = 1) {
  const draft = normalizeReviewOrderDraft(candidate, index);
  const features = [`${draft.itemCount}品`, `数量${draft.quantity}`];
  if (draft.courseEnabled) {
    features.push(draft.courseName);
  }
  if (draft.toppingCount > 0) {
    features.push(`トッピング${draft.toppingCount}件`);
  }
  if (draft.itemMemoLength > 0 || draft.orderMemoLength > 0) {
    features.push(`メモ${draft.itemMemoLength}/${draft.orderMemoLength}字`);
  }
  return {
    id: draft.id,
    tableNo: draft.tableNo,
    itemName: draft.itemName,
    features,
  };
}

function createReviewOrderItem(draft, orderId, courseId, itemIndex) {
  const orderItemId = `${orderId}-item-${itemIndex + 1}`;
  const displayName = draft.itemCount === 1
    ? draft.itemName
    : `${draft.itemName} ${itemIndex + 1}`;
  const toppings = Array.from({ length: draft.toppingCount }, (_, toppingIndex) => ({
    id: `${orderItemId}-topping-${toppingIndex + 1}`,
    name: `追加オプション${String(toppingIndex + 1).padStart(2, '0')}`,
    quantity: 1,
  }));

  return {
    order_item_id: orderItemId,
    menu_id: `review-menu-${stableTextId(displayName)}`,
    category_id: draft.categoryId,
    name: displayName,
    quantity: draft.quantity,
    toppings,
    memo: createFixedLengthText(`商品メモ${itemIndex + 1}`, draft.itemMemoLength),
    course_id: courseId,
    course_name: draft.courseEnabled ? draft.courseName : null,
    kitchen_print_name: null,
    target_minutes: null,
    status: 'ordered',
    chef_status: 'uncooked',
  };
}

function createFixedLengthText(label, length) {
  if (length <= 0) {
    return '';
  }
  const seed = `${label}：提供順、盛り付け、アレルギー、取り分け方法を確認してください。`;
  return seed.repeat(Math.ceil(length / seed.length)).slice(0, length);
}

function integerValue(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

function textValue(value, fallback, maxLength) {
  const normalized = String(value ?? '').trim();
  return (normalized || fallback).slice(0, maxLength);
}

function normalizeId(value, index) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `review-${index}`;
}

function stableTextId(value) {
  let hash = 0;
  for (const character of String(value)) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }
  return hash.toString(36);
}
