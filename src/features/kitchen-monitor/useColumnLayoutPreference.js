import { ref } from 'vue';

export const columnCountPreferenceOptions = Object.freeze([
  { value: 'auto', label: '自動' },
  { value: '2', label: '2列' },
  { value: '3', label: '3列' },
  { value: '4', label: '4列' },
]);

const columnCountPreference = ref('auto');

function normalizeColumnCountPreference(value) {
  if (value === 'auto') {
    return 'auto';
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 2 && numericValue <= 4
    ? String(numericValue)
    : 'auto';
}

export function useColumnLayoutPreference() {
  function setColumnCountPreference(value) {
    columnCountPreference.value = normalizeColumnCountPreference(value);
  }

  return {
    columnCountPreference,
    setColumnCountPreference,
  };
}
