<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getOrderTimingStatus } from '../../features/kitchen-monitor/orderTimingStatus';

const props = defineProps({
  aggregate: {
    type: Object,
    required: true,
  },
  quantitySelectionEnabled: {
    type: Boolean,
    default: false,
  },
  sourceOrderId: {
    type: String,
    default: null,
  },
  sourceOrderItemId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['close', 'set-item-processed-quantity']);
const itemsPerPage = 8;
const currentPage = ref(1);
const touchStartX = ref(null);

const pageCount = computed(() => Math.max(1, Math.ceil(props.aggregate.matches.length / itemsPerPage)));
const pageMatches = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return props.aggregate.matches.slice(start, start + itemsPerPage);
});

watch(
  [
    () => props.aggregate.aggregateKey,
    () => props.sourceOrderId,
    () => props.sourceOrderItemId,
  ],
  () => {
    const sourceMatchIndex = props.aggregate.matches.findIndex((match) =>
      props.sourceOrderItemId
        ? match.orderItem.order_item_id === props.sourceOrderItemId
        : match.order.order_id === props.sourceOrderId,
    );
    currentPage.value = sourceMatchIndex < 0
      ? 1
      : Math.floor(sourceMatchIndex / itemsPerPage) + 1;
  },
  { immediate: true },
);

watch(pageCount, (nextPageCount) => {
  currentPage.value = Math.min(currentPage.value, nextPageCount);
});

function setPage(nextPage) {
  currentPage.value = Math.min(pageCount.value, Math.max(1, nextPage));
}

function timingFor(match) {
  return getOrderTimingStatus(match.order.ordered_elapsed_minutes);
}

function isSourceOrder(match) {
  return Boolean(props.sourceOrderId) && match.order.order_id === props.sourceOrderId;
}

function quantityOptionsFor(match) {
  return match.orderItem.quantity <= 6
    ? Array.from({ length: match.orderItem.quantity + 1 }, (_, index) => index)
    : [];
}

function setProcessedQuantity(match, processedQuantity) {
  const nextQuantity = Math.min(
    match.orderItem.quantity,
    Math.max(0, processedQuantity),
  );

  emit('set-item-processed-quantity', {
    orderItemId: match.orderItem.order_item_id,
    processedQuantity: nextQuantity,
    keepOpen: true,
  });
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    emit('close');
  }

  if (event.key === 'ArrowLeft') {
    setPage(currentPage.value - 1);
  }

  if (event.key === 'ArrowRight') {
    setPage(currentPage.value + 1);
  }
}

function onTouchStart(event) {
  touchStartX.value = event.touches[0]?.clientX ?? null;
}

function onTouchEnd(event) {
  if (touchStartX.value === null) {
    return;
  }

  const distance = (event.changedTouches[0]?.clientX ?? touchStartX.value) - touchStartX.value;
  if (Math.abs(distance) >= 54) {
    setPage(currentPage.value + (distance < 0 ? 1 : -1));
  }
  touchStartX.value = null;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="aggregate-modal-backdrop" @click.self="$emit('close')">
      <section
        class="aggregate-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="`${aggregate.name}の注文一覧${quantitySelectionEnabled ? 'と調理済み数の変更' : ''}`"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <header class="aggregate-modal-head">
          <button class="aggregate-modal-close" type="button" aria-label="閉じる" @click="$emit('close')">
            ×
          </button>
          <div>
            <small>
              {{ quantitySelectionEnabled ? '同一商品の注文内訳・数量変更' : '同一商品の注文内訳' }}
              <template v-if="aggregate.courseName">・{{ aggregate.courseName }}</template>
            </small>
            <h2>{{ aggregate.name }}</h2>
          </div>
          <div class="aggregate-modal-total">
            <strong>{{ aggregate.totalQuantity }}</strong>
            <span>{{ quantitySelectionEnabled ? '個 未調理' : '個' }} / {{ aggregate.orderCount }}注文</span>
          </div>
        </header>

        <div class="aggregate-order-grid">
          <article
            v-for="match in pageMatches"
            :key="match.orderItem.order_item_id"
            class="aggregate-order-tile"
            :class="{
              'quantity-selection-enabled': quantitySelectionEnabled,
              'fully-processed': match.orderItem.pending_quantity === 0,
              'source-order': isSourceOrder(match),
            }"
            :aria-label="isSourceOrder(match) ? `表示元の注文 ${match.order.order_id}` : undefined"
          >
            <header>
              <strong>
                {{ match.order.table_no }}
                <i v-if="isSourceOrder(match)" class="aggregate-source-badge">表示元</i>
              </strong>
              <span :class="timingFor(match).className">
                {{ match.order.ordered_elapsed_minutes }}分
                <em v-if="timingFor(match).state !== 'normal'">{{ timingFor(match).label }}</em>
              </span>
              <b>
                {{ quantitySelectionEnabled
                  ? `残 ${match.orderItem.pending_quantity}/${match.orderItem.quantity}`
                  : `×${match.orderItem.pending_quantity}` }}
              </b>
            </header>
            <p>
              {{ match.order.order_id }}・{{ match.order.guest_count }}名
              <template v-if="quantitySelectionEnabled || match.orderItem.processed_quantity">
                ・{{ match.orderItem.processed_quantity }}/{{ match.orderItem.quantity }}調理済み
              </template>
            </p>
            <div v-if="match.orderItem.toppings.length" class="aggregate-option-list">
              <span v-for="topping in match.orderItem.toppings" :key="topping.id">
                {{ topping.name }}
              </span>
            </div>
            <p v-if="match.orderItem.memo" class="aggregate-order-memo">
              {{ match.orderItem.memo }}
            </p>
            <section v-if="quantitySelectionEnabled" class="aggregate-quantity-editor">
              <div class="aggregate-quantity-editor-head">
                <span>調理済み数</span>
                <strong>{{ match.orderItem.processed_quantity }}/{{ match.orderItem.quantity }}</strong>
              </div>
              <div v-if="quantityOptionsFor(match).length" class="aggregate-quantity-choice-grid">
                <button
                  v-for="quantity in quantityOptionsFor(match)"
                  :key="quantity"
                  type="button"
                  :class="{ selected: match.orderItem.processed_quantity === quantity }"
                  :aria-label="`${match.order.table_no}の${quantity}個を調理済みにする`"
                  @click="setProcessedQuantity(match, quantity)"
                >
                  {{ quantity }}
                </button>
              </div>
              <div v-else class="aggregate-quantity-stepper">
                <button
                  type="button"
                  :disabled="match.orderItem.processed_quantity === 0"
                  :aria-label="`${match.order.table_no}の調理済み数を1個減らす`"
                  @click="setProcessedQuantity(match, match.orderItem.processed_quantity - 1)"
                >
                  −
                </button>
                <strong>{{ match.orderItem.processed_quantity }}/{{ match.orderItem.quantity }}</strong>
                <button
                  type="button"
                  :disabled="match.orderItem.processed_quantity === match.orderItem.quantity"
                  :aria-label="`${match.order.table_no}の調理済み数を1個増やす`"
                  @click="setProcessedQuantity(match, match.orderItem.processed_quantity + 1)"
                >
                  ＋
                </button>
                <button
                  class="aggregate-quantity-complete"
                  type="button"
                  :disabled="match.orderItem.processed_quantity === match.orderItem.quantity"
                  @click="setProcessedQuantity(match, match.orderItem.quantity)"
                >
                  全て
                </button>
              </div>
            </section>
          </article>
        </div>

        <footer v-if="pageCount > 1" class="aggregate-pagination">
          <button type="button" aria-label="最初のページ" :disabled="currentPage === 1" @click="setPage(1)">«</button>
          <button type="button" aria-label="前のページ" :disabled="currentPage === 1" @click="setPage(currentPage - 1)">‹</button>
          <strong>{{ currentPage }} / {{ pageCount }}</strong>
          <button type="button" aria-label="次のページ" :disabled="currentPage === pageCount" @click="setPage(currentPage + 1)">›</button>
          <button type="button" aria-label="最後のページ" :disabled="currentPage === pageCount" @click="setPage(pageCount)">»</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
