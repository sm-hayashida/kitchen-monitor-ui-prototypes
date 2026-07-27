<script setup>
import {
  Clock,
  Layers3,
  MessageSquareText,
  Minus,
  Plus,
  Smartphone,
  UserRound,
  X,
} from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import { getOrderItemDisplayName } from '../../features/kitchen-monitor/orderItemPresentation';
import { getOrderTimingStatus } from '../../features/kitchen-monitor/orderTimingStatus';

const props = defineProps({
  anchorRect: {
    type: Object,
    required: true,
  },
  detail: {
    type: Object,
    required: true,
  },
  hideWhenComplete: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'set-item-processed-quantity']);
const comparison = useComparisonStore();
const popoverRef = ref(null);
const viewportRevision = ref(0);

const displayName = computed(() => getOrderItemDisplayName(props.detail.orderItem));
const showCourse = computed(() => comparison.enabledInfo.value.has('course'));
const showOptions = computed(() => comparison.enabledInfo.value.has('options'));
const showItemMemo = computed(() => comparison.enabledInfo.value.has('itemMemo'));
const showOrderMemo = computed(() => comparison.enabledInfo.value.has('orderMemo'));
const showAggregate = computed(() => comparison.enabledInfo.value.has('aggregate'));
const orderTiming = computed(() =>
  getOrderTimingStatus(props.detail.order.ordered_elapsed_minutes, {
    targetMinutes: comparison.settings.targetMinutes,
    warningWindowMinutes: comparison.settings.warningMinutes,
  }),
);
const sourceLabel = computed(() => {
  if (props.detail.order.order_source === 'mobile') {
    return 'モバイル注文';
  }
  if (props.detail.order.staff_name) {
    return `${props.detail.order.staff_name}さん受付`;
  }
  return 'スタッフ入力';
});
const itemTiming = computed(() => {
  const targetMinutes = props.detail.orderItem.target_minutes;

  if (!targetMinutes) {
    return null;
  }

  const difference = props.detail.order.ordered_elapsed_minutes - targetMinutes;
  return {
    className:
      difference >= 0 || Math.abs(difference) <= comparison.settings.warningMinutes
        ? difference >= 0 ? 'timing-overdue' : 'timing-warning'
        : '',
    label: difference >= 0 ? `${difference}分超過` : `あと${Math.abs(difference)}分`,
    targetMinutes,
  };
});
const aggregateScopeLabel = computed(() =>
  props.detail.orderItem.course_id ? '同じコース内の未調理' : '同一商品の未調理',
);
const position = computed(() => {
  viewportRevision.value;
  const margin = 12;
  const gap = 10;
  const width = Math.min(420, window.innerWidth - margin * 2);
  const estimatedHeight = Math.min(600, window.innerHeight - margin * 2);
  const anchor = props.anchorRect;
  let placement = 'right';
  let left = anchor.right + gap;

  if (left + width > window.innerWidth - margin) {
    left = anchor.left - width - gap;
    placement = 'left';
  }
  if (left < margin) {
    left = Math.max(margin, (window.innerWidth - width) / 2);
    placement = 'center';
  }

  return {
    placement,
    style: {
      left: `${Math.round(left)}px`,
      top: `${Math.round(
        Math.min(
          Math.max(margin, anchor.top - 18),
          Math.max(margin, window.innerHeight - estimatedHeight - margin),
        ),
      )}px`,
    },
  };
});

function setProcessedQuantity(processedQuantity) {
  emit('set-item-processed-quantity', {
    orderItemId: props.detail.orderItem.order_item_id,
    processedQuantity: Math.min(
      props.detail.orderItem.quantity,
      Math.max(0, processedQuantity),
    ),
    hideWhenComplete: props.hideWhenComplete,
    keepOpen: true,
  });
}

function onDocumentPointerDown(event) {
  if (
    event.target.closest?.('.order-item-detail-trigger, .order-card-memo-preview')
  ) {
    return;
  }

  if (!popoverRef.value?.contains(event.target)) {
    emit('close');
  }
}

function onDocumentScroll(event) {
  if (!popoverRef.value?.contains(event.target)) {
    emit('close');
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

function onResize() {
  viewportRevision.value += 1;
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('scroll', onDocumentScroll, true);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  document.removeEventListener('scroll', onDocumentScroll, true);
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <Teleport to="body">
    <section
      ref="popoverRef"
      class="order-item-detail-popover"
      :class="`placement-${position.placement}`"
      :style="position.style"
      role="dialog"
      :aria-label="`${displayName}の詳細`"
    >
      <header class="order-item-detail-head">
        <div>
          <span v-if="showCourse && detail.orderItem.course_name" class="detail-course-label">
            <Layers3 :size="13" aria-hidden="true" />
            {{ detail.orderItem.course_name }}
          </span>
          <h2>{{ displayName }}</h2>
          <p>
            <strong>{{ detail.order.table_no }}</strong>
            <span>{{ detail.order.order_id }}</span>
            <span
              v-if="detail.order.table_category && detail.order.table_category !== '未分類'"
            >
              {{ detail.order.table_category }}
            </span>
          </p>
        </div>
        <button type="button" aria-label="商品詳細を閉じる" @click="$emit('close')">
          <X :size="22" :stroke-width="2.2" aria-hidden="true" />
        </button>
      </header>

      <div class="order-item-detail-scroll">
        <section class="order-item-detail-status">
          <div>
            <Clock :size="17" aria-hidden="true" />
            <span>注文から{{ detail.order.ordered_elapsed_minutes }}分</span>
            <b v-if="orderTiming.state !== 'normal'" :class="orderTiming.className">
              {{ orderTiming.label }}
            </b>
          </div>
          <div v-if="itemTiming">
            <span>商品目標 {{ itemTiming.targetMinutes }}分</span>
            <b :class="itemTiming.className">{{ itemTiming.label }}</b>
          </div>
          <div>
            <component
              :is="detail.order.order_source === 'mobile' ? Smartphone : UserRound"
              :size="17"
              aria-hidden="true"
            />
            <span>{{ sourceLabel }}</span>
          </div>
        </section>

        <section v-if="showOptions && detail.orderItem.toppings.length" class="order-item-detail-section">
          <h3>オプション <span>{{ detail.orderItem.toppings.length }}件</span></h3>
          <div class="order-item-detail-options">
            <span v-for="topping in detail.orderItem.toppings" :key="topping.id">
              {{ topping.name }}
            </span>
          </div>
        </section>

        <section v-if="showItemMemo && detail.orderItem.memo" class="order-item-detail-section">
          <h3><MessageSquareText :size="16" aria-hidden="true" /> 商品メモ</h3>
          <p class="order-item-detail-memo">{{ detail.orderItem.memo }}</p>
        </section>

        <section v-if="showOrderMemo && detail.order.order_memo" class="order-item-detail-section">
          <h3><MessageSquareText :size="16" aria-hidden="true" /> 注文メモ</h3>
          <p class="order-item-detail-memo order-memo">{{ detail.order.order_memo }}</p>
        </section>

        <section v-if="showAggregate" class="order-item-detail-section order-item-detail-aggregate">
          <span>この商品</span>
          <strong>{{ detail.orderItem.quantity }}個</strong>
          <template v-if="detail.aggregate">
            <span>{{ aggregateScopeLabel }}</span>
            <strong>{{ detail.aggregate.totalQuantity }}個 / {{ detail.aggregate.orderCount }}注文</strong>
          </template>
        </section>
      </div>

      <footer class="order-item-detail-footer">
        <div>
          <span>調理済み</span>
          <strong>{{ detail.processedCount }} / {{ detail.orderItem.quantity }}</strong>
        </div>
        <button
          type="button"
          aria-label="調理済み数を1個減らす"
          :disabled="detail.processedCount === 0"
          @click="setProcessedQuantity(detail.processedCount - 1)"
        >
          <Minus :size="20" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="調理済み数を1個増やす"
          :disabled="detail.processedCount === detail.orderItem.quantity"
          @click="setProcessedQuantity(detail.processedCount + 1)"
        >
          <Plus :size="20" aria-hidden="true" />
        </button>
        <button
          class="detail-complete-all"
          type="button"
          :disabled="detail.processedCount === detail.orderItem.quantity"
          @click="setProcessedQuantity(detail.orderItem.quantity)"
        >
          すべて調理済み
        </button>
      </footer>
    </section>
  </Teleport>
</template>
