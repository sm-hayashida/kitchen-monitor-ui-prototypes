export const comparisonInfoKeys = [
  'course',
  'options',
  'itemMemo',
  'orderMemo',
  'aggregate',
  'bulkComplete',
];

const fullInfo = Object.freeze([...comparisonInfoKeys]);

export const comparisonDefaults = Object.freeze({
  scenario: 'normal',
  columnCount: 'auto',
  cardMinWidth: 290,
  rowSpacing: 'standard',
  quantityMode: 'current',
  quantityDisplayStyle: 'n',
  quantityInteractionMode: 'inline',
  itemTapMode: 'all',
  orderUndoMs: 3000,
  itemHideMs: 5000,
  targetMinutes: 15,
  warningMinutes: 3,
  motion: true,
  info: fullInfo,
  theme: 'orange',
  urgency: 'standard',
  intensity: 'standard',
});

export const comparisonRecipeGroups = Object.freeze([
  Object.freeze({ id: 'display', label: '表示' }),
  Object.freeze({ id: 'operation', label: '運用' }),
  Object.freeze({ id: 'situation', label: '状況' }),
]);

const allCurrentRecipeFields = Object.freeze({
  scenario: 'normal',
  columnCount: 'auto',
  cardMinWidth: 290,
  rowSpacing: 'standard',
  quantityMode: 'current',
  quantityDisplayStyle: 'n',
  quantityInteractionMode: 'inline',
  itemTapMode: 'all',
  orderUndoMs: 3000,
  itemHideMs: 5000,
  targetMinutes: 15,
  warningMinutes: 3,
  motion: true,
  info: fullInfo,
});

export const comparisonRecipes = Object.freeze({
  current: createRecipe({
    group: 'display',
    label: '現行基準',
    purpose: '現行仕様を確認',
    effectSummary: '290px・標準・全情報',
    settings: allCurrentRecipeFields,
  }),
  overview: createRecipe({
    group: 'display',
    label: '一覧性優先',
    purpose: '多くの注文を一度に確認',
    effectSummary: '260px・詰める・コース/集計/完了',
    settings: {
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
    },
  }),
  readable: createRecipe({
    group: 'display',
    label: '読みやすさ優先',
    purpose: '誤読しにくい余白を確認',
    effectSummary: '360px・広め・全情報',
    settings: {
      scenario: 'normal',
      cardMinWidth: 360,
      rowSpacing: 'comfortable',
      quantityMode: 'current',
      itemTapMode: 'all',
      orderUndoMs: 3000,
      itemHideMs: 5000,
      targetMinutes: 15,
      warningMinutes: 3,
      motion: true,
      info: fullInfo,
    },
  }),
  minimal: createRecipe({
    group: 'display',
    label: '情報最小',
    purpose: '必須情報だけを検討',
    effectSummary: '320px・標準・集計と完了のみ',
    settings: {
      scenario: 'normal',
      cardMinWidth: 320,
      rowSpacing: 'standard',
      quantityMode: 'current',
      itemTapMode: 'all',
      orderUndoMs: 3000,
      itemHideMs: 5000,
      targetMinutes: 15,
      warningMinutes: 3,
      motion: true,
      info: Object.freeze(['aggregate', 'bulkComplete']),
    },
  }),
  maximum: createRecipe({
    group: 'display',
    label: '情報最大',
    purpose: '長いカードと情報量を確認',
    effectSummary: 'メモ多め・360px・広め',
    settings: {
      scenario: 'memo',
      cardMinWidth: 360,
      rowSpacing: 'comfortable',
      quantityMode: 'current',
      itemTapMode: 'all',
      orderUndoMs: 3000,
      itemHideMs: 5000,
      targetMinutes: 15,
      warningMinutes: 3,
      motion: true,
      info: fullInfo,
    },
  }),
  careful: createRecipe({
    group: 'operation',
    label: '誤操作防止',
    purpose: '取消可能時間を長くする',
    effectSummary: '安全タップ・注文5秒・商品8秒',
    settings: {
      scenario: 'normal',
      cardMinWidth: 320,
      rowSpacing: 'standard',
      quantityMode: 'current',
      itemTapMode: 'safe',
      orderUndoMs: 5000,
      itemHideMs: 8000,
      targetMinutes: 15,
      warningMinutes: 3,
      motion: true,
      info: fullInfo,
    },
  }),
  aggregateQuantity: createRecipe({
    group: 'operation',
    label: '内訳で数量変更',
    purpose: '同一商品の注文を見ながら数量を選択',
    effectSummary: '数量タップ→内訳モーダル',
    settings: {
      scenario: 'normal',
      cardMinWidth: 320,
      rowSpacing: 'standard',
      quantityMode: 'current',
      quantityInteractionMode: 'aggregate',
      itemTapMode: 'all',
      orderUndoMs: 3000,
      itemHideMs: 5000,
      targetMinutes: 15,
      warningMinutes: 3,
      motion: true,
      info: fullInfo,
    },
  }),
  instant: createRecipe({
    group: 'operation',
    label: '高速運用',
    purpose: '完了を即時反映する',
    effectSummary: '290px・詰める・取消0秒',
    settings: {
      scenario: 'normal',
      cardMinWidth: 290,
      rowSpacing: 'compact',
      quantityMode: 'current',
      itemTapMode: 'all',
      orderUndoMs: 0,
      itemHideMs: 0,
      targetMinutes: 15,
      warningMinutes: 3,
      motion: true,
      info: fullInfo,
    },
  }),
  peak: createRecipe({
    group: 'situation',
    label: 'ピーク確認',
    purpose: '多数注文時の一覧性を確認',
    effectSummary: 'ピーク・290px・詰める',
    settings: {
      scenario: 'peak',
      cardMinWidth: 290,
      rowSpacing: 'compact',
      quantityMode: 'current',
      itemTapMode: 'all',
      orderUndoMs: 3000,
      itemHideMs: 5000,
      targetMinutes: 15,
      warningMinutes: 3,
      motion: true,
      info: fullInfo,
    },
  }),
  delay: createRecipe({
    group: 'situation',
    label: '遅延監視',
    purpose: '警告・超過が多い状態を確認',
    effectSummary: '遅延・320px・期限間近5分',
    settings: {
      scenario: 'delay',
      cardMinWidth: 320,
      rowSpacing: 'standard',
      quantityMode: 'current',
      itemTapMode: 'all',
      orderUndoMs: 3000,
      itemHideMs: 5000,
      targetMinutes: 15,
      warningMinutes: 5,
      motion: true,
      info: fullInfo,
    },
  }),
  quantity: createRecipe({
    group: 'situation',
    label: '数量処理',
    purpose: '多数商品の進捗表現を確認',
    effectSummary: '数量多め・320px・進捗',
    settings: {
      scenario: 'quantity',
      cardMinWidth: 320,
      rowSpacing: 'compact',
      quantityMode: 'progress',
      itemTapMode: 'all',
      orderUndoMs: 3000,
      itemHideMs: 5000,
      targetMinutes: 15,
      warningMinutes: 3,
      motion: true,
      info: fullInfo,
    },
  }),
});

export const comparisonThemeOptions = Object.freeze([
  Object.freeze({ id: 'orange', label: '現行オレンジ', intent: 'Current baseline' }),
  Object.freeze({ id: 'blue', label: 'ブルー', intent: 'Calm cool accent' }),
  Object.freeze({ id: 'teal', label: 'ティール', intent: 'Fresh operational accent' }),
  Object.freeze({ id: 'violet', label: 'バイオレット', intent: 'Distinct review variant' }),
  Object.freeze({ id: 'charcoal', label: 'チャコール', intent: 'Low-chroma dark accent on light surfaces' }),
]);

export const comparisonUrgencyOptions = Object.freeze([
  Object.freeze({ id: 'standard', label: '標準', intent: 'Current red/yellow baseline' }),
  Object.freeze({ id: 'highContrast', label: '高コントラスト', intent: 'Stronger border/text distinction' }),
  Object.freeze({ id: 'colorSafe', label: '色覚多様性対応', intent: 'Blue/purple-safe distinction plus labels' }),
  Object.freeze({ id: 'monochrome', label: 'モノクロ', intent: 'Light/dark contrast with text and icon emphasis' }),
]);

export const comparisonIntensityOptions = Object.freeze([
  Object.freeze({ id: 'soft', label: 'ソフト' }),
  Object.freeze({ id: 'standard', label: '標準' }),
  Object.freeze({ id: 'strong', label: '強調' }),
]);

export const comparisonQuantityDisplayStyleOptions = Object.freeze([
  Object.freeze({ id: 'current', label: '旧現行・左に数量' }),
  Object.freeze({ id: 'a', label: 'A 残数量のみ' }),
  Object.freeze({ id: 'b', label: 'B 独立2チップ' }),
  Object.freeze({ id: 'c', label: 'C 強弱つき2チップ' }),
  Object.freeze({ id: 'd', label: 'D 大小・右下配置' }),
  Object.freeze({ id: 'e', label: 'E 区切りコンテナ' }),
  Object.freeze({ id: 'f', label: 'F チップ＋補助数値' }),
  Object.freeze({ id: 'g', label: 'G 差分時のみ合計' }),
  Object.freeze({ id: 'h', label: 'H 塗り＋アウトライン' }),
  Object.freeze({ id: 'i', label: 'I 残＋括弧合計' }),
  Object.freeze({ id: 'j', label: 'J 縦積み・合計上小' }),
  Object.freeze({ id: 'k', label: 'K 右側・主数量＋横断集計' }),
  Object.freeze({ id: 'l', label: 'L 右側・×残数量' }),
  Object.freeze({ id: 'm', label: 'M 左残数＋計' }),
  Object.freeze({ id: 'n', label: 'N 左残数／合計（現行）' }),
]);

export const comparisonItemTapModeOptions = Object.freeze([
  Object.freeze({ id: 'all', label: '商品タップで残り全部を完了' }),
  Object.freeze({ id: 'safe', label: '1個だけ即完了・複数は数量確認' }),
]);

export const comparisonQuantityInteractionModeOptions = Object.freeze([
  Object.freeze({ id: 'inline', label: '現行：その場で数量変更' }),
  Object.freeze({ id: 'aggregate', label: '内訳：同一商品一覧で数量変更' }),
]);

export const comparisonLabels = Object.freeze({
  scenarios: Object.freeze({
    normal: '通常',
    peak: 'ピーク',
    long: '長い注文',
    quantity: '数量多め',
    memo: 'メモ多め',
    delay: '遅延',
  }),
  rowSpacings: Object.freeze({
    compact: '詰める',
    standard: '標準',
    comfortable: '広め',
  }),
  quantityModes: Object.freeze({
    current: '現行',
    remaining: '残数',
    progress: '進捗',
  }),
  quantityDisplayStyles: Object.freeze(
    Object.fromEntries(
      comparisonQuantityDisplayStyleOptions.map((option) => [option.id, option.label]),
    ),
  ),
  quantityInteractionModes: Object.freeze(
    Object.fromEntries(
      comparisonQuantityInteractionModeOptions.map((option) => [option.id, option.label]),
    ),
  ),
  itemTapModes: Object.freeze(
    Object.fromEntries(
      comparisonItemTapModeOptions.map((option) => [option.id, option.label]),
    ),
  ),
  info: Object.freeze({
    course: 'コース',
    options: 'オプション',
    itemMemo: '商品メモ',
    orderMemo: '注文メモ',
    aggregate: '横断集計',
    bulkComplete: '注文完了',
  }),
  motion: Object.freeze({
    true: '動きON',
    false: '動きOFF',
  }),
});

export const comparisonOptions = Object.freeze({
  scenarios: Object.freeze(['normal', 'peak', 'long', 'quantity', 'memo', 'delay']),
  columnCounts: Object.freeze(['auto', '2', '3', '4']),
  cardMinWidths: Object.freeze([260, 290, 320, 360]),
  rowSpacings: Object.freeze(['compact', 'standard', 'comfortable']),
  quantityModes: Object.freeze(['current', 'remaining', 'progress']),
  quantityDisplayStyles: Object.freeze(
    comparisonQuantityDisplayStyleOptions.map((option) => option.id),
  ),
  quantityInteractionModes: Object.freeze(
    comparisonQuantityInteractionModeOptions.map((option) => option.id),
  ),
  itemTapModes: Object.freeze(comparisonItemTapModeOptions.map((option) => option.id)),
  orderUndoMs: Object.freeze([0, 2000, 3000, 5000]),
  itemHideMs: Object.freeze([0, 3000, 5000, 8000]),
  targetMinutes: Object.freeze([10, 15, 20, 30]),
  warningMinutes: Object.freeze([3, 5]),
  themes: Object.freeze(comparisonThemeOptions.map((option) => option.id)),
  urgencies: Object.freeze(comparisonUrgencyOptions.map((option) => option.id)),
  intensities: Object.freeze(comparisonIntensityOptions.map((option) => option.id)),
});

export const comparisonQueryKeys = Object.freeze({
  scenario: 'cmp_scenario',
  columnCount: 'cmp_columns',
  cardMinWidth: 'cmp_card',
  rowSpacing: 'cmp_rows',
  quantityMode: 'cmp_qty',
  quantityDisplayStyle: 'cmp_qty_style',
  quantityInteractionMode: 'cmp_qty_action',
  itemTapMode: 'cmp_item_tap',
  orderUndoMs: 'cmp_order_undo',
  itemHideMs: 'cmp_item_hide',
  targetMinutes: 'cmp_target',
  warningMinutes: 'cmp_warning',
  motion: 'cmp_motion',
  info: 'cmp_info',
  theme: 'cmp_theme',
  urgency: 'cmp_urgency',
  intensity: 'cmp_intensity',
});

const supportedQueryKeys = new Set([...Object.values(comparisonQueryKeys), 'compare']);
const recipeFieldKeys = Object.freeze([
  'scenario',
  'cardMinWidth',
  'rowSpacing',
  'quantityMode',
  'quantityInteractionMode',
  'itemTapMode',
  'orderUndoMs',
  'itemHideMs',
  'targetMinutes',
  'warningMinutes',
  'motion',
  'info',
]);
const differenceFieldLabels = Object.freeze({
  scenario: 'シナリオ',
  columnCount: '列数',
  cardMinWidth: 'カード幅',
  rowSpacing: '行間',
  quantityMode: '数量',
  quantityDisplayStyle: '数量表示',
  quantityInteractionMode: '数量操作',
  itemTapMode: '商品タップ',
  orderUndoMs: '注文取消',
  itemHideMs: '商品非表示',
  targetMinutes: '目標',
  warningMinutes: '期限間近',
  motion: '動き',
  info: '表示情報',
  theme: 'テーマ',
  urgency: '警告配色',
  intensity: '強度',
});

export function createDefaultComparisonSettings() {
  return {
    ...comparisonDefaults,
    info: [...comparisonDefaults.info],
  };
}

export function normalizeComparisonSettings(candidate = {}) {
  return {
    scenario: enumValue(candidate.scenario, comparisonOptions.scenarios, comparisonDefaults.scenario),
    columnCount: enumValue(
      String(candidate.columnCount ?? ''),
      comparisonOptions.columnCounts,
      comparisonDefaults.columnCount,
    ),
    cardMinWidth: numberValue(
      candidate.cardMinWidth,
      comparisonOptions.cardMinWidths,
      comparisonDefaults.cardMinWidth,
    ),
    rowSpacing: enumValue(
      candidate.rowSpacing,
      comparisonOptions.rowSpacings,
      comparisonDefaults.rowSpacing,
    ),
    quantityMode: enumValue(
      candidate.quantityMode,
      comparisonOptions.quantityModes,
      comparisonDefaults.quantityMode,
    ),
    quantityDisplayStyle: enumValue(
      candidate.quantityDisplayStyle,
      comparisonOptions.quantityDisplayStyles,
      comparisonDefaults.quantityDisplayStyle,
    ),
    quantityInteractionMode: enumValue(
      candidate.quantityInteractionMode,
      comparisonOptions.quantityInteractionModes,
      comparisonDefaults.quantityInteractionMode,
    ),
    itemTapMode: enumValue(
      candidate.itemTapMode,
      comparisonOptions.itemTapModes,
      comparisonDefaults.itemTapMode,
    ),
    orderUndoMs: numberValue(
      candidate.orderUndoMs,
      comparisonOptions.orderUndoMs,
      comparisonDefaults.orderUndoMs,
    ),
    itemHideMs: numberValue(
      candidate.itemHideMs,
      comparisonOptions.itemHideMs,
      comparisonDefaults.itemHideMs,
    ),
    targetMinutes: numberValue(
      candidate.targetMinutes,
      comparisonOptions.targetMinutes,
      comparisonDefaults.targetMinutes,
    ),
    warningMinutes: numberValue(
      candidate.warningMinutes,
      comparisonOptions.warningMinutes,
      comparisonDefaults.warningMinutes,
    ),
    motion: typeof candidate.motion === 'boolean' ? candidate.motion : comparisonDefaults.motion,
    info: normalizeInfo(candidate.info),
    theme: enumValue(candidate.theme, comparisonOptions.themes, comparisonDefaults.theme),
    urgency: enumValue(candidate.urgency, comparisonOptions.urgencies, comparisonDefaults.urgency),
    intensity: enumValue(candidate.intensity, comparisonOptions.intensities, comparisonDefaults.intensity),
  };
}

export function applyComparisonPreset(currentSettings, presetId) {
  const recipe = comparisonRecipes[presetId];
  if (!recipe) {
    return normalizeComparisonSettings(currentSettings);
  }

  return normalizeComparisonSettings({
    ...currentSettings,
    ...recipe.settings,
    info: [...recipe.settings.info],
  });
}

export function getActiveComparisonRecipe(settings) {
  const normalized = normalizeComparisonSettings(settings);
  return Object.entries(comparisonRecipes).find(([, recipe]) =>
    recipeFieldKeys.every((key) => settingsEqual(normalized[key], recipe.settings[key])),
  )?.[0] ?? 'custom';
}

export function getComparisonDifferenceSummary(settings) {
  const normalized = normalizeComparisonSettings(settings);
  const differences = Object.keys(comparisonQueryKeys)
    .filter((key) => key !== 'compare' && !settingsEqual(normalized[key], comparisonDefaults[key]))
    .map((key) => ({
      key,
      label: differenceFieldLabels[key],
      valueLabel: getComparisonValueLabel(key, normalized[key]),
    }));
  const activeRecipeId = getActiveComparisonRecipe(normalized);
  const activeRecipe = comparisonRecipes[activeRecipeId];
  const chips = differences.slice(0, 3).map((difference) =>
    `${difference.label}:${difference.valueLabel}`,
  );

  return {
    activeRecipeId,
    activeRecipeLabel: activeRecipe?.label ?? 'カスタム',
    differenceCount: differences.length,
    chips,
    extraCount: Math.max(0, differences.length - chips.length),
    differences,
  };
}

export function parseComparisonHash(hash, routeOptions = {}) {
  const defaultRoute = routeOptions.defaultRoute ?? 'order-n-scroll';
  const routes = routeOptions.routes ?? [
    'order-n-scroll',
    'order-n-page',
    'order',
    'table-n-scroll',
    'table-n-page',
  ];
  const rawHash = String(hash ?? '').replace(/^#/, '');
  const [rawRoute = '', rawQuery = ''] = rawHash.split('?');
  const route = routes.includes(rawRoute) ? rawRoute : defaultRoute;
  const params = new URLSearchParams(rawQuery);
  const candidate = {};

  assignString(candidate, 'scenario', params.get(comparisonQueryKeys.scenario));
  assignString(candidate, 'columnCount', params.get(comparisonQueryKeys.columnCount));
  assignNumber(candidate, 'cardMinWidth', params.get(comparisonQueryKeys.cardMinWidth));
  assignString(candidate, 'rowSpacing', params.get(comparisonQueryKeys.rowSpacing));
  assignString(candidate, 'quantityMode', params.get(comparisonQueryKeys.quantityMode));
  assignString(candidate, 'quantityDisplayStyle', params.get(comparisonQueryKeys.quantityDisplayStyle));
  assignString(candidate, 'quantityInteractionMode', params.get(comparisonQueryKeys.quantityInteractionMode));
  assignString(candidate, 'itemTapMode', params.get(comparisonQueryKeys.itemTapMode));
  assignNumber(candidate, 'orderUndoMs', params.get(comparisonQueryKeys.orderUndoMs));
  assignNumber(candidate, 'itemHideMs', params.get(comparisonQueryKeys.itemHideMs));
  assignNumber(candidate, 'targetMinutes', params.get(comparisonQueryKeys.targetMinutes));
  assignNumber(candidate, 'warningMinutes', params.get(comparisonQueryKeys.warningMinutes));
  candidate.motion = parseMotion(params.get(comparisonQueryKeys.motion));
  candidate.info = parseInfoParam(params.get(comparisonQueryKeys.info));
  assignString(candidate, 'theme', params.get(comparisonQueryKeys.theme));
  assignString(candidate, 'urgency', params.get(comparisonQueryKeys.urgency));
  assignString(candidate, 'intensity', params.get(comparisonQueryKeys.intensity));

  return {
    route,
    settings: normalizeComparisonSettings(candidate),
    openPanel: params.get('compare') === '1',
    unknownQueryEntries: [...params.entries()].filter(([key]) => !supportedQueryKeys.has(key)),
  };
}

export function serializeComparisonHash(route, settings, unknownQueryEntries = [], options = {}) {
  const normalized = normalizeComparisonSettings(settings);
  const params = new URLSearchParams();

  unknownQueryEntries.forEach(([key, value]) => {
    if (!supportedQueryKeys.has(key)) {
      params.append(key, value);
    }
  });

  appendSetting(params, comparisonQueryKeys.scenario, normalized.scenario, comparisonDefaults.scenario, options);
  appendSetting(
    params,
    comparisonQueryKeys.columnCount,
    normalized.columnCount,
    comparisonDefaults.columnCount,
    options,
  );
  appendSetting(
    params,
    comparisonQueryKeys.cardMinWidth,
    normalized.cardMinWidth,
    comparisonDefaults.cardMinWidth,
    options,
  );
  appendSetting(params, comparisonQueryKeys.rowSpacing, normalized.rowSpacing, comparisonDefaults.rowSpacing, options);
  appendSetting(
    params,
    comparisonQueryKeys.quantityMode,
    normalized.quantityMode,
    comparisonDefaults.quantityMode,
    options,
  );
  appendSetting(
    params,
    comparisonQueryKeys.quantityDisplayStyle,
    normalized.quantityDisplayStyle,
    comparisonDefaults.quantityDisplayStyle,
    options,
  );
  appendSetting(
    params,
    comparisonQueryKeys.quantityInteractionMode,
    normalized.quantityInteractionMode,
    comparisonDefaults.quantityInteractionMode,
    options,
  );
  appendSetting(
    params,
    comparisonQueryKeys.itemTapMode,
    normalized.itemTapMode,
    comparisonDefaults.itemTapMode,
    options,
  );
  appendSetting(params, comparisonQueryKeys.orderUndoMs, normalized.orderUndoMs, comparisonDefaults.orderUndoMs, options);
  appendSetting(params, comparisonQueryKeys.itemHideMs, normalized.itemHideMs, comparisonDefaults.itemHideMs, options);
  appendSetting(
    params,
    comparisonQueryKeys.targetMinutes,
    normalized.targetMinutes,
    comparisonDefaults.targetMinutes,
    options,
  );
  appendSetting(
    params,
    comparisonQueryKeys.warningMinutes,
    normalized.warningMinutes,
    comparisonDefaults.warningMinutes,
    options,
  );
  appendSetting(
    params,
    comparisonQueryKeys.motion,
    normalized.motion ? 'on' : 'off',
    comparisonDefaults.motion ? 'on' : 'off',
    options,
  );
  appendInfo(params, normalized.info, options);
  appendSetting(params, comparisonQueryKeys.theme, normalized.theme, comparisonDefaults.theme, options);
  appendSetting(params, comparisonQueryKeys.urgency, normalized.urgency, comparisonDefaults.urgency, options);
  appendSetting(params, comparisonQueryKeys.intensity, normalized.intensity, comparisonDefaults.intensity, options);

  if (options.openPanel) {
    params.set('compare', '1');
  }

  const query = params.toString();
  return `#${route}${query ? `?${query}` : ''}`;
}

function createRecipe(recipe) {
  return Object.freeze({
    ...recipe,
    settings: Object.freeze({
      quantityInteractionMode: comparisonDefaults.quantityInteractionMode,
      ...recipe.settings,
      info: Object.freeze([...recipe.settings.info]),
    }),
  });
}

function assignString(candidate, key, value) {
  if (value !== null) {
    candidate[key] = value;
  }
}

function assignNumber(candidate, key, value) {
  if (value !== null) {
    candidate[key] = Number(value);
  }
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function numberValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function parseMotion(value) {
  if (value === 'on' || value === '1' || value === 'true') {
    return true;
  }
  if (value === 'off' || value === '0' || value === 'false') {
    return false;
  }
  return undefined;
}

function parseInfoParam(value) {
  if (value === null) {
    return undefined;
  }
  return value.split(',').filter(Boolean);
}

function normalizeInfo(value) {
  if (!Array.isArray(value)) {
    return [...comparisonDefaults.info];
  }
  const normalized = value.filter((key, index) =>
    comparisonInfoKeys.includes(key) && value.indexOf(key) === index,
  );
  return normalized.length > 0 || value.length === 0
    ? normalized
    : [...comparisonDefaults.info];
}

function appendSetting(params, key, value, defaultValue, options) {
  if (options.includeDefaults || value !== defaultValue) {
    params.set(key, String(value));
  }
}

function appendInfo(params, info, options) {
  const defaultValue = comparisonDefaults.info.join(',');
  const value = info.join(',');
  if (options.includeDefaults || value !== defaultValue) {
    params.set(comparisonQueryKeys.info, value);
  }
}

function settingsEqual(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

function getComparisonValueLabel(key, value) {
  if (key === 'scenario') {
    return comparisonLabels.scenarios[value];
  }
  if (key === 'columnCount') {
    return value === 'auto' ? '自動' : `${value}列`;
  }
  if (key === 'cardMinWidth') {
    return `${value}px`;
  }
  if (key === 'rowSpacing') {
    return comparisonLabels.rowSpacings[value];
  }
  if (key === 'quantityMode') {
    return comparisonLabels.quantityModes[value];
  }
  if (key === 'quantityDisplayStyle') {
    return comparisonLabels.quantityDisplayStyles[value];
  }
  if (key === 'quantityInteractionMode') {
    return comparisonLabels.quantityInteractionModes[value];
  }
  if (key === 'itemTapMode') {
    return comparisonLabels.itemTapModes[value];
  }
  if (key === 'orderUndoMs' || key === 'itemHideMs') {
    return `${value / 1000}秒`;
  }
  if (key === 'targetMinutes' || key === 'warningMinutes') {
    return `${value}分`;
  }
  if (key === 'motion') {
    return comparisonLabels.motion[String(value)];
  }
  if (key === 'info') {
    return value.length === comparisonInfoKeys.length ? '全情報' : `${value.length}項目`;
  }
  if (key === 'theme') {
    return comparisonThemeOptions.find((option) => option.id === value)?.label ?? value;
  }
  if (key === 'urgency') {
    return comparisonUrgencyOptions.find((option) => option.id === value)?.label ?? value;
  }
  if (key === 'intensity') {
    return comparisonIntensityOptions.find((option) => option.id === value)?.label ?? value;
  }
  return String(value);
}
