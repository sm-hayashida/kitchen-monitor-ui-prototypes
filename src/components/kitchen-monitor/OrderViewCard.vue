<script setup>
import { Clock } from '@lucide/vue';
import { computed } from 'vue';
import { getOrderTimingStatus } from '../../features/kitchen-monitor/orderTimingStatus';
import CountdownProgressLine from './CountdownProgressLine.vue';
import OrderItemRow from './OrderItemRow.vue';

const props = defineProps({
  activeItemActionId: {
    type: String,
    default: null,
  },
  aggregateByKey: {
    type: Object,
    required: true,
  },
  completionStartedAt: {
    type: Number,
    default: null,
  },
  completionWindowMs: {
    type: Number,
    required: true,
  },
  itemCompletionStartedAt: {
    type: Object,
    required: true,
  },
  itemCompletionWindowMs: {
    type: Number,
    required: true,
  },
  order: {
    type: Object,
    required: true,
  },
  processedUnitNumbersByItemId: {
    type: Object,
    required: true,
  },
});

defineEmits([
  'cancel-item-completion',
  'complete-item',
  'complete-order',
  'open-aggregate',
  'set-item-processed-quantity',
  'toggle-item-action',
]);

const timingStatus = computed(() =>
  getOrderTimingStatus(props.order.ordered_elapsed_minutes),
);
const isUndoable = computed(() => Boolean(props.completionStartedAt));
const sourceOrderId = computed(() => props.order.source_order_id ?? props.order.id);
const segmentIndex = computed(() => props.order.segment_index ?? 1);
const isContinuation = computed(() => segmentIndex.value > 1);
const isLastSegment = computed(() => props.order.is_last_segment ?? true);
const hasOpenItemAction = computed(() =>
  props.order.items.some(
    (orderItem) => orderItem.order_item_id === props.activeItemActionId,
  ),
);
</script>

<template>
  <article
    class="order-view-card"
    :data-order-id="sourceOrderId"
    :data-segment-index="segmentIndex"
    :data-timing-state="timingStatus.state"
    :class="[
      timingStatus.className,
      {
        overdue: timingStatus.isOverdue,
        warning: timingStatus.isWarning,
        undoable: isUndoable,
        'item-menu-open': hasOpenItemAction,
        continuation: isContinuation,
        'has-continuation': !isLastSegment,
      },
    ]"
  >
    <header v-if="!isContinuation" class="order-view-card-head">
      <div class="order-view-primary-meta">
        <strong>{{ order.table_no }}</strong>
        <span class="timing-elapsed">注文から{{ order.ordered_elapsed_minutes }}分</span>
        <span>{{ order.guest_count }}名</span>
        <span v-if="order.table_category && order.table_category !== '未分類'" class="order-table-category">
          {{ order.table_category }}
        </span>
      </div>
      <div class="order-view-head-status">
        <span
          v-if="timingStatus.state !== 'normal'"
          class="timing-status-label"
          :class="timingStatus.className"
        >
          <Clock :size="12" :stroke-width="2.4" aria-hidden="true" />
          {{ timingStatus.label }}
        </span>
      </div>
      <small>{{ sourceOrderId }}</small>
    </header>

    <div
      v-if="!isContinuation && order.order_memo"
      class="order-card-memo-preview"
    >
      <span>注文メモ</span>
      <b>{{ order.order_memo }}</b>
    </div>

    <div class="order-view-items">
      <OrderItemRow
        v-for="orderItem in order.items"
        :key="orderItem.order_item_id"
        :active-item-action-id="activeItemActionId"
        :aggregate-by-key="aggregateByKey"
        :item-completion-started-at="itemCompletionStartedAt[orderItem.order_item_id]"
        :item-completion-window-ms="itemCompletionWindowMs"
        :order-item="orderItem"
        :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
        @cancel-item-completion="$emit('cancel-item-completion', $event)"
        @complete-item="$emit('complete-item', $event)"
        @open-aggregate="$emit('open-aggregate', $event)"
        @set-item-processed-quantity="$emit('set-item-processed-quantity', $event)"
        @toggle-item-action="$emit('toggle-item-action', $event)"
      />
    </div>

    <button
      v-if="isLastSegment"
      class="order-view-complete-button"
      :class="{ undoable: isUndoable }"
      type="button"
      @click="$emit('complete-order', sourceOrderId)"
    >
      <span>{{ isUndoable ? '↺ 完了取消' : '✓ すべて完了' }}</span>
      <CountdownProgressLine
        v-if="isUndoable"
        :duration-ms="completionWindowMs"
        :started-at="completionStartedAt"
      />
    </button>
  </article>
</template>
