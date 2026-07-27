import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyComparisonPreset,
  comparisonDefaults,
  comparisonOptions,
  comparisonQuantityDisplayStyleOptions,
  comparisonRecipeGroups,
  comparisonRecipes,
  createDefaultComparisonSettings,
  getActiveComparisonRecipe,
  getComparisonDifferenceSummary,
  parseComparisonHash,
  serializeComparisonHash,
} from '../src/features/kitchen-monitor/comparisonConfig.js';
import { createScenarioOrders } from '../src/features/kitchen-monitor/comparisonScenarios.js';
import {
  createOrderCardSegments,
  estimateOrderCardHeight,
  estimateOrderItemHeight,
} from '../src/features/kitchen-monitor/orderCardSegments.js';
import { measureResponsiveColumnLayout } from '../src/features/kitchen-monitor/useResponsiveColumnLayout.js';
import {
  createTableCardSegments,
  createTableGroups,
  estimateTableCardHeight,
} from '../src/features/kitchen-monitor/tableViewModel.js';
import { createQuantityDisplayModel } from '../src/features/kitchen-monitor/quantityDisplay.js';

const styleCss = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const orderItemRowVue = readFileSync(
  new URL('../src/components/kitchen-monitor/OrderItemRow.vue', import.meta.url),
  'utf8',
);

test('invalid comparison query values fall back to defaults and preserve unknown keys', () => {
  const parsed = parseComparisonHash(
    '#order-n-scroll?cmp_scenario=bad&cmp_card=999&cmp_rows=tiny&cmp_qty=other&cmp_qty_style=bad&cmp_order_undo=9&cmp_item_hide=9&cmp_target=99&cmp_warning=1&cmp_motion=maybe&cmp_info=bad&cmp_theme=bad&cmp_urgency=bad&cmp_intensity=bad&foo=bar',
  );

  assert.equal(parsed.route, 'order-n-scroll');
  assert.deepEqual(parsed.settings, createDefaultComparisonSettings());
  assert.deepEqual(parsed.unknownQueryEntries, [['foo', 'bar']]);
  assert.equal(
    serializeComparisonHash(parsed.route, parsed.settings, parsed.unknownQueryEntries),
    '#order-n-scroll?foo=bar',
  );
});

test('share hash serializes a complete reproducible comparison state', () => {
  const settings = {
    scenario: 'peak',
    cardMinWidth: 360,
    rowSpacing: 'comfortable',
    quantityMode: 'progress',
    quantityDisplayStyle: 'e',
    orderUndoMs: 5000,
    itemHideMs: 8000,
    targetMinutes: 30,
    warningMinutes: 5,
    motion: false,
    info: ['course', 'itemMemo', 'bulkComplete'],
    theme: 'teal',
    urgency: 'colorSafe',
    intensity: 'strong',
  };

  const hash = serializeComparisonHash(
    'table-n-page',
    settings,
    [['utm_source', 'review']],
    { includeDefaults: true, openPanel: true },
  );
  const parsed = parseComparisonHash(hash);

  assert.match(hash, /cmp_theme=teal/);
  assert.match(hash, /cmp_urgency=colorSafe/);
  assert.match(hash, /cmp_intensity=strong/);
  assert.match(hash, /cmp_qty_style=e/);
  assert.equal(parsed.route, 'table-n-page');
  assert.equal(parsed.openPanel, true);
  assert.deepEqual(parsed.settings, settings);
  assert.deepEqual(parsed.unknownQueryEntries, [['utm_source', 'review']]);
});

test('quantity display style k and l round trip through comparison hash', () => {
  const baseSettings = createDefaultComparisonSettings();

  for (const quantityDisplayStyle of ['k', 'l']) {
    const hash = serializeComparisonHash('order-n-scroll', {
      ...baseSettings,
      quantityDisplayStyle,
    });
    const parsed = parseComparisonHash(hash);

    assert.match(hash, new RegExp(`cmp_qty_style=${quantityDisplayStyle}`));
    assert.equal(parsed.settings.quantityDisplayStyle, quantityDisplayStyle);
  }
});

test('share hash includes default color axes when complete state is requested', () => {
  const hash = serializeComparisonHash('order-n-scroll', createDefaultComparisonSettings(), [], {
    includeDefaults: true,
    openPanel: true,
  });

  assert.match(hash, /cmp_theme=orange/);
  assert.match(hash, /cmp_urgency=standard/);
  assert.match(hash, /cmp_intensity=standard/);
  assert.match(hash, /cmp_qty_style=current/);
  assert.match(hash, /compare=1/);
});

test('recipes produce deterministic complete non-color settings and preserve colors', () => {
  const base = {
    ...comparisonDefaults,
    scenario: 'memo',
    cardMinWidth: 360,
    rowSpacing: 'comfortable',
    quantityMode: 'remaining',
    quantityDisplayStyle: 'j',
    orderUndoMs: 2000,
    itemHideMs: 3000,
    targetMinutes: 30,
    warningMinutes: 5,
    motion: false,
    info: [...comparisonDefaults.info],
    theme: 'blue',
    urgency: 'monochrome',
    intensity: 'soft',
  };

  assert.equal(Object.keys(comparisonRecipes).length, 10);
  assert.deepEqual(
    comparisonRecipeGroups.map((group) => group.label),
    ['表示', '運用', '状況'],
  );

  assert.deepEqual(applyComparisonPreset(base, 'careful'), {
    ...comparisonRecipes.careful.settings,
    info: [...comparisonRecipes.careful.settings.info],
    theme: 'blue',
    urgency: 'monochrome',
    intensity: 'soft',
    quantityDisplayStyle: 'j',
  });
  assert.deepEqual(applyComparisonPreset(base, 'overview'), {
    ...comparisonRecipes.overview.settings,
    info: [...comparisonRecipes.overview.settings.info],
    theme: 'blue',
    urgency: 'monochrome',
    intensity: 'soft',
    quantityDisplayStyle: 'j',
  });
  assert.deepEqual(applyComparisonPreset(base, 'current'), {
    ...comparisonRecipes.current.settings,
    info: [...comparisonRecipes.current.settings.info],
    theme: 'blue',
    urgency: 'monochrome',
    intensity: 'soft',
    quantityDisplayStyle: 'j',
  });
});

test('recipe matching ignores independent visual axes and manual deviation is custom', () => {
  const careful = {
    ...comparisonRecipes.careful.settings,
    info: [...comparisonRecipes.careful.settings.info],
    theme: 'violet',
    urgency: 'highContrast',
    intensity: 'strong',
    quantityDisplayStyle: 'b',
  };

  assert.equal(getActiveComparisonRecipe(careful), 'careful');
  assert.equal(getActiveComparisonRecipe({ ...careful, cardMinWidth: 360 }), 'custom');
});

test('difference summary counts color and info as single fields with representative chips', () => {
  const settings = {
    ...comparisonDefaults,
    rowSpacing: 'compact',
    quantityDisplayStyle: 'j',
    orderUndoMs: 5000,
    info: ['aggregate', 'bulkComplete'],
    theme: 'charcoal',
    urgency: 'colorSafe',
  };
  const summary = getComparisonDifferenceSummary(settings);

  assert.equal(summary.activeRecipeId, 'custom');
  assert.equal(summary.activeRecipeLabel, 'カスタム');
  assert.equal(summary.differenceCount, 6);
  assert.deepEqual(summary.chips, ['行間:詰める', '数量表示:J 縦積み・合計上小', '注文取消:5秒']);
  assert.equal(summary.extraCount, 3);
});

test('overview recipe and quantity display options keep locked values', () => {
  assert.deepEqual(comparisonRecipes.current.settings, {
    scenario: 'normal',
    cardMinWidth: 290,
    rowSpacing: 'standard',
    quantityMode: 'current',
    orderUndoMs: 3000,
    itemHideMs: 5000,
    targetMinutes: 15,
    warningMinutes: 3,
    motion: true,
    info: comparisonDefaults.info,
  });
  assert.deepEqual(comparisonRecipes.overview.settings, {
    scenario: 'normal',
    cardMinWidth: 260,
    rowSpacing: 'compact',
    quantityMode: 'current',
    orderUndoMs: 3000,
    itemHideMs: 5000,
    targetMinutes: 15,
    warningMinutes: 3,
    motion: true,
    info: Object.freeze(['course', 'aggregate', 'bulkComplete']),
  });
  assert.ok(comparisonOptions.cardMinWidths.includes(260));
  assert.deepEqual(
    comparisonQuantityDisplayStyleOptions.map((option) => option.id),
    ['current', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'],
  );
  assert.deepEqual(
    comparisonQuantityDisplayStyleOptions.map((option) => option.label),
    [
      '現行の左主数量 + 右全注文集計',
      'A 残数量のみ',
      'B 独立2チップ',
      'C 強弱つき2チップ',
      'D 大小・右下配置',
      'E 区切りコンテナ',
      'F チップ＋補助数値',
      'G 差分時のみ合計',
      'H 塗り＋アウトライン',
      'I 残＋括弧合計',
      'J 縦積み・合計上小',
      'K 右側・主数量＋横断集計',
      'L 右側・×残数量',
    ],
  );
});

test('quantity display model uses item remain and source total for A to J', () => {
  const base = {
    quantityMode: 'progress',
    processedCount: 2,
    totalQuantity: 4,
    aggregateTotalQuantity: 9,
    hasAggregate: true,
    showAggregate: true,
  };

  assert.equal(createQuantityDisplayModel({ ...base, style: 'a' }).primaryLabel, '2');
  assert.equal(createQuantityDisplayModel({ ...base, style: 'a' }).showSourceTotal, false);
  for (const style of ['b', 'c', 'd', 'e', 'f', 'h', 'j']) {
    const display = createQuantityDisplayModel({ ...base, style });

    assert.equal(display.primaryLabel, '2');
    assert.equal(display.sourceTotalLabel, '4');
    assert.equal(display.showSourceTotal, true);
    assert.equal(display.showAggregateButton, false);
  }

  assert.equal(createQuantityDisplayModel({ ...base, style: 'i' }).sourceTotalLabel, '(4)');
  assert.equal(createQuantityDisplayModel({ ...base, style: 'g' }).showSourceTotal, true);
  assert.equal(
    createQuantityDisplayModel({ ...base, style: 'g', processedCount: 0 }).showSourceTotal,
    false,
  );
  assert.equal(createQuantityDisplayModel({ ...base, style: 'l' }).primaryLabel, '×2');
});

test('quantity display current and K keep aggregate behavior scoped to aggregate button', () => {
  const current = createQuantityDisplayModel({
    style: 'current',
    quantityMode: 'progress',
    processedCount: 2,
    totalQuantity: 4,
    aggregateTotalQuantity: 9,
    hasAggregate: true,
    showAggregate: true,
  });
  const k = createQuantityDisplayModel({
    style: 'k',
    quantityMode: 'progress',
    processedCount: 2,
    totalQuantity: 4,
    aggregateTotalQuantity: 9,
    hasAggregate: true,
    showAggregate: true,
  });

  assert.equal(current.primaryLabel, '2/4');
  assert.equal(current.aggregateLabel, '9');
  assert.equal(current.showAggregateButton, true);
  assert.equal(k.primaryLabel, '2/4');
  assert.equal(k.aggregateLabel, '9');
  assert.equal(k.showAggregateButton, true);
  assert.equal(
    createQuantityDisplayModel({
      style: 'k',
      quantityMode: 'progress',
      processedCount: 2,
      totalQuantity: 4,
      aggregateTotalQuantity: 9,
      hasAggregate: true,
      showAggregate: false,
    }).showAggregateButton,
    false,
  );
});

test('quantity display right group keeps CSS placement contracts', () => {
  assert.match(
    styleCss,
    /\.quantity-side-right \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(54px, auto\);/s,
  );
  assert.match(
    styleCss,
    /\.order-item-quantity-group \{[^}]*grid-column: 2;[^}]*justify-self: end;/s,
  );
  assert.match(
    styleCss,
    /\.quantity-group-j \.order-item-source-quantity \{[^}]*grid-row: 1;[^}]*height: 16px;/s,
  );
  assert.match(
    styleCss,
    /\.quantity-group-j \.order-item-quantity \{[^}]*grid-row: 2;[^}]*height: 24px;/s,
  );
  assert.match(
    styleCss,
    /\.comparison-quantity-style-preview \.quantity-group-j \.sample-main \{[^}]*grid-row: 2;/s,
  );
  assert.match(
    styleCss,
    /\.comparison-quantity-style-preview \.quantity-group-j \.sample-total \{[^}]*grid-row: 1;/s,
  );
  assert.match(
    styleCss,
    /\.comparison-quantity-style-preview \{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(168px, 1fr\)\);/s,
  );
});

test('quantity display row keeps button and aggregate DOM contracts', () => {
  assert.match(orderItemRowVue, /\[`quantity-style-\$\{quantityDisplayStyle\}`\]: true,/);
  assert.match(orderItemRowVue, /'quantity-side-right': quantityDisplay\.isRightAligned,/);
  assert.match(orderItemRowVue, /'has-aggregate-quantity': quantityDisplay\.showAggregateButton,/);
  assert.match(
    orderItemRowVue,
    /class="order-item-quantity"[\s\S]*:disabled="interactionsDisabled"[\s\S]*:aria-label="`\$\{displayName\}の調理数を変更`"[\s\S]*@click\.stop="\$emit\('toggle-item-action', orderItem\.order_item_id\)"/,
  );
  assert.match(
    orderItemRowVue,
    /class="order-item-source-quantity"[\s\S]*\{\{ quantityDisplay\.sourceTotalLabel \}\}/,
  );
  assert.match(
    orderItemRowVue,
    /class="aggregate-quantity-button"[\s\S]*:class="\{ stacked: aggregate\.orderCount > 1 \}"[\s\S]*type="button"[\s\S]*:disabled="interactionsDisabled"[\s\S]*:aria-label="`\$\{displayName\}の全注文を表示`"[\s\S]*@click\.stop="\$emit\('open-aggregate', aggregateKey\)"/,
  );
});

test('height estimator respects width spacing and visible information', () => {
  const orderItem = {
    name: '長い商品名のテストメニュー',
    kitchen_print_name: '',
    course_name: 'ディナー',
    toppings: [{ name: '大盛' }, { name: '辛め' }, { name: 'ねぎ抜き' }],
    memo: '焼き加減を少し強めにする',
  };
  const fullInfo = ['course', 'options', 'itemMemo', 'orderMemo', 'aggregate', 'bulkComplete'];
  const minimalInfo = ['aggregate', 'bulkComplete'];

  assert.ok(
    estimateOrderItemHeight(orderItem, {
      cardMinWidth: 260,
      rowSpacing: 'standard',
      visibleInfo: fullInfo,
    }) >= estimateOrderItemHeight(orderItem, {
      cardMinWidth: 360,
      rowSpacing: 'standard',
      visibleInfo: fullInfo,
    }),
  );
  assert.ok(
    estimateOrderItemHeight(orderItem, {
      cardMinWidth: 290,
      rowSpacing: 'comfortable',
      visibleInfo: fullInfo,
    }) > estimateOrderItemHeight(orderItem, {
      cardMinWidth: 290,
      rowSpacing: 'standard',
      visibleInfo: fullInfo,
    }),
  );
  assert.ok(
    estimateOrderItemHeight(orderItem, {
      cardMinWidth: 290,
      rowSpacing: 'compact',
      visibleInfo: fullInfo,
    }) < estimateOrderItemHeight(orderItem, {
      cardMinWidth: 290,
      rowSpacing: 'standard',
      visibleInfo: fullInfo,
    }),
  );
  assert.ok(
    estimateOrderItemHeight(orderItem, {
      cardMinWidth: 290,
      rowSpacing: 'standard',
      visibleInfo: fullInfo,
    }) > estimateOrderItemHeight(orderItem, {
      cardMinWidth: 290,
      rowSpacing: 'standard',
      visibleInfo: minimalInfo,
    }),
  );
});

test('long order and table data create bounded continuation segments', () => {
  const estimateOptions = {
    cardMinWidth: 260,
    rowSpacing: 'comfortable',
    visibleInfo: ['course', 'options', 'itemMemo', 'orderMemo', 'aggregate', 'bulkComplete'],
  };
  const [longOrder] = createScenarioOrders('long');
  const maxCardHeight = 280;
  const orderSegments = createOrderCardSegments([longOrder], 'z', {
    maxCardHeight,
    estimateOptions,
  });

  assert.ok(orderSegments.length > 1);
  assert.deepEqual(
    orderSegments.map((segment) => segment.segment_index),
    orderSegments.map((_, index) => index + 1),
  );
  assert.equal(orderSegments[0].is_first_segment, true);
  assert.equal(orderSegments.at(-1).is_last_segment, true);
  assert.ok(orderSegments.every((segment) => segment.items.length >= 1));
  assert.ok(
    orderSegments.every((segment) => estimateOrderCardHeight(segment, estimateOptions) <= maxCardHeight),
  );

  const table = createTableGroups([longOrder])[0];
  const tableSegments = createTableCardSegments([table], {
    maxCardHeight,
    estimateOptions,
  });

  assert.ok(tableSegments.length > 1);
  assert.deepEqual(
    tableSegments.map((segment) => segment.segment_index),
    tableSegments.map((_, index) => index + 1),
  );
  assert.equal(tableSegments[0].is_first_segment, true);
  assert.equal(tableSegments.at(-1).is_last_segment, true);
  assert.ok(tableSegments.every((segment) => segment.items.length >= 1));
  assert.ok(
    tableSegments.every((segment) => estimateTableCardHeight(segment, estimateOptions) <= maxCardHeight),
  );
});

test('responsive column height can use viewport height independently of content height', () => {
  const contentElement = {
    clientWidth: 928,
    clientHeight: 1800,
  };
  const viewportElement = {
    clientHeight: 760,
  };

  const measured = measureResponsiveColumnLayout(contentElement, {
    contentInset: 26,
    heightElement: viewportElement,
    maxColumnCount: 3,
    minColumnHeight: 260,
    minColumnWidth: 290,
  });

  assert.deepEqual(measured, {
    columnCount: 3,
    columnHeight: 734,
  });
});

test('scenario data is deterministic and follows declared order selections', () => {
  const normal = createScenarioOrders('normal');
  const peak = createScenarioOrders('peak');
  const long = createScenarioOrders('long');
  const memo = createScenarioOrders('memo');
  const quantity = createScenarioOrders('quantity');
  const delay = createScenarioOrders('delay');

  assert.equal(normal.length, 10);
  assert.equal(peak.length, 14);
  assert.deepEqual(
    peak.slice(10).map((order) => order.id),
    ['peak-order-1002', 'peak-order-1003', 'peak-order-1004', 'peak-order-1005'],
  );
  assert.equal(
    new Set(peak.flatMap((order) => order.items.map((item) => item.order_item_id))).size,
    peak.flatMap((order) => order.items).length,
  );
  assert.deepEqual(long.map((order) => order.id), ['order-1010', 'order-1001', 'order-1008']);
  assert.deepEqual(memo.map((order) => order.id), ['order-1010', 'order-1001', 'order-1004', 'order-1008']);
  assert.deepEqual(
    delay.map((order) => order.ordered_elapsed_minutes),
    [32, 25, 20, 15, 14, 13, 11, 8, 5, 2],
  );
  assert.equal(findItem(quantity, '1001-1').quantity, 14);
  assert.equal(findItem(quantity, '1006-1').quantity, 8);
  assert.equal(findItem(quantity, '1009-1').quantity, 9);
});

function findItem(orders, orderItemId) {
  return orders.flatMap((order) => order.items).find((item) => item.order_item_id === orderItemId);
}
