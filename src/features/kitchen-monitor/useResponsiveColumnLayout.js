import { nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue';

const MEASURED_COLUMN_CONTENT_SELECTOR = [
  '.horizontal-column-stack',
  '.order-masonry-column',
].join(', ');

export function resolveRenderedOverflowCorrection(
  currentCorrection,
  safeContentBottom,
  renderedContentBottoms,
) {
  const renderedOverflow = renderedContentBottoms.reduce(
    (largestOverflow, contentBottom) =>
      Math.max(largestOverflow, Math.ceil(contentBottom - safeContentBottom)),
    0,
  );

  return Math.max(0, currentCorrection + renderedOverflow);
}

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
  let contentResizeObserver;
  let mutationObserver;
  let measureFrame;
  let settleFrame;
  let contentObservationFrame;
  let overflowCorrection = 0;
  let skipOverflowMeasurement = true;
  let targetWidth = 0;
  let targetHeight = 0;

  function contentElements(element) {
    return Array.from(element.querySelectorAll(MEASURED_COLUMN_CONTENT_SELECTOR));
  }

  function updateOverflowCorrection(element, baseContentInset) {
    const renderedContent = contentElements(element);
    if (!isLayoutReady.value || renderedContent.length === 0) {
      return;
    }

    const safeContentBottom = element.getBoundingClientRect().bottom - baseContentInset;
    overflowCorrection = resolveRenderedOverflowCorrection(
      overflowCorrection,
      safeContentBottom,
      renderedContent.map((content) => content.getBoundingClientRect().bottom),
    );
  }

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

      const baseContentInset = Math.max(0, Number(unref(contentInset)) || 0);
      if (skipOverflowMeasurement) {
        skipOverflowMeasurement = false;
      } else {
        updateOverflowCorrection(element, baseContentInset);
      }
      const measuredHeight = Math.floor(
        element.clientHeight - baseContentInset - overflowCorrection,
      );
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

  function observeRenderedContent() {
    const element = targetRef.value;
    if (!element || !contentResizeObserver) {
      return;
    }

    contentResizeObserver.disconnect();
    contentElements(element).forEach((content) => contentResizeObserver.observe(content));
    measure();
  }

  function scheduleContentObservation() {
    if (contentObservationFrame !== undefined) {
      return;
    }

    contentObservationFrame = requestAnimationFrame(() => {
      contentObservationFrame = undefined;
      observeRenderedContent();
    });
  }

  function handleTargetResize(entries) {
    const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0);
    const nextHeight = Math.round(entries[0]?.contentRect.height ?? 0);

    if (nextWidth !== targetWidth || nextHeight !== targetHeight) {
      targetWidth = nextWidth;
      targetHeight = nextHeight;
      overflowCorrection = 0;
      skipOverflowMeasurement = true;
    }
    measure();
  }

  onMounted(async () => {
    await nextTick();
    resizeObserver = new ResizeObserver(handleTargetResize);
    contentResizeObserver = new ResizeObserver(measure);
    mutationObserver = new MutationObserver(scheduleContentObservation);
    resizeObserver.observe(targetRef.value);
    mutationObserver.observe(targetRef.value, { childList: true, subtree: true });
    measure();
    scheduleContentObservation();
    settleFrame = requestAnimationFrame(() => {
      settleFrame = requestAnimationFrame(measure);
    });
  });

  function resetCorrectionAndMeasure() {
    overflowCorrection = 0;
    skipOverflowMeasurement = true;
    measure();
  }

  const stopWatchingPreference = watch(
    () => unref(preferredColumnCount),
    resetCorrectionAndMeasure,
  );
  const stopWatchingMinimumWidth = watch(
    () => unref(minColumnWidth),
    resetCorrectionAndMeasure,
  );
  const stopWatchingContentInset = watch(
    () => unref(contentInset),
    resetCorrectionAndMeasure,
  );

  onBeforeUnmount(() => {
    stopWatchingPreference();
    stopWatchingMinimumWidth();
    stopWatchingContentInset();
    resizeObserver?.disconnect();
    contentResizeObserver?.disconnect();
    mutationObserver?.disconnect();
    if (measureFrame !== undefined) {
      cancelAnimationFrame(measureFrame);
    }
    if (settleFrame !== undefined) {
      cancelAnimationFrame(settleFrame);
    }
    if (contentObservationFrame !== undefined) {
      cancelAnimationFrame(contentObservationFrame);
    }
  });

  return {
    columnCount,
    columnHeight,
    isLayoutReady,
  };
}
