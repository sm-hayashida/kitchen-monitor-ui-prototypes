import { computed, ref } from 'vue';

export const orderDepartmentDefinitions = [
  { id: 'kitchen', name: 'キッチン', categoryIds: ['salad'] },
  { id: 'fried', name: '揚げ場', categoryIds: ['fried'] },
  { id: 'grill', name: '焼き場', categoryIds: ['griddle'] },
  { id: 'teppan', name: '鉄板', categoryIds: [] },
  { id: 'noodle', name: '麺場', categoryIds: ['noodle'] },
  { id: 'drink', name: 'ドリンク', categoryIds: ['drink'] },
  { id: 'bar', name: 'バー', categoryIds: [] },
  { id: 'cafe-dessert', name: 'カフェ・デザート', categoryIds: ['dessert'] },
  { id: 'pastry', name: 'パティスリー', categoryIds: [] },
  { id: 'banquet', name: '宴会・コース', categoryIds: [] },
  { id: 'takeout', name: 'テイクアウト', categoryIds: [] },
  { id: 'delivery', name: 'デリバリー', categoryIds: [] },
];

const selectedDepartmentIds = ref([
  'kitchen',
  'fried',
  'grill',
  'teppan',
  'noodle',
  'drink',
  'bar',
  'cafe-dessert',
  'banquet',
]);

export function useOrderDepartmentSettings() {
  const selectedCategoryIds = computed(() => {
    const categories = new Set();

    orderDepartmentDefinitions.forEach((department) => {
      if (!selectedDepartmentIds.value.includes(department.id)) {
        return;
      }

      department.categoryIds.forEach((categoryId) => categories.add(categoryId));
    });

    return categories;
  });

  function saveDepartments(departmentIds) {
    selectedDepartmentIds.value = [...departmentIds];
  }

  return {
    departments: orderDepartmentDefinitions,
    saveDepartments,
    selectedCategoryIds,
    selectedDepartmentIds,
  };
}
