import { reactive, ref } from 'vue';

const settingsStorageKey = 'kitchen-monitor-ui-settings-v1';

export const kitchenMonitorSettingsDefaults = Object.freeze({
  sortOrder: 'oldest',
  lineHeight: 'medium',
  hideCompletedSeconds: 3,
  showCourseName: true,
  showToppings: true,
  masterSoundEnabled: true,
  newOrderSound: false,
  delayedOrderSound: false,
  cancelledOrderSound: false,
});

const storedSettings = readStoredSettings();
const settings = reactive({
  ...kitchenMonitorSettingsDefaults,
  ...storedSettings,
  masterSoundEnabled: storedSettings.masterSoundEnabled
    ?? readStorageValue('kitchen-monitor-sound') !== 'off',
});
const ordersCleared = ref(false);
const orderDataRevision = ref(0);

export function useKitchenMonitorSettings() {
  function saveSettings(candidate = {}) {
    Object.assign(settings, normalizeSettings(candidate));
    writeStorageValue(settingsStorageKey, JSON.stringify(settings));
    writeStorageValue('kitchen-monitor-sound', settings.masterSoundEnabled ? 'on' : 'off');
  }

  function resetSettings() {
    saveSettings(kitchenMonitorSettingsDefaults);
  }

  function clearOrderData() {
    ordersCleared.value = true;
    orderDataRevision.value += 1;
  }

  function restoreMockOrderData() {
    ordersCleared.value = false;
    orderDataRevision.value += 1;
  }

  return {
    clearOrderData,
    orderDataRevision,
    ordersCleared,
    resetSettings,
    restoreMockOrderData,
    saveSettings,
    settings,
  };
}

function readStoredSettings() {
  try {
    const parsed = JSON.parse(readStorageValue(settingsStorageKey) ?? '{}');
    return normalizeSettings(parsed);
  } catch {
    return {};
  }
}

function readStorageValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The fixed mock remains usable even when the browser blocks local storage.
  }
}

function normalizeSettings(candidate = {}) {
  const normalized = {};

  if (['oldest', 'newest'].includes(candidate.sortOrder)) {
    normalized.sortOrder = candidate.sortOrder;
  }
  if (['low', 'medium', 'high'].includes(candidate.lineHeight)) {
    normalized.lineHeight = candidate.lineHeight;
  }
  if (candidate.hideCompletedSeconds !== undefined) {
    normalized.hideCompletedSeconds = clampInteger(candidate.hideCompletedSeconds, 1, 100, 3);
  }

  [
    'showCourseName',
    'showToppings',
    'masterSoundEnabled',
    'newOrderSound',
    'delayedOrderSound',
    'cancelledOrderSound',
  ].forEach((key) => {
    if (typeof candidate[key] === 'boolean') {
      normalized[key] = candidate[key];
    }
  });

  return normalized;
}

function clampInteger(value, minimum, maximum, fallback) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, numericValue));
}
