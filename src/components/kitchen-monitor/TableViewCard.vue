<script setup>
import { computed, ref } from 'vue';
import { Clock, Pin } from '@lucide/vue';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import {
  getOrderTimingStatus,
  summarizeOrderTimings,
} from '../../features/kitchen-monitor/orderTimingStatus';
import { createTableNumberStyle } from '../../features/kitchen-monitor/tableNumberPresentation';
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
  tableNameLimit: {
    type: Number,
    default: 3,
  },
});

defineEmits([
  'cancel-item-completion',
  'complete-item',
  'move-table',
  'open-aggregate',
  'set-item-processed-quantity',
  'toggle-item-action',
  'toggle-pinned',
]);

const comparison = useComparisonStore();
const timingOptions = computed(() => ({
  targetMinutes: comparison.settings.targetMinutes,
  warningWindowMinutes: comparison.settings.warningMinutes,
}));
const showOrderMemo = computed(() => comparison.enabledInfo.value.has('orderMemo'));
const itemTransitionName = computed(() => comparison.settings.motion ? 'table-item' : '');
const isContinuation = computed(() => props.table.segment_index > 1);
const isJoinedTableListOpen = ref(false);
const joinedTableNames = computed(() => {
  const names = Array.isArray(props.table.joined_table_names)
    ? props.table.joined_table_names
    : [props.table.table_name ?? props.table.table_no];
  return [...new Set(names.filter(Boolean))];
});
const isJoinedTable = computed(() => joinedTableNames.value.length > 1);
const visibleJoinedTableNames = computed(() =>
  joinedTableNames.value.slice(0, Math.max(1, Math.floor(props.tableNameLimit))),
);
const hiddenJoinedTableCount = computed(() =>
  Math.max(0, joinedTableNames.value.length - visibleJoinedTableNames.value.length),
);
const joinedTableListId = computed(() =>
  `joined-table-list-${String(props.table.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`,
);
const joinedTableLabel = computed(() =>
  `結合テーブル${joinedTableNames.value.length}卓: ${joinedTableNames.value.join('、')}`,
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

function toggleJoinedTableList() {
  isJoinedTableListOpen.value = !isJoinedTableListOpen.value;
}

function closeJoinedTableList() {
  isJoinedTableListOpen.value = false;
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
    @keydown.esc.stop="closeJoinedTableList"
  >
    <header v-if="!isContinuation" class="table-view-card-head">
      <div class="table-view-primary-meta">
        <span
          v-if="isJoinedTable"
          class="table-joined-summary"
          :aria-label="joinedTableLabel"
        >
          <small class="table-joined-label">結合</small>
          <strong class="table-joined-names">
            {{ visibleJoinedTableNames.join('・') }}
          </strong>
          <button
            v-if="hiddenJoinedTableCount > 0"
            class="table-joined-overflow"
            type="button"
            :aria-controls="joinedTableListId"
            :aria-expanded="isJoinedTableListOpen"
            :aria-label="`${joinedTableLabel}。全卓名を${isJoinedTableListOpen ? '閉じる' : '表示'}`"
            @click.stop="toggleJoinedTableList"
          >
            +{{ hiddenJoinedTableCount }}
          </button>
        </span>
        <strong
          v-else
          class="table-number-label"
          :style="createTableNumberStyle(table.table_no)"
        >{{ table.table_no }}</strong>
        <span
          class="timing-elapsed"
          :aria-label="`最古${table.earliest_elapsed_minutes}分`"
        >
          <span aria-hidden="true">
            <span class="table-elapsed-prefix">最古 </span>{{ table.earliest_elapsed_minutes }}分
          </span>
        </span>
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

    <section
      v-if="isJoinedTableListOpen && !isContinuation"
      :id="joinedTableListId"
      class="table-joined-popover"
      :aria-label="joinedTableLabel"
      role="region"
      @click.stop
    >
      <header>
        <strong>結合テーブル {{ joinedTableNames.length }}卓</strong>
        <button
          class="table-joined-popover-close"
          type="button"
          aria-label="結合テーブル一覧を閉じる"
          @click.stop="closeJoinedTableList"
        >
          ×
        </button>
      </header>
      <p>{{ joinedTableNames.join('・') }}</p>
    </section>

    <div class="table-order-groups">
      <section v-for="orderGroup in table.order_groups" :key="orderGroup.order_id">
        <header
          class="table-order-divider"
          :class="orderGroupTiming(orderGroup).className"
          :data-timing-state="orderGroupTiming(orderGroup).state"
        >
          <span>
            注文 {{ orderGroup.order_index }}
            <i
              v-if="orderGroup.show_order_memo && orderGroup.order_memo"
              class="table-order-memo-flag"
            >メモ</i>
          </span>
          <b>注文から{{ orderGroup.elapsed_minutes }}分</b>
          <em v-if="orderGroupTiming(orderGroup).state !== 'normal'">
            {{ orderGroupTiming(orderGroup).label }}
          </em>
          <small>{{ orderGroup.items.length }}品</small>
        </header>
        <p
          v-if="showOrderMemo && orderGroup.show_order_memo && orderGroup.order_memo"
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
            :item-completion-window-ms="itemCompletionWindowMs"
            :order-item="orderItem"
            :processed-unit-numbers-by-item-id="processedUnitNumbersByItemId"
            @cancel-item-completion="$emit('cancel-item-completion', $event)"
            @complete-item="$emit('complete-item', $event)"
            @open-aggregate="$emit('open-aggregate', { ...$event, orderId: orderGroup.order_id })"
            @set-item-processed-quantity="$emit('set-item-processed-quantity', $event)"
            @toggle-item-action="$emit('toggle-item-action', $event)"
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
