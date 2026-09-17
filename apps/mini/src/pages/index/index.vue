<script setup lang="ts">
import { computed, ref } from 'vue';
import { onHide, onShow } from '@dcloudio/uni-app';
import { api } from '@/api';
import { fenToYuan } from '@/utils/request';
import { resolveImageUrl } from '@/config';
import { useUserStore } from '@/stores/user';
import { serviceInitial } from '@/utils/booking-ui';
import { useStalePageLoad } from '@/utils/page-cache';
import { useShopTheme } from '@/hooks/useShopTheme';
import { useShopShare } from '@/utils/share';
import { formatBusinessHours, mergeMiniDisplay } from '@/utils/shop-display';

const user = useUserStore();
const { pageStyleStr, primaryColor } = useShopTheme();
useShopShare();
const shop = ref<any>({});
const services = ref<any[]>([]);
const bookings = ref<any[]>([]);

const { loading } = useStalePageLoad(
  async () => {
    const [shopData, serviceList] = await Promise.all([api.getShop(), api.getServices()]);
    let myBookings: any[] = [];
    if (await user.ensureLogin()) {
      myBookings = (await api.myBookings().catch(() => [])) as any[];
    }
    return { shopData, serviceList, myBookings };
  },
  ({ shopData, serviceList, myBookings }) => {
    shop.value = shopData;
    services.value = serviceList as any[];
    bookings.value = Array.isArray(myBookings) ? myBookings : [];
  },
);

function goDetail(item: any) {
  uni.navigateTo({ url: `/pages/service/detail?id=${item.id}` });
}

function goVerify() {
  uni.navigateTo({ url: '/pages/verify/code' });
}

function callShop() {
  if (shop.value.phone) {
    uni.makePhoneCall({ phoneNumber: shop.value.phone });
  }
}

function goBuyCard() {
  uni.navigateTo({ url: '/pages/card/buy' });
}

function goBookings() {
  uni.switchTab({ url: '/pages/booking/list' });
}

function goBookingDetail(_item: any) {
  uni.switchTab({ url: '/pages/booking/list' });
}

function coverUrl(item: any) {
  return resolveImageUrl(item.cover);
}

const miniDisplay = computed(() => mergeMiniDisplay(shop.value?.miniDisplay));

const businessHoursText = computed(() => formatBusinessHours(shop.value?.businessHours));

const banners = computed(() => {
  if (shop.value.logo) {
    return [{ value: resolveImageUrl(shop.value.logo), text: shop.value.name || '欢迎预约' }];
  }
  return [{ value: '', text: miniDisplay.value.heroDefaultTitle }];
});

const upcomingBooking = computed(() => {
  const active = bookings.value.filter((b) => b.status === 1 || b.status === 2);
  return active.sort((a, b) => {
    const da = `${String(a.bookDate).slice(0, 10)} ${a.timeSlot}`;
    const db = `${String(b.bookDate).slice(0, 10)} ${b.timeSlot}`;
    return da.localeCompare(db);
  })[0];
});

const pageActive = ref(true);
onShow(() => {
  pageActive.value = true;
});
onHide(() => {
  pageActive.value = false;
});
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view class="page">
    <view class="hero">
      <wd-swiper
        v-if="!loading"
        :list="banners"
        value-key="value"
        text-key="text"
        height="360rpx"
        :autoplay="pageActive"
        :interval="4000"
        indicator-position="bottom-right"
      >
        <template #default="{ item }">
          <view v-if="item.value" class="hero-slide">
            <image class="hero-img" :src="item.value" mode="aspectFill" />
            <view class="hero-mask" />
            <text class="hero-text">{{ item.text }}</text>
          </view>
          <view v-else class="hero-slide hero-slide--default">
            <text class="hero-text-lg">{{ miniDisplay.heroDefaultTitle }}</text>
            <text class="hero-text-sm">{{ miniDisplay.heroDefaultSubtitle }}</text>
          </view>
        </template>
      </wd-swiper>
      <view v-else class="hero-skeleton" />
    </view>

    <view class="shop-card">
      <view class="shop-row">
        <wd-img
          v-if="shop.logo"
          :src="resolveImageUrl(shop.logo)"
          width="96rpx"
          height="96rpx"
          radius="16rpx"
          mode="aspectFill"
        />
        <view v-else class="shop-logo-fallback">
          <wd-icon name="shop" size="40rpx" :color="primaryColor" />
        </view>
        <view class="shop-info">
          <text class="shop-name">{{ shop.name || '演示美容店' }}</text>
          <view class="shop-meta">
            <wd-icon name="location" size="28rpx" color="#9a958c" />
            <text>{{ shop.address || '欢迎到店体验' }}</text>
          </view>
          <view class="shop-meta">
            <wd-icon name="clock" size="28rpx" color="#9a958c" />
            <text>{{ businessHoursText }}</text>
          </view>
          <view v-if="shop.phone" class="shop-meta">
            <wd-icon name="phone" size="28rpx" color="#9a958c" />
            <text>{{ shop.phone }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="upcomingBooking" class="upcoming-card" @click="goBookingDetail(upcomingBooking)">
      <view class="upcoming-card__head">
        <text class="upcoming-card__tag">近期预约</text>
        <text class="upcoming-card__link">查看全部 ›</text>
      </view>
      <text class="upcoming-card__title">{{ upcomingBooking.serviceName || '预约服务' }}</text>
      <view class="upcoming-card__meta">
        <text>{{ String(upcomingBooking.bookDate).slice(0, 10) }} {{ upcomingBooking.timeSlot }}</text>
        <text v-if="upcomingBooking.staffName"> · {{ upcomingBooking.staffName }}</text>
      </view>
    </view>

    <wd-notice-bar
      v-if="miniDisplay.homeNotice"
      :text="miniDisplay.homeNotice"
      prefix="sound"
      :scrollable="pageActive"
      background-color="#faf6f0"
      color="#8b6914"
      custom-class="notice"
    />

    <view class="section">
      <wd-grid :column="4" clickable>
        <wd-grid-item icon="calendar" :text="miniDisplay.quickActions.bookings" @itemclick="goBookings" />
        <wd-grid-item icon="discount" :text="miniDisplay.quickActions.card" @itemclick="goBuyCard" />
        <wd-grid-item icon="qrcode" :text="miniDisplay.quickActions.verify" @itemclick="goVerify" />
        <wd-grid-item icon="service" :text="miniDisplay.quickActions.call" @itemclick="callShop" />
      </wd-grid>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">{{ miniDisplay.homeServicesTitle }}</text>
        <text class="section-sub">{{ miniDisplay.homeServicesSubtitle }}</text>
      </view>

      <wd-skeleton v-if="loading" :row-col="[[{ width: '100%', height: '180rpx' }], 1, 1]" animation="gradient" />

      <empty-tip v-else-if="!services.length" icon="💆" tip="暂无服务项目" />

      <view v-else class="service-list">
        <view
          v-for="item in services"
          :key="item.id"
          class="service-item"
          hover-class="service-item--press"
          :hover-stay-time="100"
          @click="goDetail(item)"
        >
          <view v-if="item.cover" class="service-cover">
            <image :src="coverUrl(item)" mode="aspectFill" class="service-cover__img" />
          </view>
          <view v-else class="service-cover service-cover--placeholder">
            <text>{{ serviceInitial(item.name) }}</text>
          </view>
          <view class="service-body">
            <view class="service-top">
              <text class="service-name">{{ item.name }}</text>
              <text class="service-price">¥{{ fenToYuan(item.price) }}</text>
            </view>
            <text v-if="item.description" class="service-desc">{{ item.description }}</text>
            <view class="service-tags">
              <wd-tag type="primary" plain round>{{ item.duration }}分钟</wd-tag>
              <wd-tag plain round>立即预约</wd-tag>
            </view>
          </view>
          <wd-icon name="arrow-right" size="32rpx" color="#d4c4a8" />
        </view>
      </view>
    </view>

    <view v-if="miniDisplay.bookingSteps.length" class="section">
      <view class="section-head">
        <text class="section-title">预约流程</text>
        <text class="section-sub">简单三步，轻松预约</text>
      </view>
      <view class="steps-row">
        <view v-for="(step, idx) in miniDisplay.bookingSteps" :key="idx" class="step-item">
          <view class="step-item__num">{{ idx + 1 }}</view>
          <text class="step-item__title">{{ step.title }}</text>
          <text class="step-item__desc">{{ step.desc }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="intro-card">
        <text class="intro-card__title">门店介绍</text>
        <text class="intro-card__text">{{ miniDisplay.defaultServiceDescription }}</text>
      </view>
    </view>

    <view class="footer-gap" />
  </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--mb-page-bg);
  padding-bottom: 24rpx;
}

.hero {
  position: relative;
}

.hero-skeleton {
  height: 360rpx;
  background: linear-gradient(135deg, #e8dfd3, #d4c4a8);
}

.hero-slide {
  position: relative;
  height: 360rpx;
  width: 100%;
}

.hero-slide--default {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--mb-hero-dark) 0%, var(--mb-hero-mid) 50%, var(--mb-primary) 100%);
}

.hero-img {
  width: 100%;
  height: 360rpx;
}

.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.45), transparent 60%);
}

.hero-text {
  position: absolute;
  left: 32rpx;
  bottom: 32rpx;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}

.hero-text-lg {
  color: #fff;
  font-size: 44rpx;
  font-weight: 700;
}

.hero-text-sm {
  color: rgba(255, 255, 255, 0.85);
  font-size: 26rpx;
  margin-top: 12rpx;
}

.shop-card {
  margin: -48rpx 24rpx 0;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(44, 42, 38, 0.08);
  position: relative;
  z-index: 2;
}

.shop-row {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.shop-logo-fallback {
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  background: #faf6f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.shop-info {
  flex: 1;
  min-width: 0;
}

.shop-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2a26;
  display: block;
}

.shop-meta {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #9a958c;
  line-height: 1.5;
}

.upcoming-card {
  margin: 20rpx 24rpx 0;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, var(--mb-hero-dark), var(--mb-hero-mid));
  color: #fff;
  box-shadow: 0 8rpx 28rpx rgba(61, 53, 48, 0.2);
}

.upcoming-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.upcoming-card__tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.18);
}

.upcoming-card__link {
  font-size: 24rpx;
  opacity: 0.85;
}

.upcoming-card__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
}

.upcoming-card__meta {
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.9;
}

.notice {
  margin: 24rpx 24rpx 0;
  border-radius: 12rpx;
}

.section {
  margin: 24rpx;
}

.section-head {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2a26;
  display: block;
}

.section-sub {
  font-size: 24rpx;
  color: #9a958c;
  margin-top: 6rpx;
  display: block;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(44, 42, 38, 0.05);
}

.service-item--press {
  background: #f7f2eb;
  transform: scale(0.99);
}

.service-cover {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.service-cover__img {
  width: 100%;
  height: 100%;
}

.service-cover--placeholder {
  background: linear-gradient(145deg, #f0ebe3, #e0d5c8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 700;
  color: var(--mb-primary);
}

.service-body {
  flex: 1;
  min-width: 0;
}

.service-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
}

.service-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2a26;
}

.service-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #c45c4a;
  flex-shrink: 0;
}

.service-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9a958c;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.steps-row {
  display: flex;
  gap: 16rpx;
}

.step-item {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(44, 42, 38, 0.05);
}

.step-item__num {
  width: 48rpx;
  height: 48rpx;
  margin: 0 auto;
  border-radius: 50%;
  background: #faf6f0;
  color: var(--mb-primary);
  font-size: 26rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.step-item__title {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #2c2a26;
}

.step-item__desc {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #9a958c;
  line-height: 1.4;
}

.intro-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(44, 42, 38, 0.05);
}

.intro-card__title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2a26;
  margin-bottom: 12rpx;
}

.intro-card__text {
  font-size: 26rpx;
  color: #6b6560;
  line-height: 1.7;
}

.footer-gap {
  height: 24rpx;
}
</style>
