<script setup>
import { computed, ref } from 'vue';
import { columnCountPreferenceOptions } from '../../features/kitchen-monitor/useColumnLayoutPreference';
import ViewModeSettingsPanel from './ViewModeSettingsPanel.vue';

const props = defineProps({
  activeView: {
    type: String,
    required: true,
  },
  columnCountPreference: {
    type: String,
    default: 'auto',
  },
  departments: {
    type: Array,
    required: true,
  },
  selectedDepartmentIds: {
    type: Array,
    required: true,
  },
  showTableGroupingOption: {
    type: Boolean,
    default: false,
  },
  tableGroupingEnabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'save', 'switch-view']);
const query = ref('');
const draftIds = ref([...props.selectedDepartmentIds]);
const draftColumnCountPreference = ref(props.columnCountPreference);
const draftTableGroupingEnabled = ref(props.tableGroupingEnabled);

const filteredDepartments = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();

  if (!normalizedQuery) {
    return props.departments;
  }

  return props.departments.filter((department) =>
    department.name.toLowerCase().includes(normalizedQuery),
  );
});

function selectAll() {
  draftIds.value = props.departments.map((department) => department.id);
}

function clearAll() {
  draftIds.value = [];
}

function save() {
  emit('save', draftIds.value, {
    columnCountPreference: draftColumnCountPreference.value,
    tableGroupingEnabled: draftTableGroupingEnabled.value,
  });
}
</script>

<template>
  <div class="department-settings-backdrop" role="presentation" @click.self="$emit('close')">
    <section
      class="department-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="department-settings-title"
    >
      <header>
        <div>
          <h2 id="department-settings-title">設定</h2>
          <p>表示方式と、この端末に出す部門を設定します</p>
        </div>
        <button type="button" aria-label="閉じる" title="閉じる" @click="$emit('close')">×</button>
      </header>

      <div class="department-display-settings">
        <ViewModeSettingsPanel
          :active-view="activeView"
          @switch-view="$emit('switch-view', $event)"
        />

        <section class="column-count-setting">
          <div>
            <strong>カード列数</strong>
            <span>自動は画面幅に合わせて1〜3列で調整します</span>
          </div>
          <div class="column-count-choice" role="group" aria-label="カード列数">
            <button
              v-for="option in columnCountPreferenceOptions"
              :key="option.value"
              type="button"
              :class="{ active: draftColumnCountPreference === option.value }"
              :aria-pressed="draftColumnCountPreference === option.value"
              @click="draftColumnCountPreference = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </section>

        <section v-if="showTableGroupingOption" class="table-grouping-setting">
          <div>
            <strong>テーブルカテゴリ</strong>
            <span>横スクロールをWaiterのカテゴリ単位で区切ります</span>
          </div>
          <label>
            <input v-model="draftTableGroupingEnabled" type="checkbox" />
            <span>{{ draftTableGroupingEnabled ? 'グループ表示' : 'まとめて表示' }}</span>
          </label>
        </section>
      </div>

      <div class="department-settings-tools">
        <label>
          <span aria-hidden="true">⌕</span>
          <input v-model="query" type="search" placeholder="部門名で検索" />
        </label>
        <div>
          <button type="button" @click="selectAll">全選択</button>
          <button type="button" @click="clearAll">全解除</button>
          <strong>{{ draftIds.length }}部門選択中</strong>
        </div>
      </div>

      <div class="department-settings-list">
        <label
          v-for="department in filteredDepartments"
          :key="department.id"
          :class="{ selected: draftIds.includes(department.id) }"
        >
          <input v-model="draftIds" type="checkbox" :value="department.id" />
          <span>{{ department.name }}</span>
        </label>
      </div>

      <footer>
        <button type="button" @click="$emit('close')">キャンセル</button>
        <button class="primary" type="button" @click="save">この内容で保存</button>
      </footer>
    </section>
  </div>
</template>
