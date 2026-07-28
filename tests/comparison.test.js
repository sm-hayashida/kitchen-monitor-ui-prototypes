import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  applyComparisonPreset,
  comparisonDefaults,
  comparisonItemTapModeOptions,
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
import { decideItemBodyAction } from '../src/features/kitchen-monitor/itemActionRules.js';
import {
  clampSelection,
  createModalSelections,
  createModalSelectionUpdates,
  setModalSelection,
  sumModalSelections,
} from '../src/features/kitchen-monitor/modalSelection.js';
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
import { getOrderItemInlineDetails } from '../src/features/kitchen-monitor/orderItemPresentation.js';

const styleCss = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const orderItemRowVue = readFileSync(
  new URL('../src/components/kitchen-monitor/OrderItemRow.vue', import.meta.url),
  'utf8',
);
const orderWorkspaceVue = readFileSync(
  new URL('../src/components/kitchen-monitor/OrderViewWorkspace.vue', import.meta.url),
  'utf8',
);
const orderViewCardVue = readFileSync(
  new URL('../src/components/kitchen-monitor/OrderViewCard.vue', import.meta.url),
  'utf8',
);
const tableWorkspaceVue = readFileSync(
  new URL('../src/components/kitchen-monitor/TableViewWorkspace.vue', import.meta.url),
  'utf8',
);
const tableViewCardVue = readFileSync(
  new URL('../src/components/kitchen-monitor/TableViewCard.vue', import.meta.url),
  'utf8',
);
const aggregateModalVue = readFileSync(
  new URL('../src/components/kitchen-monitor/ProductAggregateModal.vue', import.meta.url),
  'utf8',
);
const useOrderViewMockSource = readFileSync(
  new URL('../src/features/kitchen-monitor/useOrderViewMock.js', import.meta.url),
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
    itemTapMode: 'safe',
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
  assert.match(hash, /cmp_item_tap=safe/);
  assert.equal(parsed.route, 'table-n-page');
  assert.equal(parsed.openPanel, true);
  assert.deepEqual(parsed.settings, settings);
  assert.deepEqual(parsed.unknownQueryEntries, [['utm_source', 'review']]);
});

test('quantity display style k through n round trip through comparison hash', () => {
  const baseSettings = createDefaultComparisonSettings();

  for (const quantityDisplayStyle of ['k', 'l', 'm', 'n']) {
    const hash = serializeComparisonHash('order-n-scroll', {
      ...baseSettings,
      quantityDisplayStyle,
    });
    const parsed = parseComparisonHash(hash);

    assert.match(hash, new RegExp(`cmp_qty_style=${quantityDisplayStyle}`));
    assert.equal(parsed.settings.quantityDisplayStyle, quantityDisplayStyle);
  }
});

test('item tap mode defaults, labels, and URL round trip use locked values', () => {
  assert.equal(comparisonDefaults.itemTapMode, 'all');
  assert.deepEqual(
    comparisonItemTapModeOptions.map((option) => [option.id, option.label]),
    [
      ['all', '商品タップで残り全部を完了'],
      ['safe', '1個だけ即完了・複数は数量確認'],
    ],
  );
  assert.deepEqual(comparisonOptions.itemTapModes, ['all', 'safe']);

  const safeHash = serializeComparisonHash('table-n-scroll', {
    ...createDefaultComparisonSettings(),
    itemTapMode: 'safe',
  });
  const parsed = parseComparisonHash(safeHash);

  assert.match(safeHash, /cmp_item_tap=safe/);
  assert.equal(parsed.settings.itemTapMode, 'safe');
  assert.equal(
    serializeComparisonHash('order-n-scroll', createDefaultComparisonSettings()),
    '#order-n-scroll',
  );
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
  assert.match(hash, /cmp_item_tap=all/);
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
    itemTapMode: 'all',
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
    itemTapMode: 'safe',
  });
  assert.deepEqual(applyComparisonPreset(base, 'overview'), {
    ...comparisonRecipes.overview.settings,
    info: [...comparisonRecipes.overview.settings.info],
    theme: 'blue',
    urgency: 'monochrome',
    intensity: 'soft',
    quantityDisplayStyle: 'j',
    itemTapMode: 'all',
  });
  assert.deepEqual(applyComparisonPreset(base, 'current'), {
    ...comparisonRecipes.current.settings,
    info: [...comparisonRecipes.current.settings.info],
    theme: 'blue',
    urgency: 'monochrome',
    intensity: 'soft',
    quantityDisplayStyle: 'j',
    itemTapMode: 'all',
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
    itemTapMode: 'all',
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
    itemTapMode: 'all',
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
    ['current', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'],
  );
  assert.deepEqual(
    comparisonQuantityDisplayStyleOptions.map((option) => option.label),
    [
      '現行・左に残数のみ',
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
      'M 左残数＋計',
      'N 左残数／合計',
    ],
  );
  assert.ok(
    !comparisonQuantityDisplayStyleOptions
      .map((option) => option.label)
      .includes('現行の左主数量 + 右全注文集計'),
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

test('quantity display model supports left remaining plus aggregate total proposals', () => {
  const base = {
    quantityMode: 'current',
    processedCount: 1,
    totalQuantity: 5,
    aggregateTotalQuantity: 13,
    hasAggregate: true,
    showAggregate: true,
  };
  const totalLabel = createQuantityDisplayModel({ ...base, style: 'm' });
  const fractionLabel = createQuantityDisplayModel({ ...base, style: 'n' });

  assert.equal(totalLabel.showLeftButton, true);
  assert.equal(totalLabel.showLeftAggregateTotal, true);
  assert.equal(totalLabel.primaryLabel, '4');
  assert.equal(totalLabel.leftAggregateTotalLabel, '計13');
  assert.equal(totalLabel.showRightGroup, false);
  assert.equal(totalLabel.showAggregateButton, false);
  assert.equal(fractionLabel.showLeftAggregateTotal, true);
  assert.equal(fractionLabel.primaryLabel, '4');
  assert.equal(fractionLabel.leftAggregateTotalLabel, '/13');
});

test('quantity display current shows residual only while K keeps aggregate button', () => {
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
  assert.equal(current.showAggregateButton, false);
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
    /\.quantity-group-j \.order-item-source-quantity \{[^}]*grid-row: 1;[^}]*min-height: 44px;/s,
  );
  assert.match(
    styleCss,
    /\.quantity-group-j \.order-item-quantity \{[^}]*grid-row: 2;[^}]*min-width: 44px;[^}]*min-height: 44px;/s,
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

test('clickable quantity targets keep at least 44px primary touch dimension', () => {
  assert.match(
    styleCss,
    /\.aggregate-quantity-button \{[^}]*width: 44px;[^}]*height: 44px;/s,
  );
  assert.match(
    styleCss,
    /\.order-item-quantity-group \.order-item-quantity,[\s\S]*?\.quantity-style-j \.order-item-quantity-group \.order-item-quantity \{[^}]*min-width: 44px;[^}]*min-height: 44px;/s,
  );
  assert.match(
    styleCss,
    /\.order-item-source-quantity \{[^}]*min-width: 44px;[^}]*min-height: 44px;/s,
  );
  assert.match(
    styleCss,
    /\.item-row-action \{[^}]*width: 44px;[^}]*height: 44px;/s,
  );
  assert.match(
    styleCss,
    /\.comparison-rows-compact \.order-view-item \{[^}]*min-height: 48px;[^}]*padding-top: 2px;[^}]*padding-bottom: 2px;/s,
  );
  for (const style of ['d', 'f', 'j']) {
    assert.match(
      styleCss,
      new RegExp(`\\.quantity-style-${style} \\.aggregate-quantity-button \\{[\\s\\S]*width: 44px;[\\s\\S]*height: 44px;`),
    );
  }
});

test('order item grid tracks accommodate 44px quantity controls without compact layout overflow', () => {
  assert.match(
    styleCss,
    /\.order-view-item \{[^}]*grid-template-columns: minmax\(44px, auto\) minmax\(0, 1fr\) minmax\(44px, auto\);/s,
  );
  assert.match(
    styleCss,
    /\.order-horizontal-scroller \.order-view-item \{[^}]*grid-template-columns: minmax\(44px, auto\) minmax\(0, 1fr\) minmax\(44px, auto\);/s,
  );
  assert.match(
    styleCss,
    /\.order-view-grid\.n-paged \.order-view-item,[\s\S]*?\.order-view-grid\.n-scroll \.order-view-item \{[^}]*grid-template-columns: minmax\(44px, auto\) minmax\(0, 1fr\) minmax\(44px, auto\);/s,
  );
  assert.match(
    styleCss,
    /\.table-view-grid \.order-view-item,[\s\S]*?\.table-horizontal-scroller \.order-view-item \{[^}]*grid-template-columns: minmax\(44px, auto\) minmax\(0, 1fr\) 44px;/s,
  );
  for (const style of ['e', 'i', 'j']) {
    assert.match(
      styleCss,
      new RegExp(
        `\\.quantity-style-${style}\\.has-aggregate-quantity \\{[^}]*grid-template-columns: minmax\\(44px, auto\\) minmax\\(0, 1fr\\) minmax\\(44px, auto\\);`,
        's',
      ),
    );
  }
  assert.doesNotMatch(styleCss, /grid-template-columns:\s*24px minmax\(0, 1fr\) 27px;/);
  assert.doesNotMatch(styleCss, /grid-template-columns:\s*(?:30px|minmax\(32px, auto\)|32px|34px) minmax\(0, 1fr\) (?:30px|42px|0);/);
});

test('quantity display row keeps button and aggregate DOM contracts', () => {
  assert.match(orderItemRowVue, /\[`quantity-style-\$\{quantityDisplayStyle\}`\]: true,/);
  assert.match(orderItemRowVue, /'quantity-side-right': quantityDisplay\.isRightAligned,/);
  assert.match(orderItemRowVue, /'has-aggregate-quantity': quantityDisplay\.showAggregateButton,/);
  assert.match(
    orderItemRowVue,
    /class="order-item-quantity current-quantity-control"[\s\S]*:aria-label="quantityButtonAriaLabel"[\s\S]*@click\.stop="openSameProductModal"[\s\S]*\{\{ currentQuantityLabel \}\}/,
  );
  assert.match(orderItemRowVue, /class="quantity-sub-label"[\s\S]*quantityDisplay\.leftAggregateTotalLabel/);
  assert.match(orderItemRowVue, /同一商品の残数合計/);
  assert.match(
    readFileSync(new URL('../src/components/kitchen-monitor/ComparisonPanel.vue', import.meta.url), 'utf8'),
    /showLeftAggregateTotal[\s\S]*leftAggregateTotalLabel/,
  );
  assert.doesNotMatch(orderItemRowVue, /currentQuantityLabels|全体 \$/);
  assert.match(
    orderItemRowVue,
    /class="order-item-description order-item-body-action"[\s\S]*:disabled="interactionsDisabled \|\| bodyAction === 'none'"[\s\S]*@click\.stop="activateBody"/,
  );
  assert.match(
    orderItemRowVue,
    /class="item-row-action"[\s\S]*:aria-label="bodyAriaLabel"[\s\S]*@click\.stop="activateBody"/,
  );
  assert.match(
    orderItemRowVue,
    /v-if="itemCompletionStartedAt"[\s\S]*class="item-row-action item-completion-cancel"[\s\S]*完了を取り消す[\s\S]*cancel-item-completion/,
  );
  assert.match(orderItemRowVue, /v-if="quantityDisplay\.showRightGroup && !itemCompletionStartedAt"/);
  assert.match(
    orderItemRowVue,
    /class="order-item-source-quantity"[\s\S]*type="button"[\s\S]*@click\.stop="openSameProductModal"[\s\S]*\{\{ quantityDisplay\.sourceTotalLabel \}\}/,
  );
  assert.match(
    orderItemRowVue,
    /class="aggregate-quantity-button"[\s\S]*:class="\{ stacked: aggregate\.orderCount > 1 \}"[\s\S]*type="button"[\s\S]*:disabled="interactionsDisabled"[\s\S]*同一商品処理を開く[\s\S]*@click\.stop="openSameProductModal"/,
  );
  assert.doesNotMatch(orderItemRowVue, /item-body-affordance/);
  assert.doesNotMatch(orderItemRowVue, /toggle-item-action|quantity-picker|open-item-detail/);
});

test('safe and all item body actions expose the intended user-visible decision', () => {
  assert.equal(decideItemBodyAction({ itemTapMode: 'all', remainingCount: 3 }), 'complete-remaining');
  assert.equal(decideItemBodyAction({ itemTapMode: 'safe', remainingCount: 1 }), 'complete-remaining');
  assert.equal(decideItemBodyAction({ itemTapMode: 'safe', remainingCount: 2 }), 'open-modal');
  assert.equal(decideItemBodyAction({ itemTapMode: 'all', remainingCount: 0 }), 'none');
  assert.match(orderItemRowVue, /残\$\{remainingCount\.value\}を完了/);
  assert.match(orderItemRowVue, /数量を選択/);
  assert.match(orderItemRowVue, /return '完了';/);
  assert.match(orderItemRowVue, /return '選択';/);
});

test('inline item and order memo presentation keeps full visible content', () => {
  const details = getOrderItemInlineDetails({
    toppings: [
      { id: 1, name: '大盛' },
      { id: 2, name: '辛め' },
      { id: 3, name: 'ねぎ抜き' },
      { id: 4, name: 'ソース別' },
    ],
    memo: '長い商品メモを省略せず、そのまま厨房で確認できるように表示する',
  });

  assert.equal(details.visibleToppings.length, 4);
  assert.equal(details.hiddenToppingCount, 0);
  assert.equal(details.memo, '長い商品メモを省略せず、そのまま厨房で確認できるように表示する');
  assert.equal(details.hasTruncatedMemo, false);
  assert.doesNotMatch(orderItemRowVue, /他\{\{|全文|hasTruncatedMemo|hiddenToppingCount|…/);
  assert.match(orderItemRowVue, /v-for="topping in visibleToppings"/);
  assert.match(orderItemRowVue, /class="order-item-option-chip"/);
  assert.doesNotMatch(orderItemRowVue, /visibleToppings\.map\(\(topping\) => topping\.name\)\.join/);
  assert.match(styleCss, /\.order-item-description \.order-item-options \{[^}]*display: flex;[^}]*flex-wrap: wrap;/s);
  assert.match(styleCss, /\.order-item-description \.order-item-option-chip \{[^}]*max-width: 100%;[^}]*overflow-wrap: anywhere;/s);
  assert.match(orderViewCardVue, /class="order-card-memo-preview order-card-memo-inline"/);
  assert.match(tableViewCardVue, /class="table-order-memo-inline"/);
});

test('all quantity entry points share the same same-product modal action', () => {
  assert.ok((orderItemRowVue.match(/@click\.stop="openSameProductModal"/g) ?? []).length >= 4);
  assert.doesNotMatch(orderItemRowVue, /setProcessedQuantity|quantityOptions|toggleItemAction/);
  assert.match(orderWorkspaceVue, /@apply-selections="applyAggregateSelections"/);
  assert.match(tableWorkspaceVue, /@apply-selections="applyTableAggregateSelections"/);
});

test('modal per-order selections are bounded and produce explicit total updates', () => {
  const matches = [
    {
      orderItem: {
        order_item_id: '1001-1',
        pending_quantity: 3,
        processed_quantity: 2,
      },
    },
    {
      orderItem: {
        order_item_id: '1002-1',
        pending_quantity: 2,
        processed_quantity: 0,
      },
    },
  ];

  assert.equal(clampSelection(9, 3), 3);
  assert.equal(clampSelection(-1, 3), 0);
  let selections = createModalSelections(matches, '1001-1');
  assert.deepEqual(selections, { '1001-1': 1, '1002-1': 0 });
  selections = setModalSelection(selections, '1002-1', 9, 2);

  assert.equal(sumModalSelections(selections), 3);
  assert.deepEqual(createModalSelectionUpdates(matches, selections), [
    { orderItemId: '1001-1', processedQuantity: 3, selectedQuantity: 1 },
    { orderItemId: '1002-1', processedQuantity: 2, selectedQuantity: 2 },
  ]);
  assert.match(aggregateModalVue, /今回完了する数/);
  assert.match(aggregateModalVue, /残り全部/);
  assert.match(aggregateModalVue, /totalSelectedQuantity === 0/);
});

test('row completion exposes cancel window in order and staged hide in table mode', () => {
  assert.match(useOrderViewMockSource, /itemCompletionHideByItemId/);
  assert.match(
    useOrderViewMockSource,
    /itemCompletionHideByItemId\.value\[orderItemId\][\s\S]*finishTableItem\(orderItemId\)/,
  );
  assert.match(
    useOrderViewMockSource,
    /clearItemCompletion\(orderItemId\);[\s\S]*調理済みにしました/,
  );
  assert.match(orderWorkspaceVue, /:item-completion-started-at="itemCompletionStartedAt"/);
  assert.match(orderWorkspaceVue, /@cancel-item-completion="cancelTableItemCompletion"/);
  assert.match(tableWorkspaceVue, /completeItemRemaining\(payload\.orderItemId, \{ hideWhenComplete: true \}\)/);
});

test('detail popover is no longer reachable from order or table workspaces', () => {
  assert.equal(
    existsSync(new URL('../src/components/kitchen-monitor/OrderItemDetailPopover.vue', import.meta.url)),
    false,
  );
  assert.doesNotMatch(orderWorkspaceVue, /OrderItemDetailPopover|openItemDetail|selectedItemDetail/);
  assert.doesNotMatch(tableWorkspaceVue, /OrderItemDetailPopover|openItemDetail|selectedItemDetail/);
  assert.doesNotMatch(styleCss, /order-item-detail-popover|order-item-detail-trigger/);
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

test('height estimator includes internal wrapping for a single long option chip', () => {
  const baseOrderItem = {
    name: '牛すじ煮込み',
    kitchen_print_name: '',
    toppings: [],
    memo: '',
  };
  const estimateOptions = {
    cardMinWidth: 260,
    rowSpacing: 'standard',
    visibleInfo: ['course', 'options', 'aggregate', 'bulkComplete'],
  };

  const shortChipHeight = estimateOrderItemHeight({
    ...baseOrderItem,
    course_name: 'ディナー',
  }, estimateOptions);
  const longChipHeight = estimateOrderItemHeight({
    ...baseOrderItem,
    course_name: '季節限定の長い長い長いコース名そのまま厨房確認用',
  }, estimateOptions);

  assert.ok(longChipHeight > shortChipHeight);
});

test('height estimator includes wrapped order memo chrome for cards and table groups', () => {
  const order = {
    id: 'order-memo-height',
    order_memo: '注文メモが長い場合でも注文単位のメモとして一度だけ表示され、その折り返し高さを推定に含める',
    items: [
      {
        order_item_id: 'memo-item-1',
        name: '唐揚げ定食',
        quantity: 1,
        toppings: [],
        memo: '',
      },
    ],
    table_info_id: 'table-1',
    table_no: 'T1',
    ordered_elapsed_minutes: 5,
    guest_count: 2,
  };
  const withMemo = {
    cardMinWidth: 260,
    rowSpacing: 'compact',
    visibleInfo: ['course', 'options', 'itemMemo', 'orderMemo', 'aggregate', 'bulkComplete'],
  };
  const withoutMemo = {
    ...withMemo,
    visibleInfo: ['course', 'options', 'itemMemo', 'aggregate', 'bulkComplete'],
  };
  const tableWithMemo = createTableCardSegments(createTableGroups([order]), {
    maxCardHeight: 240,
    estimateOptions: withMemo,
  })[0];
  const tableWithoutMemo = createTableCardSegments(createTableGroups([order]), {
    maxCardHeight: 240,
    estimateOptions: withoutMemo,
  })[0];

  assert.ok(estimateOrderCardHeight(order, withMemo) > estimateOrderCardHeight(order, withoutMemo));
  assert.ok(
    estimateTableCardHeight(tableWithMemo, withMemo) >
      estimateTableCardHeight(tableWithoutMemo, withoutMemo),
  );
  assert.equal(tableWithMemo.order_groups[0].order_memo, order.order_memo);
  assert.equal(tableWithMemo.items[0].memo, '');
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
