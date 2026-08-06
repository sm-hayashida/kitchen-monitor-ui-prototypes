import { ref } from 'vue';

export const columnCountPreferenceOptions = Object.freeze([
  { value: '3', label: '3列' },
  { value: '4', label: '4列（推奨）' },
]);

const columnCountPreference = ref('4');

function normalizeColumnCountPreference(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 3 && numericValue <= 4
    ? String(numericValue)
    : '4';
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
