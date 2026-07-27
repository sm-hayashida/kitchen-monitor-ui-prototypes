<script setup>
import OrderCard from './OrderCard.vue';

defineProps({
  nowMs: {
    type: Number,
    required: true,
  },
  section: {
    type: Object,
    required: true,
  },
  selectedId: {
    type: String,
    default: '',
  },
});

defineEmits(['complete-section', 'order-primary-action', 'select-order', 'surface-click']);
</script>

<template>
  <section class="dish-section z-dish-section" :data-dish-section="section.id">
    <header class="dish-header">
      <div class="dish-title-row">
        <h2>{{ section.name }}</h2>
        <span v-if="section.overdueCount" class="overdue-badge">超過 {{ section.overdueCount }}件</span>
      </div>
      <div class="dish-actions">
        <button class="bulk-button" type="button" @click="$emit('complete-section', section)">
          ✓ まとめて完了
        </button>
        <span class="dish-count">{{ section.totalQuantity }}</span>
        <span class="dish-count-unit">個</span>
      </div>
    </header>

    <div class="z-card-grid" @click.self="$emit('surface-click')">
      <OrderCard
        v-for="order in section.orders"
        :key="order.id"
        :now-ms="nowMs"
        :order="order"
        :selected="selectedId === order.id"
        @primary-action="$emit('order-primary-action', order)"
        @select="$emit('select-order', order.id)"
      />
    </div>
  </section>
</template>
