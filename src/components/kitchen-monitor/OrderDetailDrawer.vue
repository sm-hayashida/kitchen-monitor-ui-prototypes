<script setup>
import { computed, ref } from 'vue';
import GraceProgressBar from './GraceProgressBar.vue';
import {
  detailMemoLines,
  formatUndoRemaining,
  isOverdue,
  isUndoable,
  undoProgressPercent,
} from '../../features/kitchen-monitor/orderPresentation';

defineProps({
  nowMs: {
    type: Number,
    required: true,
  },
  order: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close', 'return-to-order']);

const dragStartX = ref(null);
const dragX = ref(0);
const isDragging = ref(false);

const drawerStyle = computed(() => ({
  transform: dragX.value > 0 ? `translateX(${dragX.value}px)` : undefined,
}));

function startSwipe(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  dragStartX.value = event.clientX;
  dragX.value = 0;
  isDragging.value = true;
}

function moveSwipe(event) {
  if (dragStartX.value === null) {
    return;
  }

  const nextDragX = event.clientX - dragStartX.value;
  dragX.value = Math.min(Math.max(nextDragX, 0), 334);
}

function endSwipe() {
  if (dragStartX.value === null) {
    return;
  }

  const shouldClose = dragX.value > 72;
  resetSwipe();

  if (shouldClose) {
    emit('close');
  }
}

function resetSwipe() {
  dragStartX.value = null;
  dragX.value = 0;
  isDragging.value = false;
}
</script>

<template>
  <aside
    class="detail-drawer"
    :class="{ dragging: isDragging }"
    :style="drawerStyle"
    @pointercancel="resetSwipe"
    @pointerdown="startSwipe"
    @pointerleave="endSwipe"
    @pointermove="moveSwipe"
    @pointerup="endSwipe"
  >
    <header class="drawer-head">
      <div>
        <p>選択中の明細</p>
        <h2>{{ order.dish.name }}</h2>
      </div>
      <div class="drawer-meta">
        <span>{{ order.tableNo }}</span>
        <strong :class="{ danger: isOverdue(order) }">{{ order.elapsed }}分</strong>
        <span>×{{ order.quantity }}</span>
        <em v-if="isOverdue(order)">超過</em>
      </div>
    </header>

    <div class="drawer-tools">
      <button class="drawer-icon-button" type="button" @click="$emit('close')">×</button>
      <button class="drawer-return-button" type="button" @click="$emit('return-to-order')">対象に戻る</button>
    </div>

    <div class="drawer-scroll">
      <div v-if="isUndoable(order)" class="drawer-progress">
        <div class="drawer-progress-text">
          <span>取消猶予</span>
          <strong>{{ formatUndoRemaining(order, nowMs) }}</strong>
        </div>
        <GraceProgressBar
          :duration-ms="order.undoWindowMs"
          :percent="undoProgressPercent(order, nowMs)"
          aria-label="取消猶予の残り時間"
        />
      </div>

      <div class="drawer-block">
        <div class="drawer-chip-wrap">
          <span v-for="option in order.options" :key="option" class="option-chip large">{{ option }}</span>
          <span v-if="!order.options.length" class="empty-line">指定なし</span>
        </div>
      </div>

      <div class="drawer-block">
        <div class="drawer-memo">
          <span v-for="line in detailMemoLines(order)" :key="line">{{ line }}</span>
          <span v-if="!order.memo" class="empty-line">メモなし</span>
        </div>
      </div>

      <div class="drawer-block compact">
        <dl class="detail-list">
          <div>
            <dt>提供順</dt>
            <dd>注文順</dd>
          </div>
          <div>
            <dt>ステーション</dt>
            <dd>{{ order.dish.station }}</dd>
          </div>
          <div>
            <dt>状態</dt>
            <dd>{{ isUndoable(order) ? '取消猶予中' : '調理中' }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </aside>
</template>
