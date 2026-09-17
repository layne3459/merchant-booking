<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '@/api';
import { useShopStore } from '@/stores/shop';
import { useShopTheme } from '@/hooks/useShopTheme';

const shopStore = useShopStore();
useShopTheme();
const list = ref<any[]>([]);
const loading = ref(true);

onShow(async () => {
  loading.value = true;
  try {
    await shopStore.ensureShop();
    const res = await api.verifyRecords({ today: true, pageSize: 50 });
    list.value = res.list || [];
  } finally {
    loading.value = false;
  }
});

function goScan() {
  uni.navigateTo({ url: '/pages/staff/scan' });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
</script>

<template>
  <shop-theme-root>
    <view class="staff-page staff-page--dock">
      <staff-header title="核销记录" subtitle="今日流水" :badge-num="list.length" badge-label="今日" />

      <view class="staff-body">
        <view v-if="loading" class="staff-loading">
          <text class="staff-loading__text">加载中...</text>
        </view>

        <empty-tip v-else-if="!list.length" icon="📋" tip="今日暂无核销记录">
          <template #bottom>
            <theme-button round label="去扫码核销" @click="goScan" />
          </template>
        </empty-tip>

        <view v-else class="record-list">
          <view v-for="item in list" :key="item.id" class="record-item staff-card">
            <view class="record-item__head">
              <text class="record-item__name">{{ item.memberName || '会员' }}</text>
              <text class="record-item__time">{{ formatTime(item.createdAt) }}</text>
            </view>
            <text class="record-item__line">{{ item.cardName }} · {{ item.cardNo }}</text>
            <text v-if="item.serviceName" class="record-item__line">项目：{{ item.serviceName }}</text>
            <text v-if="item.reversed" class="record-item__tag">已反核销</text>
          </view>
        </view>
      </view>
    </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
@import '@/styles/staff.scss';

.staff-loading {
  padding: 80rpx 0;
  text-align: center;
}

.staff-loading__text {
  font-size: 28rpx;
  color: var(--mb-secondary);
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 10rpx;
}

.record-item__name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.record-item__time {
  font-size: 24rpx;
  color: var(--mb-secondary);
}

.record-item__line {
  display: block;
  font-size: 24rpx;
  color: var(--mb-content);
  line-height: 1.6;
}

.record-item__tag {
  display: inline-block;
  margin-top: 12rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 22rpx;
}
</style>
