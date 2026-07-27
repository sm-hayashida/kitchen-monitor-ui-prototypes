<script setup>
const props = defineProps({
  ariaLabel: {
    type: String,
    default: '進捗',
  },
  percent: {
    type: Number,
    required: true,
  },
  durationMs: {
    type: Number,
    default: 3000,
  },
});

const startRatio = Math.min(1, Math.max(0, props.percent / 100));
const remainingMs = Math.max(1, props.durationMs * startRatio);
const progressStyle = {
  '--grace-progress-duration': `${remainingMs}ms`,
  '--grace-progress-start': startRatio,
};
</script>

<template>
  <span class="grace-progress" role="progressbar" :aria-label="ariaLabel" :aria-valuenow="Math.round(percent)">
    <span class="grace-progress-fill" :style="progressStyle"></span>
  </span>
</template>
