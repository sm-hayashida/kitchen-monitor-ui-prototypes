<script setup>
defineProps({
  item: {
    type: Object,
    required: true,
  },
});

function statusLabel(status) {
  return status === 'served' ? '配膳済み' : '調理済み';
}
</script>

<template>
  <div class="completed-item-content">
    <div class="completed-item-quantity">{{ item.quantity }}</div>
    <div>
      <div class="completed-item-heading">
        <strong>{{ item.kitchenPrintName || item.name }}</strong>
        <span :class="item.status">{{ statusLabel(item.status) }}</span>
      </div>
      <small v-if="item.courseName">{{ item.courseName }}</small>
      <div v-if="item.toppings.length" class="completed-item-chips">
        <span v-for="topping in item.toppings" :key="topping.id">{{ topping.name }}</span>
      </div>
      <p v-if="item.memo">商品メモ：{{ item.memo }}</p>
    </div>
  </div>
</template>
