<script setup>
import GraceProgressBar from './GraceProgressBar.vue';
import {
  buttonLabel,
  isMemoOmitted,
  isOverdue,
  isUndoable,
  memoPreviewLines,
  optionOverflow,
  undoProgressPercent,
  visibleOptions,
} from '../../features/kitchen-monitor/orderPresentation';

defineProps({
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
    class="order-list-row"
    :class="{
      selected,
      overdue: isOverdue(order),
      undoable: isUndoable(order),
    }"
    :data-order-row="order.id"
  >
    <button class="order-list-main" type="button" @click="$emit('select')">
      <div class="order-list-meta">
        <strong>{{ order.tableNo }}</strong>
        <span>{{ order.elapsed }}分</span>
        <b>×{{ order.quantity }}</b>
      </div>

      <div class="order-list-options">
        <span v-for="option in visibleOptions(order)" :key="option" class="option-chip">{{ option }}</span>
        <strong v-if="optionOverflow(order)" class="overflow-text">
          他{{ optionOverflow(order) }}件あり
        </strong>
        <span v-if="!order.options.length" class="list-empty">指定なし</span>
      </div>

      <div class="order-list-memo">
        <span v-for="line in memoPreviewLines(order)" :key="line">{{ line }}</span>
        <strong v-if="isMemoOmitted(order)">... 省略あり</strong>
        <span v-if="!order.memo" class="list-empty">メモなし</span>
      </div>
    </button>

    <button class="done-button list-done-button" type="button" @click.stop="$emit('primary-action')">
      {{ buttonLabel(order) }}
    </button>

    <GraceProgressBar
      v-if="isUndoable(order)"
      :duration-ms="order.undoWindowMs"
      :percent="undoProgressPercent(order, nowMs)"
      aria-label="取消猶予の残り時間"
    />
  </article>
</template>
