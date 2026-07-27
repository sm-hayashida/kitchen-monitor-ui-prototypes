<script setup>
const props = defineProps({
  durationMs: {
    type: Number,
    required: true,
  },
  startedAt: {
    type: Number,
    required: true,
  },
});

const durationMs = Math.max(1, props.durationMs);
const remainingMs = Math.max(0, durationMs - (Date.now() - props.startedAt));
const startRatio = remainingMs / durationMs;
const progressStyle = {
  '--countdown-duration': `${Math.max(1, remainingMs)}ms`,
  '--countdown-start': startRatio,
};
</script>

<template>
  <i
    class="countdown-progress-line"
    aria-hidden="true"
    :style="progressStyle"
  ></i>
</template>
