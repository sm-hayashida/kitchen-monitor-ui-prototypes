<script setup>
defineProps({
  activeSectionId: {
    type: String,
    default: '',
  },
  categories: {
    type: Array,
    required: true,
  },
  sections: {
    type: Array,
    required: true,
  },
});

defineEmits(['select-section']);
</script>

<template>
  <nav class="nested-dish-index" aria-label="カテゴリと料理セクション一覧">
    <template v-for="category in categories" :key="category.name">
      <button class="nested-category-item" :class="{ active: category.active }" type="button">
        <span>{{ category.name }}</span>
        <span class="category-count">
          <i v-if="category.alert" class="alert-dot"></i>
          {{ category.count }}
        </span>
      </button>

      <div v-if="category.active" class="nested-dish-list">
        <button
          v-for="section in sections"
          :key="section.id"
          :class="{ active: activeSectionId === section.id }"
          type="button"
          @click="$emit('select-section', section.id)"
        >
          <span>{{ section.name }}</span>
          <b>{{ section.orders.length }}</b>
        </button>
      </div>
    </template>
  </nav>
</template>
