<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fenToYuan } from '@/utils/request';
import { useShopTheme } from '@/hooks/useShopTheme';

defineOptions({
  options: {
    styleIsolation: 'shared',
  },
});

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    services: Array<{ id: number; name: string; price?: number; duration?: number }>;
    label?: string;
    searchable?: boolean;
  }>(),
  {
    label: '核销项目',
    searchable: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
}>();

const { palette } = useShopTheme();
const keyword = ref('');

const filteredServices = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return props.services;
  return props.services.filter((item) => item.name.toLowerCase().includes(text));
});

watch(
  () => props.services,
  (list) => {
    if (!list.length) {
      emit('update:modelValue', null);
      return;
    }
    if (!list.some((item) => item.id === props.modelValue)) {
      emit('update:modelValue', list[0].id);
    }
  },
  { immediate: true },
);

function selectService(id: number) {
  emit('update:modelValue', id);
}

function chipStyle(id: number) {
  const on = props.modelValue === id;
  return {
    background: on ? palette.value.pageBackground : '#f7f5f2',
    borderColor: on ? palette.value.primaryColor : '#ebe6df',
  };
}

function nameStyle(id: number) {
  const on = props.modelValue === id;
  return {
    color: on ? palette.value.primaryColor : '#2c2a26',
  };
}
</script>

<template>
  <view class="service-picker">
    <view class="service-picker__head">
      <text class="service-picker__label" :style="{ color: palette.titleColor }">{{ label }}</text>
      <text v-if="services.length" class="service-picker__count" :style="{ color: palette.secondaryColor }">
        共 {{ services.length }} 项
      </text>
    </view>

    <view v-if="searchable && services.length > 6" class="service-picker__search">
      <text class="service-picker__search-icon">🔍</text>
      <input
        v-model="keyword"
        class="service-picker__search-input"
        type="text"
        placeholder="搜索项目名称"
        confirm-type="search"
        :style="{ color: palette.titleColor }"
      />
    </view>

    <view v-if="!services.length" class="service-picker__empty">
      <text :style="{ color: palette.secondaryColor }">暂无可用服务项目</text>
    </view>

    <view v-else-if="!filteredServices.length" class="service-picker__empty">
      <text :style="{ color: palette.secondaryColor }">未找到「{{ keyword }}」</text>
    </view>

    <view v-else class="service-picker__grid">
      <view
        v-for="item in filteredServices"
        :key="item.id"
        class="service-chip"
        :class="{ 'service-chip--on': modelValue === item.id }"
        :style="chipStyle(item.id)"
        @click="selectService(item.id)"
      >
        <text class="service-chip__name" :style="nameStyle(item.id)">{{ item.name }}</text>
        <text v-if="item.price" class="service-chip__meta" :style="{ color: palette.secondaryColor }">
          ¥{{ fenToYuan(item.price) }}
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.service-picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.service-picker__label {
  font-size: 28rpx;
  font-weight: 600;
}

.service-picker__count {
  font-size: 22rpx;
}

.service-picker__search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding: 8rpx 20rpx;
  background: #f7f5f2;
  border-radius: 14rpx;
}

.service-picker__search-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.service-picker__search-input {
  flex: 1;
  height: 64rpx;
  font-size: 26rpx;
}

.service-picker__empty {
  padding: 32rpx 0;
  text-align: center;
  font-size: 26rpx;
}

.service-picker__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.service-chip {
  width: calc(50% - 8rpx);
  box-sizing: border-box;
  padding: 22rpx 18rpx;
  border-radius: 16rpx;
  border-width: 2rpx;
  border-style: solid;
}

.service-chip__name {
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.4;
}

.service-chip__meta {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.4;
}
</style>
