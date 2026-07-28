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
const leftAggregateTotalStyles = new Set(['m', 'n']);

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
  const showAggregateButton = normalizedStyle === 'k' && hasAggregateQuantity;
  const showLeftAggregateTotal = leftAggregateTotalStyles.has(normalizedStyle) && hasAggregateQuantity;
  const leftAggregateTotalLabel = normalizedStyle === 'm'
    ? `計${aggregateTotalQuantity}`
    : `/${aggregateTotalQuantity}`;

  return {
    aggregateLabel: aggregateTotalQuantity === null ? '' : String(aggregateTotalQuantity),
    groupClass: `quantity-group-${normalizedStyle}`,
    isCurrent,
    isRightAligned,
    primaryLabel: String(primaryLabel),
    showAggregateButton,
    showLeftAggregateTotal,
    showLeftButton: isCurrent || leftAggregateTotalStyles.has(normalizedStyle),
    showRightGroup: isRightAligned,
    showSourceTotal,
    leftAggregateTotalLabel: showLeftAggregateTotal ? leftAggregateTotalLabel : '',
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
  if (style === 'm' || style === 'n') {
    return remainingQuantity;
  }
  if (style === 'l') {
    return `×${remainingQuantity}`;
  }
  return remainingQuantity;
}
