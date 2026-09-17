<script setup lang="ts">
import { computed, ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { api } from '@/api';
import { useShopStore } from '@/stores/shop';
import { useUserStore } from '@/stores/user';
import { useShopTheme } from '@/hooks/useShopTheme';
import { bookingStatusClass, bookingStatusTag, serviceInitial } from '@/utils/booking-ui';
import { formatLocalDate } from '@/utils/date';

const shopStore = useShopStore();
const user = useUserStore();
const { palette } = useShopTheme();
const list = ref<any[]>([]);
const loading = ref(true);
const tab = ref<'all' | 'booked' | 'serving'>('booked');
const actingId = ref(0);

const todayLabel = formatLocalDate(new Date());
const shopName = computed(() => String(shopStore.shop?.name || '门店工作台'));
const staffName = computed(() => String(user.profile?.name || '员工'));

const stats = computed(() => ({
  total: list.value.length,
  booked: list.value.filter((i) => i.status === 1).length,
  serving: list.value.filter((i) => i.status === 2).length,
}));

const filteredList = computed(() => {
  if (tab.value === 'booked') return list.value.filter((i) => i.status === 1);
  if (tab.value === 'serving') return list.value.filter((i) => i.status === 2);
  return list.value;
});

const nextBooking = computed(() => list.value.find((i) => i.status === 1));

async function reload() {
  loading.value = true;
  try {
    await shopStore.ensureShop();
    list.value = (await api.todayBookings()) as any[];
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
}

onShow(() => {
  void reload();
});

onPullDownRefresh(() => {
  void reload();
});

function detail(id: number) {
  uni.navigateTo({ url: `/pages/staff/booking-detail?id=${id}` });
}

function callMember(phone?: string) {
  if (!phone) {
    uni.showToast({ title: '暂无手机号', icon: 'none' });
    return;
  }
  uni.makePhoneCall({ phoneNumber: phone });
}

function memberName(item: any) {
  return item.memberName || item.member?.nickname || '顾客';
}

function memberPhone(item: any) {
  return item.memberPhone || item.member?.phone;
}

function statusText(status: number) {
  return bookingStatusTag(status).text;
}

async function arrive(id: number) {
  actingId.value = id;
  try {
    await api.arriveBooking(id);
    uni.showToast({ title: '已确认到店', icon: 'success' });
    await reload();
  } finally {
    actingId.value = 0;
  }
}

async function complete(id: number) {
  actingId.value = id;
  try {
    await api.completeBooking(id);
    uni.showToast({ title: '服务已完成', icon: 'success' });
    await reload();
  } finally {
    actingId.value = 0;
  }
}

function goScan() {
  uni.redirectTo({ url: '/pages/staff/scan' });
}
</script>

<template>
  <shop-theme-root>
    <view class="staff-page staff-page--dock">
      <view class="today-top" :style="{ background: `linear-gradient(160deg, ${palette.heroDark} 0%, ${palette.primaryColor} 100%)` }">
        <view class="today-top__main">
          <text class="today-top__title">{{ shopName }}</text>
          <text class="today-top__sub">{{ todayLabel }} · {{ staffName }}</text>
        </view>
        <view class="today-top__stats">
          <view class="today-top__stat">
            <text class="today-top__stat-num">{{ stats.booked }}</text>
            <text class="today-top__stat-label">待到店</text>
          </view>
          <view class="today-top__stat">
            <text class="today-top__stat-num">{{ stats.serving }}</text>
            <text class="today-top__stat-label">服务中</text>
          </view>
        </view>
      </view>

      <view v-if="nextBooking && !loading" class="next-card staff-card" @click="detail(nextBooking.id)">
        <text class="next-card__tag">下一单</text>
        <view class="next-card__row">
          <text class="next-card__time">{{ nextBooking.timeSlot }}</text>
          <text class="next-card__name">{{ memberName(nextBooking) }}</text>
          <text class="next-card__service">{{ nextBooking.serviceName || nextBooking.service?.name }}</text>
        </view>
        <view class="next-card__actions">
          <view
            class="quick-btn quick-btn--primary"
            :style="{ background: palette.buttonBgColor, color: palette.buttonTextColor }"
            @click.stop="arrive(nextBooking.id)"
          >
            <text>确认到店</text>
          </view>
          <view
            v-if="memberPhone(nextBooking)"
            class="quick-btn"
            :style="{ color: palette.primaryColor, borderColor: palette.buttonBorderColor }"
            @click.stop="callMember(memberPhone(nextBooking))"
          >
            <text>电话</text>
          </view>
        </view>
      </view>

      <view class="staff-body">
        <view class="staff-tabs staff-tabs--counts">
          <view
            class="staff-tab"
            :class="{ 'staff-tab--on': tab === 'booked' }"
            :style="tab === 'booked' ? { color: palette.primaryColor, borderColor: palette.primaryColor } : {}"
            @click="tab = 'booked'"
          >
            <text>待到店 {{ stats.booked }}</text>
          </view>
          <view
            class="staff-tab"
            :class="{ 'staff-tab--on': tab === 'serving' }"
            :style="tab === 'serving' ? { color: palette.primaryColor, borderColor: palette.primaryColor } : {}"
            @click="tab = 'serving'"
          >
            <text>服务中 {{ stats.serving }}</text>
          </view>
          <view
            class="staff-tab"
            :class="{ 'staff-tab--on': tab === 'all' }"
            :style="tab === 'all' ? { color: palette.primaryColor, borderColor: palette.primaryColor } : {}"
            @click="tab = 'all'"
          >
            <text>全部 {{ stats.total }}</text>
          </view>
        </view>

        <view v-if="loading" class="staff-loading">
          <text :style="{ color: palette.secondaryColor }">加载中...</text>
        </view>

        <template v-else>
          <empty-tip v-if="!list.length" icon="📅" tip="今日暂无预约">
            <template #bottom>
              <theme-button round label="去扫码核销" @click="goScan" />
            </template>
          </empty-tip>

          <empty-tip v-else-if="!filteredList.length" icon="✅" tip="该分类下暂无预约" />

          <view v-else class="booking-list">
            <view
              v-for="item in filteredList"
              :key="item.id"
              class="booking-item staff-card"
              :class="bookingStatusClass(item.status)"
            >
              <view class="booking-item__head" @click="detail(item.id)">
                <text class="booking-item__time" :style="{ color: palette.primaryColor }">{{ item.timeSlot }}</text>
                <view class="booking-item__info">
                  <text class="booking-item__name" :style="{ color: palette.titleColor }">{{ memberName(item) }}</text>
                  <text class="booking-item__service" :style="{ color: palette.secondaryColor }">
                    {{ item.serviceName || item.service?.name }} · {{ item.staffName || item.staff?.name || '待分配' }}
                  </text>
                </view>
                <text class="booking-item__status" :style="{ color: palette.secondaryColor }">{{ statusText(item.status) }}</text>
              </view>
              <view class="booking-item__actions">
                <view
                  v-if="item.status === 1"
                  class="quick-btn quick-btn--primary"
                  :class="{ 'quick-btn--disabled': actingId === item.id }"
                  :style="{ background: palette.buttonBgColor, color: palette.buttonTextColor }"
                  @click="arrive(item.id)"
                >
                  <text>{{ actingId === item.id ? '处理中' : '确认到店' }}</text>
                </view>
                <view
                  v-if="item.status === 2"
                  class="quick-btn quick-btn--primary"
                  :class="{ 'quick-btn--disabled': actingId === item.id }"
                  :style="{ background: palette.buttonBgColor, color: palette.buttonTextColor }"
                  @click="complete(item.id)"
                >
                  <text>{{ actingId === item.id ? '处理中' : '服务完成' }}</text>
                </view>
                <view
                  v-if="memberPhone(item)"
                  class="quick-btn"
                  :style="{ color: palette.primaryColor, borderColor: palette.buttonBorderColor }"
                  @click="callMember(memberPhone(item))"
                >
                  <text>电话</text>
                </view>
                <view
                  class="quick-btn"
                  :style="{ color: palette.contentColor, borderColor: '#ddd' }"
                  @click="detail(item.id)"
                >
                  <text>详情</text>
                </view>
              </view>
            </view>
          </view>
        </template>
      </view>

      <staff-dock active="today" />
    </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
@import '@/styles/staff.scss';

.today-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 28rpx 36rpx;
  color: #fff;
}

.today-top__title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
}

.today-top__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.88;
}

.today-top__stats {
  display: flex;
  gap: 20rpx;
}

.today-top__stat {
  text-align: center;
  min-width: 80rpx;
}

.today-top__stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1;
}

.today-top__stat-label {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  opacity: 0.85;
}

.next-card {
  margin: -20rpx 24rpx 0;
  position: relative;
  z-index: 2;
  border: 2rpx solid rgba(168, 132, 90, 0.25);
}

.next-card__tag {
  display: inline-block;
  margin-bottom: 12rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #f7f5f2;
  font-size: 20rpx;
  font-weight: 700;
  color: #a8845a;
}

.next-card__row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.next-card__time {
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2a26;
}

.next-card__name {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2a26;
}

.next-card__service {
  font-size: 24rpx;
  color: #9a958c;
}

.next-card__actions,
.booking-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.staff-tabs--counts {
  margin-bottom: 16rpx;
}

.staff-tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 8rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  background: #fff;
  border: 2rpx solid transparent;
}

.staff-tab--on {
  font-weight: 700;
  background: #fff;
}

.staff-loading {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
}

.booking-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.booking-item {
  padding: 20rpx 22rpx;
}

.booking-item__head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.booking-item__time {
  width: 88rpx;
  flex-shrink: 0;
  font-size: 32rpx;
  font-weight: 700;
}

.booking-item__info {
  flex: 1;
  min-width: 0;
}

.booking-item__name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
}

.booking-item__service {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-item__status {
  flex-shrink: 0;
  font-size: 22rpx;
}

.quick-btn {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  border: 2rpx solid;
  font-size: 24rpx;
  font-weight: 600;
  background: #fff;
}

.quick-btn--primary {
  border-color: transparent;
}

.quick-btn--disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
