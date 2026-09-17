<script setup lang="ts">
import { computed, ref } from 'vue';
import { api } from '@/api';
import { fenToYuan } from '@/utils/request';
import { useUserStore } from '@/stores/user';
import { useShopStore } from '@/stores/shop';
import { bookingStatusClass, bookingStatusTag } from '@/utils/booking-ui';
import { getNavBarMetrics } from '@/utils/nav-bar';
import { useStalePageLoad } from '@/utils/page-cache';
import { useMessage } from 'wot-design-uni';

import { useShopTheme } from '@/hooks/useShopTheme';

const user = useUserStore();
const shopStore = useShopStore();
const { pageStyleStr, primaryColor } = useShopTheme();
const message = useMessage();
const list = ref<any[]>([]);
const tab = ref<'all' | 'active' | 'history'>('all');
const nav = getNavBarMetrics();
const headerStyle = { paddingTop: `${nav.navBarTotal + 8}px` };

const { loading, reload } = useStalePageLoad(
  async () => {
    await shopStore.ensureShop();
    const ok = await user.ensureLogin();
    if (!ok) return [];
    return (await api.myBookings()) as any[];
  },
  (data) => {
    list.value = data;
  },
);

const upcomingCount = computed(() => list.value.filter((i) => i.status === 1 || i.status === 2).length);

const filteredList = computed(() => {
  if (tab.value === 'active') return list.value.filter((i) => i.status === 1 || i.status === 2);
  if (tab.value === 'history') return list.value.filter((i) => i.status >= 3);
  return list.value;
});

function cancel(id: number) {
  message
    .confirm({ title: '取消预约', msg: shopStore.miniDisplay.cancelBookingTip })
    .then(async () => {
      await api.cancelBooking(id);
      uni.showToast({ title: '已取消', icon: 'success' });
      await reload();
    })
    .catch(() => {});
}

function reschedule(item: any) {
  uni.navigateTo({
    url: `/pages/booking/slots?serviceId=${item.serviceId}&bookingId=${item.id}&reschedule=1`,
  });
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' });
}

async function handleLogin() {
  const ok = await user.login();
  if (ok) await reload();
}

function formatDate(item: any) {
  return String(item.bookDate).slice(0, 10);
}
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view class="page">
    <view class="header" :style="headerStyle">
      <view class="header__main">
        <text class="header__title">我的预约</text>
        <text class="header__sub">共 {{ list.length }} 条记录</text>
      </view>
      <view v-if="upcomingCount" class="header__badge">
        <text class="header__badge-num">{{ upcomingCount }}</text>
        <text class="header__badge-label">待服务</text>
      </view>
    </view>

    <view v-if="!loading && list.length" class="tabs">
      <view class="tab" :class="{ 'tab--on': tab === 'all' }" @click="tab = 'all'">全部</view>
      <view class="tab" :class="{ 'tab--on': tab === 'active' }" @click="tab = 'active'">待服务</view>
      <view class="tab" :class="{ 'tab--on': tab === 'history' }" @click="tab = 'history'">历史</view>
    </view>

    <wd-skeleton v-if="loading" :row-col="[[{ width: '100%', height: '240rpx' }], 1]" animation="gradient" />

    <empty-tip v-else-if="!user.isLoggedIn" icon="👤" tip="登录后查看预约记录">
      <template #bottom>
        <theme-button round @click="handleLogin">立即登录</theme-button>
      </template>
    </empty-tip>

    <empty-tip v-else-if="!list.length" icon="📅" tip="还没有预约记录">
      <template #bottom>
        <theme-button round @click="goHome">去预约</theme-button>
      </template>
    </empty-tip>

    <empty-tip v-else-if="!filteredList.length" icon="🔍" tip="该分类下暂无记录" />

    <view v-else class="list">
      <view
        v-for="item in filteredList"
        :key="item.id"
        class="booking-item"
        :class="bookingStatusClass(item.status)"
      >
        <view class="booking-item__accent" />
        <view class="booking-item__body">
          <view class="booking-item__head">
            <view class="booking-item__title-wrap">
              <text class="booking-item__service">{{ item.serviceName || item.service?.name }}</text>
              <view class="booking-item__datetime">
                <wd-icon name="calendar" size="26rpx" :color="primaryColor" />
                <text>{{ formatDate(item) }} {{ item.timeSlot }}</text>
              </view>
            </view>
            <wd-tag :type="bookingStatusTag(item.status).type" round>
              {{ bookingStatusTag(item.status).text }}
            </wd-tag>
          </view>

          <view class="booking-item__meta">
            <view class="meta-chip">
              <wd-icon name="user" size="24rpx" color="#9a958c" />
              <text>{{ item.staffName || item.staff?.name || '待分配' }}</text>
            </view>
            <view v-if="item.depositAmount" class="meta-chip meta-chip--price">
              <text>订金 ¥{{ fenToYuan(item.depositAmount) }}</text>
            </view>
          </view>

          <view v-if="item.status === 1" class="booking-item__actions">
            <theme-button size="small" round plain hairline @click="reschedule(item)">改约</theme-button>
            <wd-button size="small" round plain type="error" @click="cancel(item.id)">取消</wd-button>
          </view>
        </view>
      </view>
    </view>
  </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--mb-page-bg);
  padding-bottom: 32rpx;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 28rpx;
  background: linear-gradient(160deg, var(--mb-hero-dark) 0%, var(--mb-hero-mid) 55%, var(--mb-primary) 100%);
  color: #fff;
}

.header__title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}

.header__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.8;
}

.header__badge {
  text-align: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  backdrop-filter: blur(8px);
}

.header__badge-num {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1;
}

.header__badge-label {
  display: block;
  font-size: 22rpx;
  margin-top: 6rpx;
  opacity: 0.85;
}

.tabs {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx 8rpx;
}

.tab {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #9a958c;
  background: #fff;
  box-shadow: 0 4rpx 12rpx rgba(44, 42, 38, 0.04);
}

.tab--on {
  color: #fff;
  background: linear-gradient(135deg, var(--mb-primary-light), var(--mb-primary));
  font-weight: 600;
}

.list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.booking-item {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 28rpx rgba(44, 42, 38, 0.06);
}

.booking-item__accent {
  width: 8rpx;
  flex-shrink: 0;
  background: var(--mb-primary);
}

.status--pending .booking-item__accent { background: #f59e0b; }
.status--booked .booking-item__accent { background: var(--mb-primary); }
.status--arrived .booking-item__accent { background: #10b981; }
.status--done .booking-item__accent { background: #d1d5db; }
.status--cancel .booking-item__accent { background: #ef4444; }

.booking-item__body {
  flex: 1;
  padding: 28rpx;
  min-width: 0;
}

.booking-item__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}

.booking-item__title-wrap {
  flex: 1;
  min-width: 0;
}

.booking-item__service {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2a26;
}

.booking-item__datetime {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #6b665e;
}

.booking-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}

.meta-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  background: #f8f6f3;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #6b665e;
}

.meta-chip--price {
  color: #c45c4a;
  background: #fef2f0;
  font-weight: 600;
}

.booking-item__actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0ebe3;
}
</style>
