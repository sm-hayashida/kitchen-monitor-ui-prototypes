import { computed, inject, provide, reactive, ref } from 'vue';
import {
  applyComparisonPreset,
  createDefaultComparisonSettings,
  parseComparisonHash,
  serializeComparisonHash,
} from './comparisonConfig';

const comparisonStateKey = Symbol('kitchen-monitor-comparison');

export function createComparisonStore(initialHash = window.location.hash) {
  const parsed = parseComparisonHash(initialHash);
  const settings = reactive({ ...parsed.settings, info: [...parsed.settings.info] });
  const isPanelOpen = ref(parsed.openPanel);
  const unknownQueryEntries = ref(parsed.unknownQueryEntries);

  const enabledInfo = computed(() => new Set(settings.info));
  const resetKey = computed(() => [
    settings.scenario,
    settings.cardMinWidth,
    settings.rowSpacing,
    settings.quantityMode,
    settings.quantityDisplayStyle,
    settings.orderUndoMs,
    settings.itemHideMs,
    settings.targetMinutes,
    settings.warningMinutes,
    settings.motion ? 'motion-on' : 'motion-off',
    settings.info.join(','),
    settings.theme,
    settings.urgency,
    settings.intensity,
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
  }

  function applyPreset(presetId) {
    replaceSettings(applyComparisonPreset(settings, presetId));
  }

  function updateFromHash(hash) {
    const next = parseComparisonHash(hash);
    replaceSettings(next.settings);
    unknownQueryEntries.value = next.unknownQueryEntries;
    if (next.openPanel) {
      isPanelOpen.value = true;
    }
    return next.route;
  }

  function serialize(route, options = {}) {
    return serializeComparisonHash(route, settings, unknownQueryEntries.value, options);
  }

  function createShareUrl(route) {
    const url = new URL(window.location.href);
    url.hash = serialize(route, { includeDefaults: true, openPanel: true });
    return url.toString();
  }

  return {
    enabledInfo,
    isPanelOpen,
    resetKey,
    settings,
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
