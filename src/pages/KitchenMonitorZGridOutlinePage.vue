<script setup>
import KitchenMonitorZGridPage from './KitchenMonitorZGridPage.vue';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

defineEmits(['switch-view']);
</script>

<template>
  <KitchenMonitorZGridPage
    :active-view="activeView"
    navigation-mode="outline"
    @switch-view="$emit('switch-view', $event)"
  />
</template>
