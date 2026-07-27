<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

const props = defineProps({
  ariaLabel: {
    type: String,
    required: true,
  },
  columns: {
    type: Array,
    required: true,
  },
  columnCount: {
    type: Number,
    default: 3,
  },
  columnMeta: {
    type: Array,
    default: () => [],
  },
  alignLastColumnToStart: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['visible-column-change']);

const scrollElement = ref(null);
const currentColumnIndex = ref(0);
const visibleColumnCount = ref(1);
const canScrollPrevious = ref(false);
const canScrollNext = ref(false);
const scrollProgress = ref(1);
let resizeObserver = null;
let scrollFrame = null;
let resizeFrame = null;
let columnStep = 1;

const totalColumnCount = computed(() => props.columns.length);
const scrollerStyle = computed(() => ({
  '--horizontal-column-width': `calc((100% - ${(props.columnCount - 1) * 14}px) / ${props.columnCount})`,
}));
const firstVisibleColumn = computed(() =>
  totalColumnCount.value === 0 ? 0 : currentColumnIndex.value + 1,
);
const lastVisibleColumn = computed(() =>
  Math.min(totalColumnCount.value, firstVisibleColumn.value + visibleColumnCount.value - 1),
);

function columnElements() {
  return Array.from(
    scrollElement.value?.querySelectorAll('.horizontal-scroll-column') ?? [],
  );
}

function resetScrollState() {
  currentColumnIndex.value = 0;
  visibleColumnCount.value = 1;
  canScrollPrevious.value = false;
  canScrollNext.value = false;
  scrollProgress.value = 1;
}

// Scrolling only reads cached geometry; layout measurements happen on resize/data changes.
function updateScrollState() {
  const element = scrollElement.value;

  if (!element || totalColumnCount.value === 0) {
    resetScrollState();
    return;
  }

  const nearestColumn = Math.round(element.scrollLeft / columnStep);
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);

  const nextColumnIndex = Math.min(
    totalColumnCount.value - 1,
    Math.max(0, nearestColumn),
  );
  if (nextColumnIndex !== currentColumnIndex.value) {
    currentColumnIndex.value = nextColumnIndex;
    emit('visible-column-change', nextColumnIndex);
  }
  canScrollPrevious.value = element.scrollLeft > 2;
  canScrollNext.value = element.scrollLeft < maxScrollLeft - 2;
  scrollProgress.value =
    element.scrollWidth > 0
      ? Math.min(1, (element.scrollLeft + element.clientWidth) / element.scrollWidth)
      : 1;
}

function measureScrollLayout() {
  const element = scrollElement.value;
  const columns = columnElements();

  if (!element || columns.length === 0) {
    resetScrollState();
    return;
  }

  const columnWidth = columns[0].getBoundingClientRect().width;
  const columnGap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
  columnStep = Math.max(1, columnWidth + columnGap);
  visibleColumnCount.value = Math.max(
    1,
    Math.min(
      columns.length,
      Math.floor((element.clientWidth + columnGap + 1) / columnStep),
    ),
  );
  updateScrollState();
}

function scheduleScrollStateUpdate() {
  if (scrollFrame !== null) {
    return;
  }

  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    updateScrollState();
  });
}

function scheduleLayoutMeasure() {
  if (resizeFrame !== null) {
    return;
  }

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null;
    measureScrollLayout();
  });
}

function scrollToColumn(columnIndex, behavior = 'smooth') {
  const element = scrollElement.value;

  if (!element || totalColumnCount.value === 0) {
    return;
  }

  const targetIndex = Math.min(totalColumnCount.value - 1, Math.max(0, columnIndex));
  currentColumnIndex.value = targetIndex;
  element.scrollTo({ left: targetIndex * columnStep, behavior });
}

function scrollByColumn(direction) {
  scrollToColumn(currentColumnIndex.value + direction);
}

defineExpose({ scrollToColumn });

watch(
  () => props.columns,
  async () => {
    const previousScrollLeft = scrollElement.value?.scrollLeft ?? 0;
    await nextTick();

    if (scrollElement.value) {
      const maxScrollLeft = Math.max(
        0,
        scrollElement.value.scrollWidth - scrollElement.value.clientWidth,
      );
      scrollElement.value.scrollTo({
        left: Math.min(previousScrollLeft, maxScrollLeft),
        behavior: 'auto',
      });
    }

    measureScrollLayout();
  },
);

onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleLayoutMeasure);
  resizeObserver.observe(scrollElement.value);
  measureScrollLayout();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (scrollFrame !== null) {
    cancelAnimationFrame(scrollFrame);
  }
  if (resizeFrame !== null) {
    cancelAnimationFrame(resizeFrame);
  }
});
</script>

<template>
  <div
    class="horizontal-scroll-frame"
    :class="{
      'can-scroll-next': canScrollNext,
      'can-scroll-previous': canScrollPrevious,
    }"
  >
    <div
      ref="scrollElement"
      class="horizontal-column-scroller"
      :style="scrollerStyle"
      :aria-label="ariaLabel"
      role="region"
      tabindex="0"
      @scroll.passive="scheduleScrollStateUpdate"
    >
      <section
        v-for="(column, columnIndex) in columns"
        :key="columnIndex"
        class="horizontal-scroll-column"
        :class="[
          columnMeta[columnIndex]?.toneClass,
          {
            'has-column-group': columnMeta[columnIndex],
            'column-group-start': columnMeta[columnIndex]?.isStart,
            'column-group-end': columnMeta[columnIndex]?.isEnd,
          },
        ]"
        :data-group-id="columnMeta[columnIndex]?.id"
      >
        <slot
          name="column-header"
          :column-index="columnIndex"
          :meta="columnMeta[columnIndex]"
        />
        <slot name="column" :column="column" :column-index="columnIndex" />
      </section>
      <i
        v-for="spacerIndex in alignLastColumnToStart ? Math.max(0, columnCount - 1) : 0"
        :key="`end-spacer-${spacerIndex}`"
        class="horizontal-scroll-end-column-spacer"
        aria-hidden="true"
      ></i>
    </div>

    <footer class="horizontal-scroll-navigation">
      <div class="horizontal-scroll-progress" aria-hidden="true">
        <i :style="{ transform: `scaleX(${scrollProgress})` }"></i>
      </div>
      <output class="horizontal-scroll-position" aria-live="polite">
        {{ firstVisibleColumn }}–{{ lastVisibleColumn }} / {{ totalColumnCount }}列
      </output>
      <button
        type="button"
        :disabled="!canScrollPrevious"
        aria-label="1列前へ"
        title="1列前へ"
        @click="scrollByColumn(-1)"
      >
        ‹
      </button>
      <button
        type="button"
        :disabled="!canScrollNext"
        aria-label="1列次へ"
        title="1列次へ"
        @click="scrollByColumn(1)"
      >
        ›
      </button>
    </footer>
  </div>
</template>
