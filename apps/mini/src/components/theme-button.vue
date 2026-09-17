<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useShopTheme } from '@/hooks/useShopTheme';

defineOptions({
  options: {
    styleIsolation: 'shared',
  },
});

const props = withDefaults(
  defineProps<{
    block?: boolean;
    round?: boolean;
    plain?: boolean;
    hairline?: boolean;
    loading?: boolean;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
    label?: string;
  }>(),
  {
    block: false,
    round: false,
    plain: false,
    hairline: false,
    loading: false,
    disabled: false,
    size: 'medium',
    label: '',
  },
);

const emit = defineEmits<{
  click: [];
}>();

const slots = useSlots();

const defaultSlotText = computed(() => {
  const nodes = slots.default?.() || [];
  return nodes
    .map((node) => {
      if (typeof node.children === 'string') return node.children;
      return '';
    })
    .join('')
    .trim();
});

const { palette, primaryButtonStyle, outlineButtonStyle } = useShopTheme();

const fillStyle = computed(() => {
  if (props.plain) {
    return {
      background: 'transparent',
      color: palette.value.buttonOutlineTextColor,
      border: `2rpx solid ${palette.value.buttonBorderColor}`,
    };
  }
  return {
    background: palette.value.buttonBgColor,
    color: palette.value.buttonTextColor,
    border: `2rpx solid ${palette.value.buttonBgColor}`,
  };
});

function onTap() {
  if (props.disabled || props.loading) return;
  emit('click');
}
</script>

<template>
  <view
    v-if="block"
    class="theme-btn theme-btn--block"
    :class="{
      'theme-btn--round': round,
      'theme-btn--plain': plain,
      'theme-btn--small': size === 'small',
      'theme-btn--large': size === 'large',
      'theme-btn--disabled': disabled || loading,
    }"
    :style="fillStyle"
    @click="onTap"
  >
    <text class="theme-btn__label" :style="{ color: fillStyle.color }">
      {{ loading ? '加载中...' : label || defaultSlotText }}
    </text>
  </view>

  <wd-button
    v-else
    type="primary"
    :custom-style="plain ? outlineButtonStyle : primaryButtonStyle"
    :round="round"
    :plain="plain"
    :hairline="hairline"
    :loading="loading"
    :disabled="disabled"
    :size="size"
    @click="onTap"
  >
    <slot>{{ label }}</slot>
  </wd-button>
</template>

<style scoped lang="scss">
.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-weight: 600;
  font-size: 28rpx;
}

.theme-btn--block {
  display: flex;
  width: 100%;
  height: 88rpx;
  font-size: 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 12rpx 28rpx rgba(44, 42, 38, 0.12);
}

.theme-btn--round {
  border-radius: 999rpx;
}

.theme-btn--plain {
  box-shadow: none;
}

.theme-btn--small {
  height: 64rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
}

.theme-btn--large {
  height: 96rpx;
  font-size: 32rpx;
}

.theme-btn--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.theme-btn__label {
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: 1.4;
}
</style>
