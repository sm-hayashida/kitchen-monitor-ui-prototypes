<script setup>
import { computed } from 'vue';
import { Clock, Pin } from '@lucide/vue';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import {
  getOrderTimingStatus,
  summarizeOrderTimings,
} from '../../features/kitchen-monitor/orderTimingStatus';
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
  canMoveNext: {
    type: Boolean,
    default: true,
  },
  canMovePrevious: {
    type: Boolean,
    default: true,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isReorderMode: {
    type: Boolean,
    default: false,
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
  processedUnitNumbersByItemId: {
    type: Object,
    required: true,
  },
  table: {
    type: Object,
    required: true,
  },
});

defineEmits([
  'activate-item',
  'cancel-item-completion',
  'move-table',
  'open-aggregate',
  'toggle-pinned',
]);

const comparison = useComparisonStore();
const timingOptions = computed(() => ({
  targetMinutes: comparison.settings.targetMinutes,
  warningWindowMinutes: comparison.settings.warningMinutes,
}));
const showOrderMemo = computed(() => comparison.enabledInfo.value.has('orderMemo'));
const itemTransitionName = computed(() =>
  comparison.settings.motion ? 'table-item' : '',
);
const isContinuation = computed(() => props.table.segment_index > 1);
const continuationLabel = computed(() =>
  `${props.table.table_no} 続き ${props.table.segment_index}/${props.table.segment_count}`,
);
const timingStatus = computed(() =>
  getOrderTimingStatus(props.table.earliest_elapsed_minutes, timingOptions.value),
);
const timingSummary = computed(() => summarizeOrderTimings(props.table.orders, timingOptions.value));
const pendingQuantity = computed(() =>
  props.table.orders.reduce(
    (tableTotal, order) =>
      tableTotal +
      order.items.reduce((orderTotal, orderItem) => {
        const processedCount =
          props.processedUnitNumbersByItemId[orderItem.order_item_id]?.length ?? 0;
        return orderTotal + Math.max(0, orderItem.quantity - processedCount);
      }, 0),
    0,
  ),
);
const hasOpenItemAction = computed(() =>
  props.table.items.some(
    (orderItem) => orderItem.order_item_id === props.activeItemActionId,
  ),
);

function orderGroupTiming(orderGroup) {
  return getOrderTimingStatus(orderGroup.elapsed_minutes, timingOptions.value);
}
</script>

<template>
  <article
    class="table-view-card order-view-card"
    :data-table-id="table.source_table_id"
    :data-segment-index="table.segment_index"
    :data-timing-state="timingStatus.state"
    :class="[
      timingStatus.className,
      {
        overdue: timingStatus.isOverdue,
        warning: timingStatus.isWarning,
        pinned: isPinned,
        reordering: isReorderMode,
        continuation: isContinuation,
        'has-continuation': !table.is_last_segment,
        'item-menu-open': hasOpenItemAction,
      },
    ]"
  >
    <header v-if="!isContinuation" class="table-view-card-head">
      <div class="table-view-primary-meta">
        <strong>{{ table.table_no }}</strong>
        <span class="timing-elapsed">最古 {{ table.earliest_elapsed_minutes }}分</span>
        <span>{{ table.orders.length }}注文</span>
        <span>{{ table.guest_count }}名</span>
      </div>
      <div class="table-view-card-actions">
        <span
          v-if="timingSummary.state !== 'normal'"
          class="timing-status-label table-timing-summary"
          :class="timingSummary.className"
        >
          <Clock :size="11" :stroke-width="2.4" aria-hidden="true" />
          {{ timingSummary.label }}
        </span>
        <button
          class="table-pin-button"
          :class="{ active: isPinned }"
          type="button"
          :aria-pressed="isPinned"
          :aria-label="isPinned ? 'ピン留めを解除' : '先頭にピン留め'"
          :title="isPinned ? 'ピン留めを解除' : '先頭にピン留め'"
          @click="$emit('toggle-pinned', table.source_table_id)"
        >
          <Pin :size="15" :stroke-width="2.2" aria-hidden="true" />
        </button>
        <template v-if="isReorderMode">
          <button
            class="table-move-button"
            type="button"
            :disabled="!canMovePrevious"
            aria-label="前へ移動"
            title="前へ移動"
            @click="$emit('move-table', -1)"
          >
            ←
          </button>
          <button
            class="table-move-button"
            type="button"
            :disabled="!canMoveNext"
            aria-label="次へ移動"
            title="次へ移動"
            @click="$emit('move-table', 1)"
          >
            →
          </button>
        </template>
      </div>
    </header>

    <header v-else class="order-continuation-head table-continuation-head">
      <strong>{{ continuationLabel }}</strong>
      <small>{{ table.orders.length }}注文</small>
    </header>

    <div class="table-order-groups">
      <section v-for="orderGroup in table.order_groups" :key="orderGroup.order_id">
        <header
          class="table-order-divider"
          :class="orderGroupTiming(orderGroup).className"
          :data-timing-state="orderGroupTiming(orderGroup).state"
        >
          <span>
            注文 {{ orderGroup.order_index }}
          </span>
          <b>注文から{{ orderGroup.elapsed_minutes }}分</b>
          <em v-if="orderGroupTiming(orderGroup).state !== 'normal'">
            {{ orderGroupTiming(orderGroup).label }}
          </em>
          <small>{{ orderGroup.items.length }}品</small>
        </header>
        <p
          v-if="showOrderMemo && orderGroup.order_memo"
          class="table-order-memo-inline"
        >
          <strong>注文メモ</strong>
          <span>{{ orderGroup.order_memo }}</span>
        </p>
        <TransitionGroup tag="div" class="table-order-items" :name="itemTransitionName">
          <OrderItemRow
            v-for="orderItem in orderGroup.items"
            :key="orderItem.order_item_id"
            :active-item-action-id="activeItemActionId"
            :aggregate-by-key="aggregateByKey"
            :interactions-disabled="isReorderMode"
            :item-completion-started-at="itemCompletionStartedAt[orderItem.order_item_id]"
            :item-completion-window-ms="itemCompletionDurationByItemId[orderItem.order_item_id] ?? itemCompletionWindowMs"
            :order-item="orderItem"
            :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
            @activate-item="$emit('activate-item', $event)"
            @cancel-item-completion="$emit('cancel-item-completion', $event)"
            @open-aggregate="$emit('open-aggregate', $event)"
          />
        </TransitionGroup>
      </section>
    </div>

    <footer v-if="table.is_last_segment" class="table-card-summary">
      <span>{{ table.total_quantity }}点中</span>
      <strong>{{ pendingQuantity }}点 未調理</strong>
    </footer>
  </article>
</template>
