<template>
  <svg :class="svgClass" :style="iconStyle" aria-hidden="true">
    <use :fill="color" :xlink:href="iconName" />
  </svg>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps({
  iconClass: { type: String, required: true },
  className: { type: String, default: '' },
  color: { type: String, default: '' },
  size: { type: String, default: '' },
});

const iconName = computed(() => `#icon-${props.iconClass}`);
const svgClass = computed(() => (props.className ? `svg-icon ${props.className}` : 'svg-icon'));
const iconStyle = computed(() => ({
  color: props.color || undefined,
  fontSize: props.size || undefined,
}));
</script>

<style scoped>
.svg-icon {
  width: 1em;
  height: 1em;
  position: relative;
  fill: currentColor;
  vertical-align: -2px;
  flex-shrink: 0;
}
</style>
