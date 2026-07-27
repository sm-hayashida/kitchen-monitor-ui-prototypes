<script setup>
import ViewModeSettingsPanel from './ViewModeSettingsPanel.vue';

defineProps({
  activeView: {
    type: String,
    required: true,
  },
});

defineEmits(['close', 'switch-view']);
</script>

<template>
  <div class="department-settings-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="view-settings-modal" role="dialog" aria-modal="true" aria-labelledby="view-settings-title">
      <header>
        <div>
          <h2 id="view-settings-title">設定</h2>
          <p>この端末の表示方式を設定します</p>
        </div>
        <button type="button" aria-label="閉じる" title="閉じる" @click="$emit('close')">×</button>
      </header>

      <ViewModeSettingsPanel :active-view="activeView" @switch-view="$emit('switch-view', $event)" />

      <footer>
        <button type="button" @click="$emit('close')">閉じる</button>
      </footer>
    </section>
  </div>
</template>
