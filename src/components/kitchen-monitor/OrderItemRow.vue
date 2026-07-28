<script setup>
import { computed } from 'vue';
import {
  getOrderItemAggregateKey,
  getOrderItemDisplayName,
  getOrderItemInlineDetails,
} from '../../features/kitchen-monitor/orderItemPresentation';
import { decideItemBodyAction } from '../../features/kitchen-monitor/itemActionRules';
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
const hasPartialCompletion = computed(
  () => processedCount.value > 0 && remainingCount.value > 0,
);
const visibleToppings = computed(() =>
  showOptions.value ? inlineDetails.value.visibleToppings : [],
);
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
const currentQuantityLabel = computed(() => String(remainingCount.value));
const bodyAction = computed(() =>
  decideItemBodyAction({
    itemTapMode: comparison.settings.itemTapMode,
    remainingCount: remainingCount.value,
  }),
);
const bodyActionLabel = computed(() => {
  if (bodyAction.value === 'open-modal') {
    return '数量を選択';
  }
  if (bodyAction.value === 'complete-remaining') {
    return `残${remainingCount.value}を完了`;
  }
  return '完了済み';
});
const rowActionLabel = computed(() => {
  if (bodyAction.value === 'open-modal') {
    return '選択';
  }
  if (bodyAction.value === 'complete-remaining') {
    return '完了';
  }
  return '済';
});
const bodyAriaLabel = computed(() =>
  bodyAction.value === 'open-modal'
    ? `${displayName.value}の今回完了する数を選択`
    : `${displayName.value}の${bodyActionLabel.value}`,
);

function openSameProductModal() {
  emit('open-aggregate', {
    aggregateKey: aggregateKey.value,
    originOrderItemId: props.orderItem.order_item_id,
  });
}

function activateBody() {
  emit('activate-item', {
    action: bodyAction.value,
    aggregateKey: aggregateKey.value,
    orderItemId: props.orderItem.order_item_id,
    remainingCount: remainingCount.value,
  });
}

const emit = defineEmits([
  'activate-item',
  'cancel-item-completion',
  'open-aggregate',
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
      'has-partial-completion': hasPartialCompletion,
    }"
  >
    <button
      v-if="quantityDisplay.isCurrent"
      class="order-item-quantity current-quantity-control"
      :class="{ partial: hasPartialCompletion }"
      type="button"
      :disabled="interactionsDisabled"
      :aria-label="`${displayName}の同一商品処理を開く。残数${remainingCount}、元数量${orderItem.quantity}`"
      @click.stop="openSameProductModal"
    >
      <span>{{ currentQuantityLabel }}</span>
    </button>
    <button
      class="order-item-description order-item-body-action"
      type="button"
      :disabled="interactionsDisabled || bodyAction === 'none'"
      :aria-label="bodyAriaLabel"
      @click.stop="activateBody"
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
      </span>
      <span v-if="showItemMemo && inlineDetails.memo" class="order-item-memo">
        {{ inlineDetails.memo }}
      </span>
    </button>
    <div
      v-if="quantityDisplay.showRightGroup && !itemCompletionStartedAt"
      class="order-item-quantity-group"
      :class="quantityDisplay.groupClass"
    >
      <button
        class="order-item-quantity"
        :class="{ partial: processedCount > 0 }"
        type="button"
        :disabled="interactionsDisabled"
        :aria-label="`${displayName}の今回完了する数を選択`"
        @click.stop="openSameProductModal"
      >
        <span>{{ quantityDisplay.primaryLabel }}</span>
      </button>
      <button
        v-if="quantityDisplay.showSourceTotal"
        class="order-item-source-quantity"
        type="button"
        :disabled="interactionsDisabled"
        :aria-label="`${displayName}の同一商品処理を開く`"
        @click.stop="openSameProductModal"
      >
        <span>{{ quantityDisplay.sourceTotalLabel }}</span>
      </button>
      <button
        v-if="quantityDisplay.showAggregateButton"
        class="aggregate-quantity-button"
        :class="{ stacked: aggregate.orderCount > 1 }"
        type="button"
        :disabled="interactionsDisabled"
        :aria-label="`${displayName}の同一商品処理を開く`"
        @click.stop="openSameProductModal"
      >
        <span>{{ quantityDisplay.aggregateLabel }}</span>
      </button>
    </div>
    <button
      v-else-if="quantityDisplay.showAggregateButton && !itemCompletionStartedAt"
      class="aggregate-quantity-button"
      :class="{ stacked: aggregate.orderCount > 1 }"
      type="button"
      :disabled="interactionsDisabled"
      :aria-label="`${displayName}の同一商品処理を開く`"
      @click.stop="openSameProductModal"
    >
      <span>{{ quantityDisplay.aggregateLabel }}</span>
    </button>
    <button
      v-if="itemCompletionStartedAt"
      class="item-row-action item-completion-cancel"
      type="button"
      :aria-label="`${displayName}の完了を取り消す`"
      @click.stop="$emit('cancel-item-completion', orderItem.order_item_id)"
    >
      <span>取消</span>
    </button>
    <button
      v-else-if="!quantityDisplay.showRightGroup && bodyAction !== 'none'"
      class="item-row-action"
      type="button"
      :disabled="interactionsDisabled"
      :aria-label="bodyAriaLabel"
      @click.stop="activateBody"
    >
      <span>{{ rowActionLabel }}</span>
    </button>
    <span
      v-else-if="!quantityDisplay.showRightGroup && processedCount === orderItem.quantity"
      class="order-item-processed-mark"
      aria-label="すべて調理済み"
    >✓</span>
    <span
      v-else-if="!quantityDisplay.showRightGroup"
      class="order-item-aggregate-placeholder"
      aria-hidden="true"
    ></span>

    <CountdownProgressLine
      v-if="itemCompletionStartedAt"
      class="item-completion-progress"
      :duration-ms="itemCompletionWindowMs"
      :started-at="itemCompletionStartedAt"
    />
  </div>
</template>
