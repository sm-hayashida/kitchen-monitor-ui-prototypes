<script setup>
import { nextTick } from 'vue';
import CollapsibleSectionOutline from '../components/kitchen-monitor/CollapsibleSectionOutline.vue';
import DishListSection from '../components/kitchen-monitor/DishListSection.vue';
import KitchenMonitorShell from '../components/kitchen-monitor/KitchenMonitorShell.vue';
import NestedDishIndex from '../components/kitchen-monitor/NestedDishIndex.vue';
import SectionScrollRail from '../components/kitchen-monitor/SectionScrollRail.vue';
import { useDishSectionIndex } from '../features/kitchen-monitor/useDishSectionIndex';
import { useKitchenMonitorMock } from '../features/kitchen-monitor/useKitchenMonitorMock';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
  indexPlacement: {
    type: String,
    default: 'right',
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

  document.querySelector(`[data-order-row="${selectedId.value}"]`)?.scrollIntoView({
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
    detail-layout="split"
    :now-ms="nowMs"
    :page-class="`list-layout list-flow-layout list-flow-${props.indexPlacement}`"
    :selected-order="selectedOrder"
    :toast="toast"
    @close-detail="closeDetail"
    @return-to-order="scrollToSelected"
    @switch-view="$emit('switch-view', $event)"
  >
    <template v-if="props.indexPlacement === 'nested'" #navigation>
      <NestedDishIndex
        :active-section-id="activeSectionId"
        :categories="categories"
        :sections="sections"
        @select-section="jumpToSection"
      />
    </template>

    <CollapsibleSectionOutline
      v-if="props.indexPlacement === 'outline'"
      :active-section-id="activeSectionId"
      :sections="sections"
      @select-section="jumpToSection"
    >
      <div class="dish-scroll list-dish-scroll" @click.self="closeDetail" @scroll.passive="syncActiveSection">
        <DishListSection
          v-for="section in sections"
          :key="section.id"
          :now-ms="nowMs"
          :section="section"
          :selected-id="selectedId"
          unbounded
          @complete-section="completeSection"
          @order-primary-action="handleOrderPrimaryAction"
          @select-order="toggleDetail"
        />
      </div>
    </CollapsibleSectionOutline>

    <div v-else class="list-flow-content" :class="`index-${props.indexPlacement}`">
      <SectionScrollRail
        v-if="props.indexPlacement === 'left'"
        :active-section-id="activeSectionId"
        :sections="sections"
        @select-section="jumpToSection"
      />

      <div class="dish-scroll list-dish-scroll" @click.self="closeDetail" @scroll.passive="syncActiveSection">
        <DishListSection
          v-for="section in sections"
          :key="section.id"
          :now-ms="nowMs"
          :section="section"
          :selected-id="selectedId"
          unbounded
          @complete-section="completeSection"
          @order-primary-action="handleOrderPrimaryAction"
          @select-order="toggleDetail"
        />
      </div>

      <SectionScrollRail
        v-if="props.indexPlacement === 'right'"
        :active-section-id="activeSectionId"
        :sections="sections"
        @select-section="jumpToSection"
      />
    </div>
  </KitchenMonitorShell>
</template>
