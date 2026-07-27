<script setup>
import { nextTick } from 'vue';
import DishSection from '../components/kitchen-monitor/DishSection.vue';
import KitchenMonitorShell from '../components/kitchen-monitor/KitchenMonitorShell.vue';
import { useKitchenMonitorMock } from '../features/kitchen-monitor/useKitchenMonitorMock';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

defineEmits(['switch-view']);

const {
  categories,
  closeDetail,
  completeSection,
  handleOrderPrimaryAction,
  nowMs,
  sections,
  selectedId,
  selectedOrder,
  toast,
  toggleDetail,
} = useKitchenMonitorMock();

async function scrollToSelected() {
  await nextTick();
  if (!selectedId.value) {
    return;
  }

  const target = document.querySelector(`[data-order-card="${selectedId.value}"]`);
  target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
}
</script>

<template>
  <KitchenMonitorShell
    :active-view="activeView"
    :categories="categories"
    :now-ms="nowMs"
    page-class="card-layout"
    :selected-order="selectedOrder"
    :toast="toast"
    @close-detail="closeDetail"
    @return-to-order="scrollToSelected"
    @switch-view="$emit('switch-view', $event)"
  >
    <div class="dish-scroll" @click.self="closeDetail">
      <DishSection
        v-for="section in sections"
        :key="section.id"
        :now-ms="nowMs"
        :section="section"
        :selected-id="selectedId"
        @complete-section="completeSection"
        @order-primary-action="handleOrderPrimaryAction"
        @select-order="toggleDetail"
        @surface-click="closeDetail"
      />
    </div>
  </KitchenMonitorShell>
</template>
