export function decideItemBodyAction({
  itemTapMode = 'all',
  remainingCount = 0,
} = {}) {
  const remaining = Math.max(0, Number(remainingCount) || 0);

  if (remaining <= 0) {
    return 'none';
  }

  if (itemTapMode === 'safe' && remaining >= 2) {
    return 'open-modal';
  }

  return 'complete-remaining';
}

export function createItemCompletionQuantity({
  processedCount = 0,
  totalQuantity = 0,
} = {}) {
  const processed = Math.max(0, Number(processedCount) || 0);
  const total = Math.max(0, Number(totalQuantity) || 0);

  return Math.min(total, processed + Math.max(0, total - processed));
}
