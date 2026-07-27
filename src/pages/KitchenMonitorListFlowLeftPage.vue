<script setup>
import KitchenMonitorListFlowPage from './KitchenMonitorListFlowPage.vue';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

defineEmits(['switch-view']);
</script>

<template>
  <KitchenMonitorListFlowPage
    :active-view="activeView"
    index-placement="left"
    @switch-view="$emit('switch-view', $event)"
  />
</template>
