<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import {
  createModalSelections,
  createModalSelectionUpdates,
  setModalSelection,
  sumModalSelections,
} from '../../features/kitchen-monitor/modalSelection';
import { getOrderTimingStatus } from '../../features/kitchen-monitor/orderTimingStatus';

const props = defineProps({
  aggregate: {
    type: Object,
    required: true,
  },
  originOrderItemId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['apply-selections', 'close']);
const comparison = useComparisonStore();
const itemsPerPage = 8;
const currentPage = ref(1);
const selections = ref({});
const touchStartX = ref(null);

const showCourse = computed(() => comparison.enabledInfo.value.has('course'));
const showOptions = computed(() => comparison.enabledInfo.value.has('options'));
const showItemMemo = computed(() => comparison.enabledInfo.value.has('itemMemo'));
const showOrderMemo = computed(() => comparison.enabledInfo.value.has('orderMemo'));
const pageCount = computed(() => Math.max(1, Math.ceil(props.aggregate.matches.length / itemsPerPage)));
const pageMatches = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return props.aggregate.matches.slice(start, start + itemsPerPage);
});
const totalSelectedQuantity = computed(() => sumModalSelections(selections.value));

watch(
  () => [props.aggregate.aggregateKey, props.originOrderItemId],
  () => {
    currentPage.value = 1;
    selections.value = createModalSelections(props.aggregate.matches, props.originOrderItemId);
    nextTick(scrollFocusedItemIntoView);
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
  return getOrderTimingStatus(match.order.ordered_elapsed_minutes, {
    targetMinutes: comparison.settings.targetMinutes,
    warningWindowMinutes: comparison.settings.warningMinutes,
  });
}

function selectionFor(match) {
  return selections.value[match.orderItem.order_item_id] ?? 0;
}

function updateSelection(match, value) {
  selections.value = setModalSelection(
    selections.value,
    match.orderItem.order_item_id,
    value,
    match.orderItem.pending_quantity,
  );
}

function applySelections() {
  const updates = createModalSelectionUpdates(props.aggregate.matches, selections.value);

  if (updates.length > 0) {
    emit('apply-selections', updates);
  }
}

function scrollFocusedItemIntoView() {
  if (!props.originOrderItemId) {
    return;
  }

  document
    .querySelector(`[data-aggregate-order-item-id="${props.originOrderItemId}"]`)
    ?.scrollIntoView({ block: 'nearest' });
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
        :aria-label="`${aggregate.name}の同一商品処理`"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <header class="aggregate-modal-head">
          <button class="aggregate-modal-close" type="button" aria-label="閉じる" @click="$emit('close')">
            ×
          </button>
          <div>
            <small>
              同一商品の処理
              <template v-if="showCourse && aggregate.courseName">
                ・{{ aggregate.courseName }}
              </template>
            </small>
            <h2>{{ aggregate.name }}</h2>
          </div>
          <div class="aggregate-modal-total">
            <strong>{{ aggregate.totalQuantity }}</strong>
            <span>未調理 / {{ aggregate.orderCount }}注文</span>
          </div>
        </header>

        <div class="aggregate-order-grid">
          <article
            v-for="match in pageMatches"
            :key="match.orderItem.order_item_id"
            class="aggregate-order-tile"
            :class="{ focused: match.orderItem.order_item_id === originOrderItemId }"
            :data-aggregate-order-item-id="match.orderItem.order_item_id"
          >
            <header>
              <strong>{{ match.order.table_no }}</strong>
              <span :class="timingFor(match).className">
                {{ match.order.ordered_elapsed_minutes }}分
                <em v-if="timingFor(match).state !== 'normal'">{{ timingFor(match).label }}</em>
              </span>
              <b>未 {{ match.orderItem.pending_quantity }}</b>
            </header>
            <p>
              {{ match.order.order_id }}・{{ match.order.guest_count }}名・
              {{ match.orderItem.processed_quantity }}/{{ match.orderItem.quantity }}調理済み
            </p>
            <div
              v-if="showOptions && match.orderItem.toppings.length"
              class="aggregate-option-list"
            >
              <span v-for="topping in match.orderItem.toppings" :key="topping.id">
                {{ topping.name }}
              </span>
            </div>
            <p
              v-if="showItemMemo && match.orderItem.memo"
              class="aggregate-order-memo"
            >
              <strong>商品メモ</strong>
              {{ match.orderItem.memo }}
            </p>
            <p
              v-if="showOrderMemo && match.order.order_memo"
              class="aggregate-order-memo order-memo"
            >
              <strong>注文メモ</strong>
              {{ match.order.order_memo }}
            </p>
            <div class="aggregate-selection-control">
              <span>今回完了する数</span>
              <div>
                <button
                  type="button"
                  aria-label="今回完了する数を1減らす"
                  :disabled="selectionFor(match) === 0"
                  @click="updateSelection(match, selectionFor(match) - 1)"
                >
                  −
                </button>
                <strong>{{ selectionFor(match) }}</strong>
                <button
                  type="button"
                  aria-label="今回完了する数を1増やす"
                  :disabled="selectionFor(match) >= match.orderItem.pending_quantity"
                  @click="updateSelection(match, selectionFor(match) + 1)"
                >
                  ＋
                </button>
                <button
                  class="aggregate-select-all"
                  type="button"
                  :disabled="selectionFor(match) === match.orderItem.pending_quantity"
                  @click="updateSelection(match, match.orderItem.pending_quantity)"
                >
                  残り全部
                </button>
              </div>
            </div>
          </article>
        </div>

        <footer class="aggregate-modal-actions">
          <div v-if="pageCount > 1" class="aggregate-pagination">
            <button type="button" aria-label="最初のページ" :disabled="currentPage === 1" @click="setPage(1)">«</button>
            <button type="button" aria-label="前のページ" :disabled="currentPage === 1" @click="setPage(currentPage - 1)">‹</button>
            <strong>{{ currentPage }} / {{ pageCount }}</strong>
            <button type="button" aria-label="次のページ" :disabled="currentPage === pageCount" @click="setPage(currentPage + 1)">›</button>
            <button type="button" aria-label="最後のページ" :disabled="currentPage === pageCount" @click="setPage(pageCount)">»</button>
          </div>
          <button
            class="aggregate-confirm-button"
            type="button"
            :disabled="totalSelectedQuantity === 0"
            @click="applySelections"
          >
            {{ totalSelectedQuantity }}個を完了して閉じる
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
