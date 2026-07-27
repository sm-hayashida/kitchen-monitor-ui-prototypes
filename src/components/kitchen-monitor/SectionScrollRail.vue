<script setup>
defineProps({
  activeSectionId: {
    type: String,
    default: '',
  },
  sections: {
    type: Array,
    required: true,
  },
});

defineEmits(['select-section']);
</script>

<template>
  <nav class="section-scroll-rail" aria-label="料理セクションへ移動">
    <p>見出し</p>
    <div class="section-rail-track">
      <button
        v-for="section in sections"
        :key="section.id"
        :aria-current="activeSectionId === section.id ? 'location' : undefined"
        :aria-label="`${section.name}へ移動`"
        :class="{
          active: activeSectionId === section.id,
          overdue: section.overdueCount > 0,
        }"
        type="button"
        @click="$emit('select-section', section.id)"
      >
        <span class="section-rail-dot"></span>
        <span class="section-rail-label">{{ section.name }}</span>
        <b>{{ section.orders.length }}</b>
      </button>
    </div>
  </nav>
</template>
