<script setup>
import GraceProgressBar from './GraceProgressBar.vue';
import {
  buttonLabel,
  hasBody,
  isMemoOmitted,
  isOverdue,
  isUndoable,
  memoPreviewLines,
  optionOverflow,
  undoProgressPercent,
  visibleOptions,
} from '../../features/kitchen-monitor/orderPresentation';

const props = defineProps({
  nowMs: {
    type: Number,
    required: true,
  },
  order: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['primary-action', 'select']);
</script>

<template>
  <article
    class="order-card"
    :class="{
      selected,
      overdue: isOverdue(order),
      undoable: isUndoable(order),
      empty: !hasBody(order),
    }"
    :data-order-card="order.id"
  >
    <header class="card-header">
      <div class="card-meta">
        <span class="table-no">{{ order.tableNo }}</span>
        <span class="elapsed">{{ order.elapsed }}分</span>
        <span class="quantity">×{{ order.quantity }}</span>
      </div>
      <button class="done-button" type="button" @click.stop="$emit('primary-action')">
        {{ buttonLabel(order) }}
      </button>
      <GraceProgressBar
        v-if="isUndoable(order)"
        :duration-ms="order.undoWindowMs"
        :percent="undoProgressPercent(order, nowMs)"
        aria-label="取消猶予の残り時間"
      />
    </header>

    <button class="card-body" type="button" @click="$emit('select')">
      <div v-if="order.options.length" class="chip-wrap">
        <span v-for="option in visibleOptions(order)" :key="option" class="option-chip">{{ option }}</span>
        <strong v-if="optionOverflow(order)" class="overflow-text">他{{ optionOverflow(order) }}件あり</strong>
      </div>

      <div v-if="order.options.length && order.memo" class="body-separator"></div>

      <div v-if="order.memo" class="memo-preview">
        <span v-for="line in memoPreviewLines(order)" :key="line">{{ line }}</span>
        <strong v-if="isMemoOmitted(order)">... 省略あり</strong>
      </div>
    </button>
  </article>
</template>
