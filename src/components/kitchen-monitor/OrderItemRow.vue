<script setup>
import { computed } from 'vue';
import {
  getOrderItemAggregateKey,
  getOrderItemDisplayName,
  getOrderItemInlineDetails,
} from '../../features/kitchen-monitor/orderItemPresentation';
import { createQuantityDisplayModel } from '../../features/kitchen-monitor/quantityDisplay';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
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

const comparison = useComparisonStore();
const processedUnits = computed(
  () => props.processedUnitNumbersByItemId[props.orderItem.order_item_id] ?? [],
);
const processedCount = computed(() => processedUnits.value.length);
const remainingCount = computed(() => Math.max(0, props.orderItem.quantity - processedCount.value));
const aggregateKey = computed(() => getOrderItemAggregateKey(props.orderItem));
const aggregate = computed(() => props.aggregateByKey[aggregateKey.value] ?? null);
const displayName = computed(() => getOrderItemDisplayName(props.orderItem));
const inlineDetails = computed(() => getOrderItemInlineDetails(props.orderItem));
const showCourse = computed(() => comparison.enabledInfo.value.has('course'));
const showOptions = computed(() => comparison.enabledInfo.value.has('options'));
const showItemMemo = computed(() => comparison.enabledInfo.value.has('itemMemo'));
const showAggregate = computed(() => comparison.enabledInfo.value.has('aggregate'));
const quantityDisplayStyle = computed(() => comparison.settings.quantityDisplayStyle ?? 'current');
const visibleToppings = computed(() =>
  showOptions.value ? inlineDetails.value.visibleToppings : [],
);
const hiddenToppingCount = computed(() =>
  showOptions.value ? inlineDetails.value.hiddenToppingCount : 0,
);
const quantityLabel = computed(() => {
  if (comparison.settings.quantityMode === 'remaining') {
    return remainingCount.value;
  }
  if (comparison.settings.quantityMode === 'progress') {
    return `${processedCount.value}/${props.orderItem.quantity}`;
  }
  return processedCount.value > 0
    ? `${processedCount.value}/${props.orderItem.quantity}`
    : props.orderItem.quantity;
});
const quantityDisplay = computed(() =>
  createQuantityDisplayModel({
    style: quantityDisplayStyle.value,
    quantityMode: comparison.settings.quantityMode,
    processedCount: processedCount.value,
    totalQuantity: props.orderItem.quantity,
    aggregateTotalQuantity: aggregate.value?.totalQuantity ?? null,
    hasAggregate: Boolean(aggregate.value),
    showAggregate: showAggregate.value,
  }),
);
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

function openItemDetail(event) {
  const anchor = event.currentTarget.closest('.order-view-item')?.getBoundingClientRect();

  if (!anchor) {
    return;
  }

  emit('open-item-detail', {
    orderItemId: props.orderItem.order_item_id,
    anchorRect: {
      top: anchor.top,
      right: anchor.right,
      bottom: anchor.bottom,
      left: anchor.left,
      width: anchor.width,
      height: anchor.height,
    },
  });
}

const emit = defineEmits([
  'cancel-item-completion',
  'open-aggregate',
  'open-item-detail',
  'set-item-processed-quantity',
  'toggle-item-action',
]);
</script>

<template>
  <div
    class="order-view-item"
    :class="{
      'action-open': activeItemActionId === orderItem.order_item_id,
      'fully-processed': processedCount === orderItem.quantity,
      'completion-pending': itemCompletionStartedAt,
      [`quantity-style-${quantityDisplayStyle}`]: true,
      'quantity-side-right': quantityDisplay.isRightAligned,
      'has-aggregate-quantity': quantityDisplay.showAggregateButton,
    }"
  >
    <button
      v-if="quantityDisplay.isCurrent"
      class="order-item-quantity"
      :class="{ partial: processedCount > 0 }"
      type="button"
      :disabled="interactionsDisabled"
      :aria-label="`${displayName}の調理数を変更`"
      @click.stop="$emit('toggle-item-action', orderItem.order_item_id)"
    >
      <span>{{ quantityLabel }}</span>
    </button>
    <button
      class="order-item-description order-item-detail-trigger"
      type="button"
      :disabled="interactionsDisabled"
      :aria-label="`${displayName}の詳細を表示`"
      @click.stop="openItemDetail"
    >
      <b>{{ displayName }}</b>
      <span
        v-if="(showCourse && orderItem.course_name) || visibleToppings.length"
        class="order-item-options"
      >
        <i v-if="showCourse && orderItem.course_name" class="order-item-course">{{ orderItem.course_name }}</i>
        <template v-if="visibleToppings.length">
          {{ visibleToppings.map((topping) => topping.name).join('・') }}
        </template>
        <em v-if="hiddenToppingCount">他{{ hiddenToppingCount }}件</em>
      </span>
      <span v-if="showItemMemo && inlineDetails.memo" class="order-item-memo">
        {{ inlineDetails.memo }}
        <em v-if="inlineDetails.hasTruncatedMemo">全文</em>
      </span>
    </button>
    <div
      v-if="quantityDisplay.showRightGroup"
      class="order-item-quantity-group"
      :class="quantityDisplay.groupClass"
    >
      <button
        class="order-item-quantity"
        :class="{ partial: processedCount > 0 }"
        type="button"
        :disabled="interactionsDisabled"
        :aria-label="`${displayName}の調理数を変更`"
        @click.stop="$emit('toggle-item-action', orderItem.order_item_id)"
      >
        <span>{{ quantityDisplay.primaryLabel }}</span>
      </button>
      <span
        v-if="quantityDisplay.showSourceTotal"
        class="order-item-source-quantity"
      >
        <span>{{ quantityDisplay.sourceTotalLabel }}</span>
      </span>
      <button
        v-if="quantityDisplay.showAggregateButton"
        class="aggregate-quantity-button"
        :class="{ stacked: aggregate.orderCount > 1 }"
        type="button"
        :disabled="interactionsDisabled"
        :aria-label="`${displayName}の全注文を表示`"
        @click.stop="$emit('open-aggregate', aggregateKey)"
      >
        <span>{{ quantityDisplay.aggregateLabel }}</span>
      </button>
    </div>
    <button
      v-else-if="quantityDisplay.showAggregateButton"
      class="aggregate-quantity-button"
      :class="{ stacked: aggregate.orderCount > 1 }"
      type="button"
      :disabled="interactionsDisabled"
      :aria-label="`${displayName}の全注文を表示`"
      @click.stop="$emit('open-aggregate', aggregateKey)"
    >
      <span>{{ quantityDisplay.aggregateLabel }}</span>
    </button>
    <span
      v-else-if="processedCount === orderItem.quantity"
      class="order-item-processed-mark"
      aria-label="すべて調理済み"
    >✓</span>
    <span v-else class="order-item-aggregate-placeholder" aria-hidden="true"></span>

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
      <span>↺ 取消</span>
    </button>
  </div>
</template>
