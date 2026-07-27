import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

export function useResponsiveColumnLayout(
  targetRef,
  {
    columnGap = 14,
    contentInset = 0,
    fallbackColumnHeight = 410,
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
  let observedNavigation;

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

      const navigationHeight = Math.max(
        reservedHeight,
        navigation?.getBoundingClientRect().height ?? 0,
      );
      const measuredHeight = Math.floor(element.clientHeight - navigationHeight - contentInset);
      const measuredColumnCount = Math.floor(
        (element.clientWidth + columnGap) / (minColumnWidth + columnGap),
      );

      columnHeight.value = measuredHeight > 0 ? measuredHeight : minColumnHeight;
      columnCount.value = Math.min(maxColumnCount, Math.max(1, measuredColumnCount));
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

  return {
    columnCount,
    columnHeight,
    isLayoutReady,
  };
}
