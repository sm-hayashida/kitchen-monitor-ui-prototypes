<script setup>
import { computed } from 'vue';
import {
  getOrderItemAggregateKey,
  getOrderItemDisplayName,
  getOrderItemInlineDetails,
} from '../../features/kitchen-monitor/orderItemPresentation';
import CountdownProgressLine from './CountdownProgressLine.vue';

const props = defineProps({
  activeItemActionId: {
    type: String,
    default: null,
  },
  aggregateByKey: {
    type: Object,
    required: true,
  },
  interactionsDisabled: {
    type: Boolean,
    default: false,
  },
  itemCompletionStartedAt: {
    type: Number,
    default: null,
  },
  itemCompletionWindowMs: {
    type: Number,
    default: 3000,
  },
  orderItem: {
    type: Object,
    required: true,
  },
  processedUnitNumbersByItemId: {
    type: Object,
    required: true,
  },
});

const processedUnits = computed(
  () => props.processedUnitNumbersByItemId[props.orderItem.order_item_id] ?? [],
);
const processedCount = computed(() => processedUnits.value.length);
const remainingCount = computed(() =>
  Math.max(0, props.orderItem.quantity - processedCount.value),
);
const aggregateKey = computed(() => getOrderItemAggregateKey(props.orderItem));
const aggregate = computed(() => props.aggregateByKey[aggregateKey.value] ?? null);
const aggregateRemainingCount = computed(
  () => aggregate.value?.totalQuantity ?? remainingCount.value,
);
const displayName = computed(() => getOrderItemDisplayName(props.orderItem));
const inlineDetails = computed(() => getOrderItemInlineDetails(props.orderItem));
const quantityOptions = computed(() =>
  props.orderItem.quantity <= 6
    ? Array.from({ length: props.orderItem.quantity + 1 }, (_, index) => index)
    : [],
);
function setProcessedQuantity(processedQuantity, keepOpen = false) {
  const nextQuantity = Math.min(
    props.orderItem.quantity,
    Math.max(0, processedQuantity),
  );

  return {
    orderItemId: props.orderItem.order_item_id,
    processedQuantity: nextQuantity,
    keepOpen,
  };
}

const canCompleteRow = computed(
  () => !props.interactionsDisabled && !props.itemCompletionStartedAt && remainingCount.value > 0,
);
const rowAriaLabel = computed(
  () => `${displayName.value}の残り${remainingCount.value}個をすべて調理済みにする`,
);

function completeRow() {
  if (!canCompleteRow.value) {
    return;
  }

  emit('complete-item', props.orderItem.order_item_id);
}

const emit = defineEmits([
  'cancel-item-completion',
  'complete-item',
  'open-aggregate',
  'set-item-processed-quantity',
  'toggle-item-action',
]);
</script>

<template>
  <div
    class="order-view-item"
    :data-order-item-id="orderItem.order_item_id"
    :class="{
      'action-open': activeItemActionId === orderItem.order_item_id,
      'fully-processed': processedCount === orderItem.quantity,
      'completion-pending': itemCompletionStartedAt,
      'row-action-available': canCompleteRow,
    }"
    @click="completeRow"
  >
    <button
      class="order-item-quantity"
      :class="{ partial: processedCount > 0 && remainingCount > 0 }"
      type="button"
      :disabled="interactionsDisabled"
      :aria-label="`${displayName}の残数${remainingCount}、同一商品の残数合計${aggregateRemainingCount}。調理済み数を変更`"
      @click.stop="$emit('toggle-item-action', orderItem.order_item_id)"
    >
      <span class="quantity-main-label">{{ remainingCount }}</span>
      <span class="quantity-sub-label">/{{ aggregateRemainingCount }}</span>
    </button>
    <button
      class="order-item-description order-item-row-complete"
      type="button"
      :disabled="!canCompleteRow"
      :aria-label="rowAriaLabel"
      @click.stop="completeRow"
    >
      <b>{{ displayName }}</b>
      <span
        v-if="orderItem.course_name || inlineDetails.visibleToppings.length"
        class="order-item-options"
      >
        <i v-if="orderItem.course_name" class="order-item-course">{{ orderItem.course_name }}</i>
        <span
          v-for="topping in inlineDetails.visibleToppings"
          :key="topping.id"
          class="order-item-option-chip"
        >
          {{ topping.name }}
        </span>
        <em v-if="inlineDetails.hiddenToppingCount">他{{ inlineDetails.hiddenToppingCount }}件</em>
      </span>
      <span v-if="inlineDetails.memo" class="order-item-memo">
        <i class="order-item-memo-label">メモ</i>
        {{ inlineDetails.memo }}
        <em v-if="inlineDetails.hasTruncatedMemo">全文</em>
      </span>
    </button>

    <div
      v-if="!interactionsDisabled && activeItemActionId === orderItem.order_item_id"
      class="item-quantity-menu quantity-picker"
      @click.stop
    >
      <header>
        <span>調理済み数</span>
        <b>{{ processedCount }}/{{ orderItem.quantity }}</b>
      </header>

      <div v-if="quantityOptions.length" class="quantity-choice-grid">
        <button
          v-for="quantity in quantityOptions"
          :key="quantity"
          type="button"
          :class="{ selected: processedCount === quantity }"
          :aria-label="`${quantity}個を調理済みにする`"
          @click="$emit('set-item-processed-quantity', setProcessedQuantity(quantity))"
        >
          {{ quantity }}
        </button>
      </div>

      <div v-else class="quantity-stepper">
        <button
          type="button"
          aria-label="調理済み数を1個減らす"
          :disabled="processedCount === 0"
          @click="$emit('set-item-processed-quantity', setProcessedQuantity(processedCount - 1, true))"
        >
          −
        </button>
        <strong>{{ processedCount }}/{{ orderItem.quantity }}</strong>
        <button
          type="button"
          aria-label="調理済み数を1個増やす"
          :disabled="processedCount === orderItem.quantity"
          @click="$emit('set-item-processed-quantity', setProcessedQuantity(processedCount + 1, true))"
        >
          ＋
        </button>
        <button
          class="quantity-complete-button"
          type="button"
          @click="$emit('set-item-processed-quantity', setProcessedQuantity(orderItem.quantity))"
        >
          全て
        </button>
      </div>

      <button
        v-if="aggregate"
        class="quantity-aggregate-link"
        type="button"
        @click="$emit('open-aggregate', aggregateKey)"
      >
        同一商品の内訳を見る
        <strong>{{ aggregate.totalQuantity }}個 / {{ aggregate.orderCount }}注文</strong>
      </button>
    </div>

    <CountdownProgressLine
      v-if="itemCompletionStartedAt"
      class="item-completion-progress"
      :duration-ms="itemCompletionWindowMs"
      :started-at="itemCompletionStartedAt"
    />
    <button
      v-if="itemCompletionStartedAt"
      class="item-completion-cancel"
      type="button"
      :aria-label="`${displayName}の完了を取り消す`"
      @click.stop="$emit('cancel-item-completion', orderItem.order_item_id)"
    >
      <span>↺ 再タップで取消</span>
    </button>
  </div>
</template>
