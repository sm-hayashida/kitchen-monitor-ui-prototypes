<script setup>
import { nextTick } from 'vue';
import CollapsibleSectionOutline from '../components/kitchen-monitor/CollapsibleSectionOutline.vue';
import DishZSection from '../components/kitchen-monitor/DishZSection.vue';
import KitchenMonitorShell from '../components/kitchen-monitor/KitchenMonitorShell.vue';
import NestedDishIndex from '../components/kitchen-monitor/NestedDishIndex.vue';
import { useDishSectionIndex } from '../features/kitchen-monitor/useDishSectionIndex';
import { useKitchenMonitorMock } from '../features/kitchen-monitor/useKitchenMonitorMock';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
  navigationMode: {
    type: String,
    default: 'nested',
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
} = useKitchenMonitorMock({ initialSelectedId: '' });

const { activeSectionId, jumpToSection, syncActiveSection } = useDishSectionIndex(sections);

async function scrollToSelected() {
  await nextTick();
  if (!selectedId.value) {
    return;
  }

  document.querySelector(`[data-order-card="${selectedId.value}"]`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  });
}
</script>

<template>
  <KitchenMonitorShell
    :active-view="activeView"
    :categories="categories"
    :now-ms="nowMs"
    :page-class="`z-layout z-${props.navigationMode}`"
    :selected-order="selectedOrder"
    :toast="toast"
    @close-detail="closeDetail"
    @return-to-order="scrollToSelected"
    @switch-view="$emit('switch-view', $event)"
  >
    <template v-if="props.navigationMode === 'nested'" #navigation>
      <NestedDishIndex
        :active-section-id="activeSectionId"
        :categories="categories"
        :sections="sections"
        @select-section="jumpToSection"
      />
    </template>

    <CollapsibleSectionOutline
      v-if="props.navigationMode === 'outline'"
      :active-section-id="activeSectionId"
      :sections="sections"
      @select-section="jumpToSection"
    >
      <div class="dish-scroll z-dish-scroll" @click.self="closeDetail" @scroll.passive="syncActiveSection">
        <DishZSection
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
    </CollapsibleSectionOutline>

    <div v-else class="dish-scroll z-dish-scroll" @click.self="closeDetail" @scroll.passive="syncActiveSection">
      <DishZSection
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
