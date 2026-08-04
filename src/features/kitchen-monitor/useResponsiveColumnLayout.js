import { nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue';

export function useResponsiveColumnLayout(
  targetRef,
  {
    columnGap = 14,
    contentInset = 0,
    fallbackColumnHeight = 410,
    maxColumnCount = 4,
    minColumnCount = 2,
    minColumnHeight = 260,
    minColumnWidth = 290,
    preferredColumnCount = 'auto',
  } = {},
) {
  const columnCount = ref(maxColumnCount);
  const columnHeight = ref(fallbackColumnHeight);
  const isLayoutReady = ref(false);
  let resizeObserver;
  let measureFrame;
  let settleFrame;

  function measure() {
    if (measureFrame !== undefined) {
      return;
    }

    measureFrame = requestAnimationFrame(() => {
      measureFrame = undefined;
      const element = targetRef.value;

      if (!element) {
        return;
      }

      const measuredHeight = Math.floor(element.clientHeight - contentInset);
      const resolvedMinColumnWidth = Number(unref(minColumnWidth)) || 290;
      const measuredColumnCount = Math.floor(
        (element.clientWidth + columnGap) / (resolvedMinColumnWidth + columnGap),
      );
      const requestedColumnCount = Number(unref(preferredColumnCount));
      const hasRequestedColumnCount =
        Number.isInteger(requestedColumnCount) &&
        requestedColumnCount >= minColumnCount &&
        requestedColumnCount <= maxColumnCount;

      columnHeight.value = measuredHeight > 0 ? measuredHeight : minColumnHeight;
      columnCount.value = hasRequestedColumnCount
        ? requestedColumnCount
        : Math.min(maxColumnCount, Math.max(minColumnCount, measuredColumnCount));
      isLayoutReady.value = true;
    });
  }

  onMounted(async () => {
    await nextTick();
    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(targetRef.value);
    measure();
    settleFrame = requestAnimationFrame(() => {
      settleFrame = requestAnimationFrame(measure);
    });
  });

  const stopWatchingPreference = watch(() => unref(preferredColumnCount), measure);
  const stopWatchingMinimumWidth = watch(() => unref(minColumnWidth), measure);

  onBeforeUnmount(() => {
    stopWatchingPreference();
    stopWatchingMinimumWidth();
    resizeObserver?.disconnect();
    if (measureFrame !== undefined) {
      cancelAnimationFrame(measureFrame);
    }
    if (settleFrame !== undefined) {
      cancelAnimationFrame(settleFrame);
    }
  });

  return {
    columnCount,
    columnHeight,
    isLayoutReady,
  };
}
