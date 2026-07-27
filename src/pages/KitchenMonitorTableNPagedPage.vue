<script setup>
import TableViewWorkspace from '../components/kitchen-monitor/TableViewWorkspace.vue';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

defineEmits(['switch-view']);
</script>

<template>
  <TableViewWorkspace
    :active-view="activeView"
    layout="n-paged"
    @switch-view="$emit('switch-view', $event)"
  />
</template>
