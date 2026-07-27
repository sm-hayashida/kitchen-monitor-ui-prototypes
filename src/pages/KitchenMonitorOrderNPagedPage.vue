<script setup>
import OrderViewWorkspace from '../components/kitchen-monitor/OrderViewWorkspace.vue';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

defineEmits(['switch-view']);
</script>

<template>
  <OrderViewWorkspace
    :active-view="activeView"
    layout="n-paged"
    @switch-view="$emit('switch-view', $event)"
  />
</template>
