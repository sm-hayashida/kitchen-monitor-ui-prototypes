export const defaultTableNumberLength = 3;

export function createTableNumberStyle(value, baseFontSize = 17) {
  const length = Array.from(String(value ?? '')).length;
  if (length <= defaultTableNumberLength) {
    return undefined;
  }

  const fontSize = Math.max(
    6,
    Math.floor((baseFontSize * defaultTableNumberLength) / length),
  );

  return {
    fontSize: `${fontSize}px`,
    letterSpacing: length >= 6 ? '-0.7px' : '-0.2px',
  };
}
