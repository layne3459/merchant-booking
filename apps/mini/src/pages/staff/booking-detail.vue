<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api } from '@/api';
import { useShopStore } from '@/stores/shop';
import { useShopTheme } from '@/hooks/useShopTheme';
import { bookingStatusTag, serviceInitial } from '@/utils/booking-ui';

const shopStore = useShopStore();
useShopTheme();
const booking = ref<any>({});
const acting = ref(false);
let bookingId = 0;

const memberName = computed(() => booking.value.member?.nickname || '顾客');
const statusInfo = computed(() => bookingStatusTag(booking.value.status ?? -1));

onShow(() => {
  void shopStore.ensureShop();
});

onLoad(async (query) => {
  bookingId = Number(query?.id || 0);
  booking.value = await api.getBooking(bookingId);
});

async function reload() {
  booking.value = await api.getBooking(bookingId);
}

async function arrive() {
  acting.value = true;
  try {
    await api.arriveBooking(bookingId);
    uni.showToast({ title: '已确认到店', icon: 'success' });
    await reload();
  } finally {
    acting.value = false;
  }
}

async function complete() {
  acting.value = true;
  try {
    await api.completeBooking(bookingId);
    uni.showToast({ title: '服务已完成', icon: 'success' });
    await reload();
  } finally {
    acting.value = false;
  }
}

async function noShow() {
  uni.showModal({
    title: '标记爽约',
    content: '确认顾客未到店？',
    success: async (res) => {
      if (!res.confirm) return;
      acting.value = true;
      try {
        await api.noShowBooking(bookingId);
        uni.showToast({ title: '已标记爽约', icon: 'success' });
        await reload();
      } finally {
        acting.value = false;
      }
    },
  });
}

function callMember() {
  const phone = booking.value.member?.phone;
  if (!phone) {
    uni.showToast({ title: '暂无手机号', icon: 'none' });
    return;
  }
  uni.makePhoneCall({ phoneNumber: phone });
}
</script>

<template>
  <shop-theme-root>
    <view class="staff-page">
      <view class="status-banner" :class="`status-banner--${statusInfo.type}`">
        <text class="status-banner__text">{{ statusInfo.text }}</text>
        <text class="status-banner__sub">
          {{ String(booking.bookDate || '').slice(0, 10) }} {{ booking.timeSlot }}
        </text>
      </view>

      <view class="staff-body detail-body">
        <view class="staff-card member-block">
          <view class="staff-avatar">{{ serviceInitial(memberName) }}</view>
          <view class="member-block__info">
            <text class="member-block__name">{{ memberName }}</text>
            <text class="member-block__phone">{{ booking.member?.phone || '未留手机号' }}</text>
          </view>
          <view v-if="booking.member?.phone" class="call-btn" @click="callMember">
            <text class="call-btn__icon">📞</text>
          </view>
        </view>

        <view class="staff-card">
          <view class="info-row">
            <text class="info-row__label">服务项目</text>
            <text class="info-row__value">{{ booking.serviceName || booking.service?.name }}</text>
          </view>
          <view class="info-row">
            <text class="info-row__label">服务技师</text>
            <text class="info-row__value">{{ booking.staffName || booking.staff?.name || '待分配' }}</text>
          </view>
          <view class="info-row">
            <text class="info-row__label">预约时段</text>
            <text class="info-row__value">
              {{ String(booking.bookDate || '').slice(0, 10) }} {{ booking.timeSlot }}
            </text>
          </view>
        </view>

        <view v-if="booking.status === 1" class="action-group">
          <theme-button block round :loading="acting" label="确认到店" @click="arrive" />
          <theme-button block round plain class="action-group__secondary" label="标记爽约" @click="noShow" />
        </view>
        <view v-else-if="booking.status === 2" class="action-group">
          <theme-button block round :loading="acting" label="服务完成" @click="complete" />
        </view>
      </view>
    </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
@import '@/styles/staff.scss';

.detail-body {
  margin-top: -24rpx;
  position: relative;
  z-index: 2;
}

.status-banner {
  padding: 48rpx 32rpx 56rpx;
  color: #fff;
  background: linear-gradient(160deg, var(--mb-hero-dark), var(--mb-primary));
}

.status-banner--warning {
  background: linear-gradient(160deg, #b45309, #f59e0b);
}

.status-banner--success {
  background: linear-gradient(160deg, #15803d, #22c55e);
}

.status-banner--danger {
  background: linear-gradient(160deg, #b91c1c, #ef4444);
}

.status-banner__text {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}

.status-banner__sub {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  opacity: 0.9;
}

.member-block {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.member-block__info {
  flex: 1;
  min-width: 0;
}

.member-block__name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.member-block__phone {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--mb-secondary);
}

.call-btn__icon {
  font-size: 36rpx;
}

.call-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: var(--mb-page-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--mb-page-bg);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
}

.info-row__label {
  font-size: 26rpx;
  color: var(--mb-secondary);
  flex-shrink: 0;
}

.info-row__value {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--mb-title);
  text-align: right;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 8rpx;
}

.action-group__secondary {
  margin-top: 0;
}
</style>
