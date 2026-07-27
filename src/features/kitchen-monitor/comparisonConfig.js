export const comparisonInfoKeys = [
  'course',
  'options',
  'itemMemo',
  'orderMemo',
  'aggregate',
  'bulkComplete',
];

export const comparisonDefaults = Object.freeze({
  scenario: 'normal',
  cardMinWidth: 290,
  rowSpacing: 'standard',
  quantityMode: 'current',
  orderUndoMs: 3000,
  itemHideMs: 5000,
  targetMinutes: 15,
  warningMinutes: 3,
  motion: true,
  info: Object.freeze([...comparisonInfoKeys]),
});

export const comparisonPresets = Object.freeze({
  current: Object.freeze({ ...comparisonDefaults, info: [...comparisonDefaults.info] }),
  dense: Object.freeze({ cardMinWidth: 290, rowSpacing: 'compact' }),
  comfortable: Object.freeze({ cardMinWidth: 360, rowSpacing: 'comfortable' }),
  careful: Object.freeze({ orderUndoMs: 5000, itemHideMs: 8000 }),
  instant: Object.freeze({ orderUndoMs: 0, itemHideMs: 0 }),
  peak: Object.freeze({ scenario: 'peak', cardMinWidth: 290, rowSpacing: 'compact' }),
});

export const comparisonOptions = Object.freeze({
  scenarios: Object.freeze(['normal', 'peak', 'long', 'quantity', 'memo', 'delay']),
  cardMinWidths: Object.freeze([290, 320, 360]),
  rowSpacings: Object.freeze(['compact', 'standard', 'comfortable']),
  quantityModes: Object.freeze(['current', 'remaining', 'progress']),
  orderUndoMs: Object.freeze([0, 2000, 3000, 5000]),
  itemHideMs: Object.freeze([0, 3000, 5000, 8000]),
  targetMinutes: Object.freeze([10, 15, 20, 30]),
  warningMinutes: Object.freeze([3, 5]),
});

export const comparisonQueryKeys = Object.freeze({
  scenario: 'cmp_scenario',
  cardMinWidth: 'cmp_card',
  rowSpacing: 'cmp_rows',
  quantityMode: 'cmp_qty',
  orderUndoMs: 'cmp_order_undo',
  itemHideMs: 'cmp_item_hide',
  targetMinutes: 'cmp_target',
  warningMinutes: 'cmp_warning',
  motion: 'cmp_motion',
  info: 'cmp_info',
});

const supportedQueryKeys = new Set([...Object.values(comparisonQueryKeys), 'compare']);

export function createDefaultComparisonSettings() {
  return {
    ...comparisonDefaults,
    info: [...comparisonDefaults.info],
  };
}

export function normalizeComparisonSettings(candidate = {}) {
  return {
    scenario: enumValue(candidate.scenario, comparisonOptions.scenarios, comparisonDefaults.scenario),
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
  };
}

export function applyComparisonPreset(currentSettings, presetId) {
  const preset = comparisonPresets[presetId];
  if (!preset) {
    return normalizeComparisonSettings(currentSettings);
  }

  if (presetId === 'current') {
    return createDefaultComparisonSettings();
  }

  return normalizeComparisonSettings({
    ...currentSettings,
    ...preset,
  });
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
  assignNumber(candidate, 'cardMinWidth', params.get(comparisonQueryKeys.cardMinWidth));
  assignString(candidate, 'rowSpacing', params.get(comparisonQueryKeys.rowSpacing));
  assignString(candidate, 'quantityMode', params.get(comparisonQueryKeys.quantityMode));
  assignNumber(candidate, 'orderUndoMs', params.get(comparisonQueryKeys.orderUndoMs));
  assignNumber(candidate, 'itemHideMs', params.get(comparisonQueryKeys.itemHideMs));
  assignNumber(candidate, 'targetMinutes', params.get(comparisonQueryKeys.targetMinutes));
  assignNumber(candidate, 'warningMinutes', params.get(comparisonQueryKeys.warningMinutes));
  candidate.motion = parseMotion(params.get(comparisonQueryKeys.motion));
  candidate.info = parseInfoParam(params.get(comparisonQueryKeys.info));

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

  if (options.openPanel) {
    params.set('compare', '1');
  }

  const query = params.toString();
  return `#${route}${query ? `?${query}` : ''}`;
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
