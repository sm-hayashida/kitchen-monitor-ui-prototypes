import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyComparisonPreset,
  comparisonDefaults,
  comparisonRecipeGroups,
  comparisonRecipes,
  createDefaultComparisonSettings,
  getActiveComparisonRecipe,
  getComparisonDifferenceSummary,
  parseComparisonHash,
  serializeComparisonHash,
} from '../src/features/kitchen-monitor/comparisonConfig.js';
import { createScenarioOrders } from '../src/features/kitchen-monitor/comparisonScenarios.js';

test('invalid comparison query values fall back to defaults and preserve unknown keys', () => {
  const parsed = parseComparisonHash(
    '#order-n-scroll?cmp_scenario=bad&cmp_card=999&cmp_rows=tiny&cmp_qty=other&cmp_order_undo=9&cmp_item_hide=9&cmp_target=99&cmp_warning=1&cmp_motion=maybe&cmp_info=bad&cmp_theme=bad&cmp_urgency=bad&cmp_intensity=bad&foo=bar',
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
  assert.equal(parsed.route, 'table-n-page');
  assert.equal(parsed.openPanel, true);
  assert.deepEqual(parsed.settings, settings);
  assert.deepEqual(parsed.unknownQueryEntries, [['utm_source', 'review']]);
});

test('share hash includes default color axes when complete state is requested', () => {
  const hash = serializeComparisonHash('order-n-scroll', createDefaultComparisonSettings(), [], {
    includeDefaults: true,
    openPanel: true,
  });

  assert.match(hash, /cmp_theme=orange/);
  assert.match(hash, /cmp_urgency=standard/);
  assert.match(hash, /cmp_intensity=standard/);
  assert.match(hash, /compare=1/);
});

test('recipes produce deterministic complete non-color settings and preserve colors', () => {
  const base = {
    ...comparisonDefaults,
    scenario: 'memo',
    cardMinWidth: 360,
    rowSpacing: 'comfortable',
    quantityMode: 'remaining',
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
  });
  assert.deepEqual(applyComparisonPreset(base, 'overview'), {
    ...comparisonRecipes.overview.settings,
    info: [...comparisonRecipes.overview.settings.info],
    theme: 'blue',
    urgency: 'monochrome',
    intensity: 'soft',
  });
  assert.deepEqual(applyComparisonPreset(base, 'current'), {
    ...comparisonRecipes.current.settings,
    info: [...comparisonRecipes.current.settings.info],
    theme: 'blue',
    urgency: 'monochrome',
    intensity: 'soft',
  });
});

test('recipe matching ignores color axes and manual deviation is custom', () => {
  const careful = {
    ...comparisonRecipes.careful.settings,
    info: [...comparisonRecipes.careful.settings.info],
    theme: 'violet',
    urgency: 'highContrast',
    intensity: 'strong',
  };

  assert.equal(getActiveComparisonRecipe(careful), 'careful');
  assert.equal(getActiveComparisonRecipe({ ...careful, cardMinWidth: 360 }), 'custom');
});

test('difference summary counts color and info as single fields with representative chips', () => {
  const settings = {
    ...comparisonDefaults,
    rowSpacing: 'compact',
    orderUndoMs: 5000,
    info: ['aggregate', 'bulkComplete'],
    theme: 'charcoal',
    urgency: 'colorSafe',
  };
  const summary = getComparisonDifferenceSummary(settings);

  assert.equal(summary.activeRecipeId, 'custom');
  assert.equal(summary.activeRecipeLabel, 'カスタム');
  assert.equal(summary.differenceCount, 5);
  assert.deepEqual(summary.chips, ['行間:詰める', '注文取消:5秒', '表示情報:2項目']);
  assert.equal(summary.extraCount, 2);
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
