<script setup>
import { Clock } from '@lucide/vue';
import { computed } from 'vue';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
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
  itemCompletionDurationByItemId: {
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
  'activate-item',
  'cancel-item-completion',
  'complete-order',
  'open-aggregate',
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
const segmentCount = computed(() => props.order.segment_count ?? 1);
const isContinuation = computed(() => segmentIndex.value > 1);
const isLastSegment = computed(() => props.order.is_last_segment ?? true);
const continuationLabel = computed(() =>
  `${props.order.table_no} 続き ${segmentIndex.value}/${segmentCount.value}`,
);
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

    <header v-else class="order-continuation-head">
      <strong>{{ continuationLabel }}</strong>
      <small>{{ sourceOrderId }}</small>
    </header>

    <div
      v-if="!isContinuation && showOrderMemo && order.order_memo"
      class="order-card-memo-preview order-card-memo-inline"
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
        :item-completion-window-ms="itemCompletionDurationByItemId[orderItem.order_item_id] ?? itemCompletionWindowMs"
        :order-item="orderItem"
        :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
        @activate-item="$emit('activate-item', $event)"
        @cancel-item-completion="$emit('cancel-item-completion', $event)"
        @open-aggregate="$emit('open-aggregate', $event)"
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
