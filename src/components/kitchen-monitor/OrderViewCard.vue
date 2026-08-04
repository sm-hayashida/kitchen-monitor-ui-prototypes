<script setup>
import { Clock, Pin } from '@lucide/vue';
import { computed } from 'vue';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import { getOrderTimingStatus } from '../../features/kitchen-monitor/orderTimingStatus';
import { createTableNumberStyle } from '../../features/kitchen-monitor/tableNumberPresentation';
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
  isPinned: {
    type: Boolean,
    default: false,
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
  'toggle-pinned',
]);

const comparison = useComparisonStore();
const timingStatus = computed(() =>
  getOrderTimingStatus(props.order.ordered_elapsed_minutes, {
    targetMinutes: comparison.settings.targetMinutes,
    warningWindowMinutes: comparison.settings.warningMinutes,
  }),
);
const showOrderMemo = computed(() => comparison.enabledInfo.value.has('orderMemo'));
const showBulkComplete = computed(() => comparison.enabledInfo.value.has('bulkComplete'));
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
        pinned: isPinned,
      },
    ]"
  >
    <header v-if="!isContinuation" class="order-view-card-head">
      <div class="order-view-primary-meta">
        <strong
          class="table-number-label"
          :style="createTableNumberStyle(order.table_no, 16)"
        >{{ order.table_no }}</strong>
        <span
          class="timing-elapsed"
          :aria-label="`注文から${order.ordered_elapsed_minutes}分`"
        >
          <span aria-hidden="true">
            <span class="order-elapsed-prefix">注文から</span>{{ order.ordered_elapsed_minutes }}分
          </span>
        </span>
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
        <button
          class="order-pin-button"
          :class="{ active: isPinned }"
          type="button"
          :aria-pressed="isPinned"
          :aria-label="isPinned ? `${sourceOrderId}のピン留めを解除` : `${sourceOrderId}を先頭にピン留め`"
          :title="isPinned ? 'ピン留めを解除' : '先頭にピン留め'"
          @click.stop="$emit('toggle-pinned', sourceOrderId)"
        >
          <Pin :size="15" :stroke-width="2.2" aria-hidden="true" />
        </button>
      </div>
      <small>{{ sourceOrderId }}</small>
    </header>

    <div
      v-if="!isContinuation && showOrderMemo && order.order_memo"
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
        @open-aggregate="$emit('open-aggregate', { ...$event, orderId: sourceOrderId })"
        @set-item-processed-quantity="$emit('set-item-processed-quantity', $event)"
        @toggle-item-action="$emit('toggle-item-action', $event)"
      />
    </div>

    <button
      v-if="isLastSegment && showBulkComplete"
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
