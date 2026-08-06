<script setup>
const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['horizontal', 'paged'].includes(value),
  },
  canPrevious: {
    type: Boolean,
    default: false,
  },
  canNext: {
    type: Boolean,
    default: false,
  },
  scrollProgress: {
    type: Number,
    default: 1,
  },
  firstVisibleColumn: {
    type: Number,
    default: 0,
  },
  lastVisibleColumn: {
    type: Number,
    default: 0,
  },
  totalColumnCount: {
    type: Number,
    default: 0,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  pageCount: {
    type: Number,
    default: 1,
  },
});

defineEmits([
  'first-page',
  'previous-page',
  'next-page',
  'last-page',
  'previous-column',
  'next-column',
  'previous-view',
  'next-view',
]);
</script>

<template>
  <div
    class="header-layout-navigation"
    :class="`mode-${mode}`"
  >
    <template v-if="mode === 'horizontal'">
      <button
        type="button"
        :disabled="!canPrevious"
        aria-label="表示幅分前へ"
        title="表示幅分前へ"
        @click="$emit('previous-view')"
      >
        «
      </button>
      <button
        type="button"
        :disabled="!canPrevious"
        aria-label="1列前へ"
        title="1列前へ"
        @click="$emit('previous-column')"
      >
        ‹
      </button>
      <output class="header-layout-position" aria-live="polite">
        {{ firstVisibleColumn }}–{{ lastVisibleColumn }} / {{ totalColumnCount }}列
      </output>
      <button
        type="button"
        :disabled="!canNext"
        aria-label="1列次へ"
        title="1列次へ"
        @click="$emit('next-column')"
      >
        ›
      </button>
      <button
        type="button"
        :disabled="!canNext"
        aria-label="表示幅分次へ"
        title="表示幅分次へ"
        @click="$emit('next-view')"
      >
        »
      </button>
      <div class="header-layout-progress" aria-hidden="true">
        <i :style="{ transform: `scaleX(${scrollProgress})` }"></i>
      </div>
    </template>

    <template v-else>
      <button
        type="button"
        aria-label="最初のページ"
        title="最初のページ"
        :disabled="currentPage === 1"
        @click="$emit('first-page')"
      >
        «
      </button>
      <button
        type="button"
        aria-label="前のページ"
        title="前のページ"
        :disabled="currentPage === 1"
        @click="$emit('previous-page')"
      >
        ‹
      </button>
      <strong aria-live="polite">{{ currentPage }} / {{ pageCount }}</strong>
      <button
        type="button"
        aria-label="次のページ"
        title="次のページ"
        :disabled="currentPage === pageCount"
        @click="$emit('next-page')"
      >
        ›
      </button>
      <button
        type="button"
        aria-label="最後のページ"
        title="最後のページ"
        :disabled="currentPage === pageCount"
        @click="$emit('last-page')"
      >
        »
      </button>
    </template>
  </div>
</template>
