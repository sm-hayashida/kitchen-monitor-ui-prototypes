<script setup>
defineProps({
  categories: {
    type: Array,
    required: true,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  collapsible: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['select-category', 'toggle']);
</script>

<template>
  <aside
    class="category-rail"
    :class="{ collapsed, collapsible }"
    aria-label="調理カテゴリ"
  >
    <button
      v-if="collapsible"
      class="category-rail-toggle"
      type="button"
      :aria-label="collapsed ? 'カテゴリを開く' : 'カテゴリを閉じる'"
      :title="collapsed ? 'カテゴリを開く' : 'カテゴリを閉じる'"
      @click="$emit('toggle')"
    >
      {{ collapsed ? '›' : '‹' }}
    </button>
    <button
      v-show="!collapsed"
      v-for="category in categories"
      :key="category.name"
      class="category-item"
      :class="{ active: category.active }"
      type="button"
      @click="$emit('select-category', category.id ?? category.name)"
    >
      <span>{{ category.name }}</span>
      <span class="category-count">
        <span v-if="category.alert" class="alert-dot"></span>
        {{ category.count }}
      </span>
    </button>
  </aside>
</template>
