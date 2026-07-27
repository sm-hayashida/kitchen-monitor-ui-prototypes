export const rightAlignedQuantityDisplayStyles = Object.freeze([
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
]);

const sourceTotalStyles = new Set(['b', 'c', 'd', 'e', 'f', 'h', 'i', 'j']);

export function createQuantityDisplayModel({
  style = 'current',
  quantityMode = 'current',
  processedCount = 0,
  totalQuantity = 0,
  aggregateTotalQuantity = null,
  hasAggregate = false,
  showAggregate = true,
} = {}) {
  const normalizedStyle = String(style ?? 'current');
  const remainingQuantity = Math.max(0, Number(totalQuantity) - Number(processedCount));
  const isCurrent = normalizedStyle === 'current';
  const isRightAligned = rightAlignedQuantityDisplayStyles.includes(normalizedStyle);
  const hasAggregateQuantity = showAggregate && hasAggregate && aggregateTotalQuantity !== null;
  const currentLabel = createCurrentQuantityLabel({
    quantityMode,
    processedCount,
    remainingQuantity,
    totalQuantity,
  });
  const primaryLabel = createPrimaryLabel({
    style: normalizedStyle,
    currentLabel,
    remainingQuantity,
  });
  const sourceTotalLabel = normalizedStyle === 'i'
    ? `(${totalQuantity})`
    : String(totalQuantity);
  const showSourceTotal = sourceTotalStyles.has(normalizedStyle) ||
    (normalizedStyle === 'g' && remainingQuantity !== Number(totalQuantity));
  const showAggregateButton = (isCurrent || normalizedStyle === 'k') && hasAggregateQuantity;

  return {
    aggregateLabel: aggregateTotalQuantity === null ? '' : String(aggregateTotalQuantity),
    groupClass: `quantity-group-${normalizedStyle}`,
    isCurrent,
    isRightAligned,
    primaryLabel: String(primaryLabel),
    showAggregateButton,
    showRightGroup: isRightAligned,
    showSourceTotal,
    sourceTotalLabel,
  };
}

function createCurrentQuantityLabel({
  quantityMode,
  processedCount,
  remainingQuantity,
  totalQuantity,
}) {
  if (quantityMode === 'remaining') {
    return remainingQuantity;
  }
  if (quantityMode === 'progress') {
    return `${processedCount}/${totalQuantity}`;
  }
  return processedCount > 0
    ? `${processedCount}/${totalQuantity}`
    : totalQuantity;
}

function createPrimaryLabel({ style, currentLabel, remainingQuantity }) {
  if (style === 'current' || style === 'k') {
    return currentLabel;
  }
  if (style === 'l') {
    return `×${remainingQuantity}`;
  }
  return remainingQuantity;
}
