import { computed, inject, provide, reactive, ref } from 'vue';
import {
  applyComparisonColorPattern,
  applyComparisonPreset,
  createDefaultComparisonSettings,
  parseComparisonHash,
  serializeComparisonHash,
} from './comparisonConfig';
import {
  createReviewOrder,
  maxReviewOrderCount,
  normalizeReviewOrderDraft,
  normalizeReviewOrderDrafts,
} from './comparisonReviewOrders';

const comparisonStateKey = Symbol('kitchen-monitor-comparison');

export function createComparisonStore(initialHash = window.location.hash) {
  const parsed = parseComparisonHash(initialHash);
  const settings = reactive({ ...parsed.settings, info: [...parsed.settings.info] });
  const isPanelOpen = ref(parsed.openPanel);
  const unknownQueryEntries = ref(parsed.unknownQueryEntries);
  const reviewOrderDrafts = ref(normalizeReviewOrderDrafts(parsed.reviewOrders));
  const reviewOrderRevision = ref(0);

  const enabledInfo = computed(() => new Set(settings.info));
  const reviewOrders = computed(() =>
    reviewOrderDrafts.value.map((draft, index) => createReviewOrder(draft, index + 1)),
  );
  const resetKey = computed(() => [
    settings.scenario,
    settings.columnCount,
    settings.cardMinWidth,
    settings.rowSpacing,
    settings.quantityMode,
    settings.quantityDisplayStyle,
    settings.quantityInteractionMode,
    settings.itemTapMode,
    settings.orderUndoMs,
    settings.itemHideMs,
    settings.targetMinutes,
    settings.warningMinutes,
    settings.orderTimeDisplayMode,
    settings.motion ? 'motion-on' : 'motion-off',
    settings.info.join(','),
    settings.theme,
    settings.urgency,
    settings.intensity,
    settings.statusColorMode,
  ].join('|'));

  function replaceSettings(nextSettings) {
    Object.assign(settings, nextSettings);
    settings.info = [...nextSettings.info];
  }

  function setField(key, value) {
    replaceSettings({ ...settings, [key]: value });
  }

  function toggleInfo(key) {
    const nextInfo = settings.info.includes(key)
      ? settings.info.filter((value) => value !== key)
      : [...settings.info, key];
    replaceSettings({ ...settings, info: nextInfo });
  }

  function resetToCurrent() {
    replaceSettings(createDefaultComparisonSettings());
    replaceReviewOrders([]);
  }

  function applyPreset(presetId) {
    replaceSettings(applyComparisonPreset(settings, presetId));
  }

  function applyColorPattern(patternId) {
    replaceSettings(applyComparisonColorPattern(settings, patternId));
  }

  function updateFromHash(hash) {
    const next = parseComparisonHash(hash);
    replaceSettings(next.settings);
    replaceReviewOrders(next.reviewOrders);
    unknownQueryEntries.value = next.unknownQueryEntries;
    if (next.openPanel) {
      isPanelOpen.value = true;
    }
    return next.route;
  }

  function serialize(route, options = {}) {
    return serializeComparisonHash(route, settings, unknownQueryEntries.value, {
      ...options,
      reviewOrders: reviewOrderDrafts.value,
    });
  }

  function createShareUrl(route) {
    const url = new URL(window.location.href);
    url.hash = serialize(route, { includeDefaults: true, openPanel: true });
    return url.toString();
  }

  function addReviewOrder(candidate) {
    if (reviewOrderDrafts.value.length >= maxReviewOrderCount) {
      return null;
    }

    const usedIds = new Set(reviewOrderDrafts.value.map((draft) => draft.id));
    let index = reviewOrderDrafts.value.length + 1;
    while (usedIds.has(`review-${index}`)) {
      index += 1;
    }
    const nextDrafts = normalizeReviewOrderDrafts([
      ...reviewOrderDrafts.value,
      normalizeReviewOrderDraft(candidate, index),
    ]);
    replaceReviewOrders(nextDrafts);
    return nextDrafts.at(-1) ?? null;
  }

  function removeReviewOrder(orderId) {
    replaceReviewOrders(reviewOrderDrafts.value.filter((draft) => draft.id !== orderId));
  }

  function clearReviewOrders() {
    replaceReviewOrders([]);
  }

  function replaceReviewOrders(nextDrafts) {
    const normalized = normalizeReviewOrderDrafts(nextDrafts);
    if (JSON.stringify(normalized) === JSON.stringify(reviewOrderDrafts.value)) {
      return;
    }
    reviewOrderDrafts.value = normalized;
    reviewOrderRevision.value += 1;
  }

  return {
    addReviewOrder,
    clearReviewOrders,
    enabledInfo,
    isPanelOpen,
    maxReviewOrderCount,
    removeReviewOrder,
    resetKey,
    reviewOrderDrafts,
    reviewOrderRevision,
    reviewOrders,
    settings,
    applyColorPattern,
    applyPreset,
    createShareUrl,
    resetToCurrent,
    serialize,
    setField,
    toggleInfo,
    updateFromHash,
  };
}

export function provideComparisonStore(store) {
  provide(comparisonStateKey, store);
}

export function useComparisonStore() {
  const store = inject(comparisonStateKey);
  if (!store) {
    throw new Error('Comparison store is not provided');
  }
  return store;
}
