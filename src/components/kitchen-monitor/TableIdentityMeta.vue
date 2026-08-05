<script setup>
import { computed, nextTick, ref } from 'vue';
import { createTableNumberStyle } from '../../features/kitchen-monitor/tableNumberPresentation';

const props = defineProps({
  baseFontSize: {
    type: Number,
    default: 17,
  },
  entityId: {
    type: [String, Number],
    required: true,
  },
  nameLimit: {
    type: Number,
    default: 3,
  },
  tableNames: {
    type: Array,
    default: () => [],
  },
  tableNo: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'table',
    validator: (value) => ['order', 'table'].includes(value),
  },
});

const isJoinedTableListOpen = ref(false);
const toggleButtonRef = ref(null);
const primaryMetaClass = computed(() => `${props.variant}-view-primary-meta`);
const joinedTableNames = computed(() => [
  ...new Set([
    props.tableNo,
    ...props.tableNames,
  ].filter(Boolean)),
]);
const isJoinedTable = computed(() => joinedTableNames.value.length > 1);
const visibleNameLimit = computed(() => Math.max(1, Math.floor(props.nameLimit)));
const visibleJoinedTableNames = computed(() =>
  joinedTableNames.value.slice(0, visibleNameLimit.value),
);
const hiddenJoinedTableCount = computed(() =>
  Math.max(0, joinedTableNames.value.length - visibleJoinedTableNames.value.length),
);
const joinedTableListId = computed(() =>
  `joined-table-list-${props.variant}-${String(props.entityId).replace(/[^a-zA-Z0-9_-]/g, '-')}`,
);
const joinedTableLabel = computed(() =>
  `結合テーブル${joinedTableNames.value.length}卓: ${joinedTableNames.value.join('、')}`,
);

function toggleJoinedTableList() {
  isJoinedTableListOpen.value = !isJoinedTableListOpen.value;
}

async function closeJoinedTableList() {
  isJoinedTableListOpen.value = false;
  await nextTick();
  toggleButtonRef.value?.focus();
}
</script>

<template>
  <div :class="primaryMetaClass" @keydown.esc.stop="closeJoinedTableList">
    <span
      v-if="isJoinedTable"
      class="table-joined-summary"
      :aria-label="joinedTableLabel"
      role="group"
    >
      <small class="table-joined-label">結合</small>
      <strong class="table-joined-names">
        {{ visibleJoinedTableNames.join('・') }}
      </strong>
      <button
        v-if="hiddenJoinedTableCount > 0"
        ref="toggleButtonRef"
        class="table-joined-overflow"
        type="button"
        :aria-controls="joinedTableListId"
        :aria-expanded="isJoinedTableListOpen"
        :aria-label="`${joinedTableLabel}。全卓名を${isJoinedTableListOpen ? '閉じる' : '表示'}`"
        @click.stop="toggleJoinedTableList"
      >
        +{{ hiddenJoinedTableCount }}
      </button>
    </span>
    <strong
      v-else
      class="table-number-label"
      :style="createTableNumberStyle(tableNo, baseFontSize)"
    >{{ tableNo }}</strong>
    <slot />
  </div>

  <section
    v-if="isJoinedTableListOpen"
    :id="joinedTableListId"
    class="table-joined-popover"
    :aria-label="joinedTableLabel"
    role="region"
    @click.stop
    @keydown.esc.stop="closeJoinedTableList"
  >
    <header>
      <strong>結合テーブル {{ joinedTableNames.length }}卓</strong>
      <button
        class="table-joined-popover-close"
        type="button"
        aria-label="結合テーブル一覧を閉じる"
        @click.stop="closeJoinedTableList"
      >
        ×
      </button>
    </header>
    <p>{{ joinedTableNames.join('・') }}</p>
  </section>
</template>
