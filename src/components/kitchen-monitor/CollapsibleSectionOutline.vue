<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  activeSectionId: {
    type: String,
    default: '',
  },
  sections: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['select-section']);
const isOpen = ref(false);

const activeSectionName = computed(
  () => props.sections.find((section) => section.id === props.activeSectionId)?.name ?? '先頭',
);

function selectSection(sectionId) {
  emit('select-section', sectionId);
  isOpen.value = false;
}
</script>

<template>
  <div class="collapsible-outline-layout">
    <div class="outline-toolbar">
      <button
        class="outline-open-button"
        type="button"
        :aria-expanded="isOpen"
        @click="isOpen = !isOpen"
      >
        <span aria-hidden="true">☰</span>
        <b>料理へ移動</b>
      </button>
      <span class="outline-current">{{ activeSectionName }}</span>
    </div>

    <slot />

    <button
      v-if="isOpen"
      class="outline-scrim"
      type="button"
      aria-label="料理アウトラインを閉じる"
      @click="isOpen = false"
    ></button>

    <aside v-if="isOpen" class="outline-panel" aria-label="料理アウトライン">
      <header>
        <div>
          <span>料理アウトライン</span>
          <b>{{ sections.length }}品</b>
        </div>
        <button type="button" aria-label="閉じる" @click="isOpen = false">×</button>
      </header>

      <div class="outline-section-list">
        <button
          v-for="section in sections"
          :key="section.id"
          :aria-current="activeSectionId === section.id ? 'location' : undefined"
          :class="{
            active: activeSectionId === section.id,
            overdue: section.overdueCount > 0,
          }"
          type="button"
          @click="selectSection(section.id)"
        >
          <span class="outline-status-dot"></span>
          <span class="outline-section-name">{{ section.name }}</span>
          <span v-if="section.overdueCount" class="outline-overdue">超過{{ section.overdueCount }}</span>
          <b>{{ section.orders.length }}件</b>
        </button>
      </div>
    </aside>
  </div>
</template>
