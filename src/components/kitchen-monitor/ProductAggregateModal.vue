<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getOrderTimingStatus } from '../../features/kitchen-monitor/orderTimingStatus';

const props = defineProps({
  aggregate: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close']);
const itemsPerPage = 8;
const currentPage = ref(1);
const touchStartX = ref(null);

const pageCount = computed(() => Math.max(1, Math.ceil(props.aggregate.matches.length / itemsPerPage)));
const pageMatches = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return props.aggregate.matches.slice(start, start + itemsPerPage);
});

watch(
  () => props.aggregate.aggregateKey,
  () => {
    currentPage.value = 1;
  },
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
        :aria-label="`${aggregate.name}の注文一覧`"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <header class="aggregate-modal-head">
          <button class="aggregate-modal-close" type="button" aria-label="閉じる" @click="$emit('close')">
            ×
          </button>
          <div>
            <small>
              同一商品の注文内訳
              <template v-if="aggregate.courseName">・{{ aggregate.courseName }}</template>
            </small>
            <h2>{{ aggregate.name }}</h2>
          </div>
          <div class="aggregate-modal-total">
            <strong>{{ aggregate.totalQuantity }}</strong>
            <span>個 / {{ aggregate.orderCount }}注文</span>
          </div>
        </header>

        <div class="aggregate-order-grid">
          <article v-for="match in pageMatches" :key="match.orderItem.order_item_id" class="aggregate-order-tile">
            <header>
              <strong>{{ match.order.table_no }}</strong>
              <span :class="timingFor(match).className">
                {{ match.order.ordered_elapsed_minutes }}分
                <em v-if="timingFor(match).state !== 'normal'">{{ timingFor(match).label }}</em>
              </span>
              <b>×{{ match.orderItem.pending_quantity }}</b>
            </header>
            <p>
              {{ match.order.order_id }}・{{ match.order.guest_count }}名
              <template v-if="match.orderItem.processed_quantity">
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
