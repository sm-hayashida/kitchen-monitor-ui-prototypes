import { nextTick, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue';

export function measureResponsiveColumnLayout(
  widthElement,
  {
    columnGap = 14,
    contentInset = 0,
    heightElement = widthElement,
    maxColumnCount = 3,
    minColumnHeight = 260,
    minColumnWidth = 290,
    navigationElement,
    reservedHeight = 0,
  } = {},
) {
  const navigationHeight = Math.max(
    reservedHeight,
    navigationElement?.getBoundingClientRect().height ?? 0,
  );
  const measuredHeight = Math.floor(heightElement.clientHeight - navigationHeight - contentInset);
  const measuredColumnCount = Math.floor(
    (widthElement.clientWidth + columnGap) / (minColumnWidth + columnGap),
  );

  return {
    columnHeight: measuredHeight > 0 ? measuredHeight : minColumnHeight,
    columnCount: Math.min(maxColumnCount, Math.max(1, measuredColumnCount)),
  };
}

export function useResponsiveColumnLayout(
  targetRef,
  {
    columnGap = 14,
    contentInset = 0,
    fallbackColumnHeight = 410,
    heightTargetRef = targetRef,
    maxColumnCount = 3,
    minColumnHeight = 260,
    minColumnWidth = 290,
    reservedHeight = 0,
  } = {},
) {
  const columnCount = ref(maxColumnCount);
  const columnHeight = ref(fallbackColumnHeight);
  const isLayoutReady = ref(false);
  let resizeObserver;
  let measureFrame;
  let settleFrame;
  let observedHeightElement;
  let observedNavigation;

  function measure() {
    if (measureFrame !== undefined) {
      return;
    }

    measureFrame = requestAnimationFrame(() => {
      measureFrame = undefined;
      const element = targetRef.value;
      const heightElement = toValue(heightTargetRef) ?? element;

      if (!element || !heightElement) {
        return;
      }

      const navigation = element.querySelector('.horizontal-scroll-navigation');

      if (navigation !== observedNavigation) {
        if (observedNavigation) {
          resizeObserver?.unobserve(observedNavigation);
        }
        if (navigation) {
          resizeObserver?.observe(navigation);
        }
        observedNavigation = navigation;
      }

      if (heightElement !== observedHeightElement) {
        if (observedHeightElement && observedHeightElement !== element) {
          resizeObserver?.unobserve(observedHeightElement);
        }
        observedHeightElement = heightElement;
        if (observedHeightElement !== element) {
          resizeObserver?.observe(observedHeightElement);
        }
      }

      const nextLayout = measureResponsiveColumnLayout(element, {
        columnGap,
        contentInset: toValue(contentInset),
        heightElement,
        maxColumnCount,
        minColumnHeight,
        minColumnWidth: toValue(minColumnWidth),
        navigationElement: navigation,
        reservedHeight: toValue(reservedHeight),
      });

      columnHeight.value = nextLayout.columnHeight;
      columnCount.value = nextLayout.columnCount;
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

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    if (measureFrame !== undefined) {
      cancelAnimationFrame(measureFrame);
    }
    if (settleFrame !== undefined) {
      cancelAnimationFrame(settleFrame);
    }
  });

  watch(
    () => [
      toValue(contentInset),
      toValue(heightTargetRef),
      toValue(minColumnWidth),
      toValue(reservedHeight),
    ],
    () => {
      isLayoutReady.value = false;
      measure();
    },
  );

  return {
    columnCount,
    columnHeight,
    isLayoutReady,
  };
}
