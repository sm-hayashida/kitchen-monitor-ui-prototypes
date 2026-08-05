export const orderCompletionWindowMs = 3000;

export const orderViewCategoryDefinitions = [
  { id: 'all', name: '全て' },
  { id: 'fried', name: '揚げ場', alert: true },
  { id: 'griddle', name: '鉄板・焼き' },
  { id: 'noodle', name: '麺・パスタ' },
  { id: 'salad', name: 'サラダ・前菜' },
  { id: 'dessert', name: 'デザート' },
  { id: 'drink', name: 'ドリンク' },
];

// Waiter settings API の tableInfoList（tableCategory / sort）に寄せた固定マスタ。
export const orderViewMockTableInfoList = [
  tableInfo('table-2', 'T2', 'ホール', 10),
  tableInfo('table-4', 'T4', 'ホール', 20),
  tableInfo('table-7', 'T7', 'ホール', 30),
  tableInfo('table-8', 'T8', 'ホール', 40),
  tableInfo('table-12', 'T12', '個室', 50),
  tableInfo('table-14', 'T14', '個室', 60),
  tableInfo('table-19', 'T19', '個室', 70),
  tableInfo('table-22', 'T22', 'カウンター', 80),
  tableInfo('table-31', 'T31', 'カウンター', 90),
];

const tableInfoByNo = new Map(
  orderViewMockTableInfoList.map((table) => [table.tableNo, table]),
);

// 本体APIの命名に寄せた、注文単位の固定レスポンスモック。
export const orderViewMockOrders = [
  createOrder('order-1001', 'T2', 19, 2, [
    item('1001-1', 'draft-beer', '生ビール', 8, 'drink', ['泡少なめ']),
    item(
      '1001-2',
      'salt-ramen',
      '塩ラーメン',
      1,
      'noodle',
      ['麺かため'],
      '先に提供',
      { target_minutes: 12 },
    ),
    item('1001-3', 'shochu', '焼酎', 1, 'drink', ['水割り']),
  ], {
    order_memo: '生ビールを先に提供し、麺類は全員分をできるだけ同時にお願いします。',
    order_source: 'staff',
    staff_name: '佐藤',
  }),
  createOrder('order-1002', 'T4', 17, 4, [
    item('1002-1', 'salt-ramen', '塩ラーメン', 2, 'noodle', ['味玉追加']),
    item('1002-2', 'gyoza', '餃子', 1, 'griddle', ['よく焼き']),
  ]),
  createOrder('order-1003', 'T2', 14, 2, [
    item('1003-1', 'salt-ramen', '塩ラーメン', 1, 'noodle', ['ねぎ抜き']),
    item('1003-2', 'karaage', '若鶏の唐揚げ', 2, 'fried', ['レモン別添え', '塩少なめ']),
  ], {
    order_source: 'mobile',
  }),
  createOrder('order-1004', 'T7', 16, 3, [
    item('1004-1', 'karaage', '若鶏の唐揚げ', 2, 'fried', ['衣うすめ'], '子ども用に小さくカット'),
    item('1004-2', 'caesar', 'シーザーサラダ', 1, 'salad', ['ドレッシング別添え']),
  ]),
  createOrder('order-1005', 'T12', 12, 2, [
    item('1005-1', 'karaage', '若鶏の唐揚げ', 1, 'fried', [], '揚げたて希望'),
    item('1005-2', 'gyoza', '餃子', 2, 'griddle', ['にんにくなし']),
  ]),
  createOrder('order-1006', 'T19', 10, 4, [
    item('1006-1', 'karaage', '若鶏の唐揚げ', 3, 'fried', ['マヨ別添え']),
    item('1006-2', 'highball', '角ハイボール', 2, 'drink', ['氷少なめ']),
  ]),
  createOrder('order-1007', 'T22', 7, 2, [
    item('1007-1', 'napolitan', 'ナポリタン', 1, 'noodle', ['粉チーズ多め']),
    item('1007-2', 'caesar', 'シーザーサラダ', 1, 'salad', ['クルトン抜き']),
  ]),
  createOrder('order-1008', 'T31', 5, 3, [
    item('1008-1', 'pudding', '自家製プリン', 2, 'dessert', [], '食後に提供'),
    item('1008-2', 'draft-beer', '生ビール', 1, 'drink'),
  ], {
    order_memo: 'プリンは食後。ホールから声がかかるまで提供しないでください。',
    order_source: 'mobile',
  }),
  createOrder('order-1009', 'T8', 4, 2, [
    item('1009-1', 'highball', '角ハイボール', 3, 'drink', ['濃いめ']),
    item('1009-2', 'gyoza', '餃子', 1, 'griddle'),
  ]),
  createOrder('order-1010', 'T14', 3, 5, [
    item(
      '1010-1',
      'karaage',
      '若鶏の唐揚げ',
      3,
      'fried',
      [
        'レモン別添え',
        'カット小さめ',
        '塩少なめ',
        '衣うすめ',
        'マヨ別添え',
        '取り皿追加',
        '先出し希望',
      ],
      '子ども用のため辛味なし。取り皿を人数分、先に提供してください。アレルギー確認済みです。',
      {
        course_id: 'course-a',
        course_name: 'Aコース',
        kitchen_print_name: '若鶏の唐揚げ（小さめ）',
        target_minutes: 12,
      },
    ),
    item('1010-2', 'gyoza', '餃子', 2, 'griddle', ['にんにくなし', 'よく焼き'], '', {
      course_id: 'course-a',
      course_name: 'Aコース',
    }),
    item('1010-3', 'salt-ramen', '塩ラーメン', 2, 'noodle', ['ねぎ抜き', '麺かため'], '', {
      course_id: 'course-a',
      course_name: 'Aコース',
    }),
    item('1010-4', 'caesar', 'シーザーサラダ', 1, 'salad', ['ドレッシング別添え'], '', {
      course_id: 'course-a',
      course_name: 'Aコース',
    }),
    item('1010-5', 'draft-beer', '生ビール', 4, 'drink', ['泡少なめ']),
    item('1010-6', 'highball', '角ハイボール', 2, 'drink', ['氷少なめ', '濃いめ']),
    item('1010-7', 'pudding', '自家製プリン', 2, 'dessert', [], '食後、全品がそろってから提供'),
    item('1010-8', 'karaage', '若鶏の唐揚げ', 1, 'fried', ['ソース別皿'], '', {
      course_id: 'course-b',
      course_name: 'Bコース',
    }),
    item('1010-9', 'gyoza', '餃子', 3, 'griddle', ['にんにくなし'], '', {
      course_id: 'course-b',
      course_name: 'Bコース',
    }),
    item('1010-10', 'napolitan', 'ナポリタン', 1, 'noodle', ['粉チーズ多め'], '', {
      course_id: 'course-b',
      course_name: 'Bコース',
    }),
    item('1010-11', 'caesar', 'シーザーサラダ', 1, 'salad', ['クルトン抜き'], '', {
      course_id: 'course-b',
      course_name: 'Bコース',
    }),
  ], {
    joined_table_names: ['T14', 'T15', 'T16', 'T17', 'T18'],
    order_memo:
      '5名のうち2名は子どもです。Aコースを先に開始し、Bコースはホールの合図後にお願いします。',
    order_source: 'staff',
    staff_name: '山田',
  }),
];

function createOrder(orderId, tableNo, elapsedMinutes, guestCount, items, metadata = {}) {
  const table = tableInfoByNo.get(tableNo);

  return {
    id: orderId,
    order_id: orderId,
    table_info_id: table?.tableInfoId ?? tableNo,
    table_no: tableNo,
    table_name: table?.tableName ?? tableNo,
    joined_table_names: [
      ...new Set(metadata.joined_table_names ?? [table?.tableName ?? tableNo]),
    ],
    table_category: table?.tableCategory ?? '未分類',
    table_sort: table?.sort ?? Number.MAX_SAFE_INTEGER,
    ordered_elapsed_minutes: elapsedMinutes,
    guest_count: guestCount,
    items,
    order_memo: metadata.order_memo ?? '',
    order_source: metadata.order_source ?? 'staff',
    staff_name: metadata.staff_name ?? '',
  };
}

function tableInfo(tableInfoId, tableNo, tableCategory, sort) {
  return {
    tableInfoId,
    tableNo,
    tableName: tableNo,
    tableCategory,
    printerGroupCode: null,
    sort,
  };
}

function item(
  orderItemId,
  menuId,
  name,
  quantity,
  categoryId,
  toppings = [],
  memo = '',
  metadata = {},
) {
  return {
    order_item_id: orderItemId,
    menu_id: menuId,
    category_id: categoryId,
    name,
    quantity,
    toppings: toppings.map((toppingName, index) => ({
      id: `${orderItemId}-topping-${index + 1}`,
      name: toppingName,
      quantity: 1,
    })),
    memo,
    course_id: metadata.course_id ?? null,
    course_name: metadata.course_name ?? null,
    kitchen_print_name: metadata.kitchen_print_name ?? null,
    target_minutes: metadata.target_minutes ?? null,
    status: 'ordered',
    chef_status: 'uncooked',
  };
}
