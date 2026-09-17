<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api';
import { fenToYuan } from '@/utils/request';
import { resolveImageUrl } from '@/config';
import { serviceInitial } from '@/utils/booking-ui';
import { formatLocalDate } from '@/utils/date';
import { flattenSlots } from '@/utils/slots';
import { formatBusinessHours, mergeMiniDisplay } from '@/utils/shop-display';
import { useShopTheme } from '@/hooks/useShopTheme';
import { useShopShare } from '@/utils/share';

const { pageStyleStr, primaryColor } = useShopTheme();
const service = ref<any>({});
const shop = ref<any>({});
const loading = ref(true);
const previewSlots = ref<Array<{ timeSlot: string; staffName: string; staffId: number }>>([]);
const bookableDays = ref(0);
const nextBookableDate = ref('');
let serviceId = 0;

useShopShare(() => {
  const shopId = shop.value?.id;
  const sid = service.value?.id || serviceId;
  if (sid) return `/pages/service/detail?id=${sid}&shopId=${shopId || ''}`;
  return `/pages/index/index?shopId=${shopId || ''}`;
});

const miniDisplay = computed(() => mergeMiniDisplay(shop.value?.miniDisplay));
const serviceTags = computed(() => (Array.isArray(service.value?.tags) ? service.value.tags : []));
const highlights = computed(() =>
  Array.isArray(service.value?.highlights) ? service.value.highlights : [],
);
const availabilityDays = computed(() => miniDisplay.value.availabilityDays);

const businessHoursText = computed(() => formatBusinessHours(shop.value.businessHours));

onLoad(async (query) => {
  serviceId = Number(query?.id || 0);
  loading.value = true;
  try {
    const [shopData, list] = await Promise.all([api.getShop(), api.getServices()]);
    shop.value = shopData;
    service.value = list.find((s) => Number(s.id) === serviceId) || {};

    if (serviceId) {
      const today = formatLocalDate(new Date());
      const availability = (await api.getAvailability({
        serviceId,
        from: today,
        days: availabilityDays.value,
      })) as Array<{ date: string; status: string; availableCount: number }>;

      bookableDays.value = availability.filter((d) => d.status === 'available').length;
      const first = availability.find((d) => d.status === 'available');
      if (first) {
        nextBookableDate.value = first.date;
        const groups: any[] = await api.getSlots({ serviceId, date: first.date });
        previewSlots.value = flattenSlots(groups)
          .filter((s) => s.available)
          .slice(0, 6)
          .map((s) => ({
            timeSlot: s.timeSlot,
            staffName: s.staffName,
            staffId: s.staffId,
          }));
      }
    }
  } finally {
    loading.value = false;
  }
});

function book() {
  if (!serviceId || !service.value?.name) {
    uni.showToast({ title: '项目不存在，请返回首页重选', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/booking/slots?serviceId=${serviceId}` });
}

function selectPreviewSlot(slot: { timeSlot: string; staffId: number; staffName: string }) {
  if (!serviceId || !nextBookableDate.value) {
    book();
    return;
  }
  uni.navigateTo({
    url: `/pages/booking/confirm?serviceId=${serviceId}&date=${nextBookableDate.value}&timeSlot=${slot.timeSlot}&staffId=${slot.staffId}&serviceName=${encodeURIComponent(service.value.name || '')}&staffName=${encodeURIComponent(slot.staffName)}`,
  });
}

function callShop() {
  if (shop.value.phone) {
    uni.makePhoneCall({ phoneNumber: shop.value.phone });
  }
}

function openMap() {
  if (shop.value.address) {
    uni.setClipboardData({
      data: shop.value.address,
      success: () => uni.showToast({ title: '地址已复制', icon: 'none' }),
    });
  }
}
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view class="page">
    <view class="hero">
      <image
        v-if="service.cover"
        class="hero__img"
        :src="resolveImageUrl(service.cover)"
        mode="aspectFill"
      />
      <view v-else class="hero__placeholder">
        <text class="hero__char">{{ serviceInitial(service.name) }}</text>
      </view>
      <view class="hero__mask" />
      <view class="hero__info">
        <text class="hero__shop">{{ shop.name || '演示美发店' }}</text>
        <text class="hero__name">{{ service.name || '加载中...' }}</text>
      </view>
    </view>

    <wd-skeleton v-if="loading" :row-col="[[{ width: '100%', height: '200rpx' }], 2]" animation="gradient" />

    <template v-else>
      <view class="main-card">
        <view class="price-row">
          <view>
            <text class="price-row__label">服务价格</text>
            <view class="price-row__amount">
              <text class="price-row__symbol">¥</text>
              <text class="price-row__num">{{ fenToYuan(service.price || 0) }}</text>
            </view>
          </view>
          <view v-if="bookableDays" class="avail-badge">
            <text class="avail-badge__num">{{ bookableDays }}</text>
            <text class="avail-badge__label">天可约</text>
          </view>
        </view>

        <view class="meta-tags">
          <view class="meta-tag">
            <wd-icon name="clock" size="28rpx" color="#a8845a" />
            <text>{{ service.duration || 0 }} 分钟</text>
          </view>
          <view v-for="(tag, idx) in serviceTags" :key="idx" class="meta-tag">
            <wd-icon :name="idx === 0 ? 'user' : 'calendar'" size="28rpx" color="#a8845a" />
            <text>{{ tag }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">项目介绍</text>
        </view>
        <view class="desc-card">
          <text class="desc-card__text">
            {{ service.description || miniDisplay.defaultServiceDescription }}
          </text>
        </view>
      </view>

      <view v-if="previewSlots.length" class="section">
        <view class="section-head">
          <text class="section-title">近期可约</text>
          <text class="section-sub">{{ nextBookableDate }} 起</text>
        </view>
        <view class="slot-preview">
          <view
            v-for="(slot, idx) in previewSlots"
            :key="idx"
            class="slot-chip slot-chip--pickable"
            hover-class="slot-chip--active"
            @click="selectPreviewSlot(slot)"
          >
            <text class="slot-chip__time">{{ slot.timeSlot }}</text>
            <text class="slot-chip__staff">{{ slot.staffName }}</text>
          </view>
          <view class="slot-chip slot-chip--more" @click="book">
            <text>更多时段</text>
            <wd-icon name="arrow-right" size="24rpx" color="#a8845a" />
          </view>
        </view>
      </view>

      <view v-if="highlights.length" class="section">
        <view class="section-head">
          <text class="section-title">服务亮点</text>
        </view>
        <view class="highlight-grid">
          <view v-for="item in highlights" :key="item.title" class="highlight-item">
            <text class="highlight-item__icon">{{ item.icon }}</text>
            <text class="highlight-item__title">{{ item.title }}</text>
            <text class="highlight-item__desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">门店信息</text>
        </view>
        <view class="shop-card">
          <view class="shop-card__row" @click="openMap">
            <wd-icon name="location" size="36rpx" color="#a8845a" />
            <view class="shop-card__content">
              <text class="shop-card__label">门店地址</text>
              <text class="shop-card__value">{{ shop.address || '暂无地址' }}</text>
            </view>
            <wd-icon name="arrow-right" size="28rpx" color="#d4c4a8" />
          </view>
          <view class="shop-card__divider" />
          <view class="shop-card__row" @click="callShop">
            <wd-icon name="phone" size="36rpx" color="#a8845a" />
            <view class="shop-card__content">
              <text class="shop-card__label">联系电话</text>
              <text class="shop-card__value">{{ shop.phone || '暂无电话' }}</text>
            </view>
            <wd-icon name="arrow-right" size="28rpx" color="#d4c4a8" />
          </view>
          <view class="shop-card__divider" />
          <view class="shop-card__row">
            <wd-icon name="clock" size="36rpx" color="#a8845a" />
            <view class="shop-card__content">
              <text class="shop-card__label">营业时间</text>
              <text class="shop-card__value">{{ businessHoursText }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <view class="footer-bar">
      <view class="footer-price">
        <text class="footer-price__label">服务价格</text>
        <text class="footer-price__amount">¥{{ fenToYuan(service.price || 0) }}</text>
      </view>
      <view class="footer-btn mb-theme-btn" @click="book">立即预约</view>
    </view>
    <view class="footer-spacer" />
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
  height: 520rpx;
  overflow: hidden;
}

.hero__img,
.hero__placeholder {
  width: 100%;
  height: 100%;
}

.hero__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #3d3530 0%, #6b5d52 50%, #a8845a 100%);
}

.hero__char {
  font-size: 140rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.25);
}

.hero__mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, transparent 55%);
}

.hero__info {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 56rpx;
}

.hero__shop {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8rpx;
}

.hero__name {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
}

.main-card {
  margin: -36rpx 24rpx 0;
  padding: 32rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 40rpx rgba(44, 42, 38, 0.08);
  position: relative;
  z-index: 2;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-row__label {
  display: block;
  font-size: 24rpx;
  color: #9a958c;
}

.price-row__amount {
  display: flex;
  align-items: baseline;
  margin-top: 4rpx;
}

.price-row__symbol {
  font-size: 28rpx;
  font-weight: 600;
  color: #c45c4a;
}

.price-row__num {
  font-size: 48rpx;
  font-weight: 700;
  color: #c45c4a;
  line-height: 1;
}

.avail-badge {
  text-align: center;
  padding: 16rpx 24rpx;
  background: linear-gradient(135deg, #faf6f0, #f0e6d8);
  border-radius: 16rpx;
  border: 2rpx solid #e8dfd3;
}

.avail-badge__num {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #a8845a;
  line-height: 1;
}

.avail-badge__label {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #9a958c;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0ebe3;
}

.meta-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  background: #faf8f5;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #6b665e;
}

.section {
  margin: 24rpx 24rpx 0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 0 8rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2a26;
}

.section-sub {
  font-size: 24rpx;
  color: #9a958c;
}

.highlight-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.highlight-item {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(44, 42, 38, 0.04);
}

.highlight-item__icon {
  font-size: 40rpx;
}

.highlight-item__title {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2a26;
}

.highlight-item__desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9a958c;
}

.slot-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.slot-chip {
  padding: 16rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 2rpx solid #ebe6df;
  text-align: center;
  min-width: 140rpx;
}

.slot-chip--pickable {
  cursor: pointer;
}

.slot-chip--active {
  background: #faf6f0;
  border-color: #a8845a;
  transform: scale(0.98);
}

.slot-chip--more {
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: #a8845a;
  font-size: 24rpx;
  font-weight: 600;
  background: #faf6f0;
  border-color: #e8dfd3;
}

.slot-chip__time {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2a26;
}

.slot-chip__staff {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #9a958c;
}

.desc-card,
.shop-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(44, 42, 38, 0.04);
}

.desc-card__text {
  font-size: 26rpx;
  color: #6b665e;
  line-height: 1.8;
}

.shop-card__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 0;
}

.shop-card__content {
  flex: 1;
  min-width: 0;
}

.shop-card__label {
  display: block;
  font-size: 22rpx;
  color: #9a958c;
}

.shop-card__value {
  display: block;
  margin-top: 4rpx;
  font-size: 26rpx;
  color: #2c2a26;
}

.shop-card__divider {
  height: 1rpx;
  background: #f0ebe3;
  margin: 16rpx 0;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.footer-price {
  flex: 1;
}

.footer-price__label {
  display: block;
  font-size: 22rpx;
  color: #9a958c;
}

.footer-price__amount {
  font-size: 36rpx;
  font-weight: 700;
  color: #c45c4a;
}

.footer-btn {
  min-width: 280rpx;
  padding: 24rpx 48rpx;
  font-size: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(44, 42, 38, 0.14);
}

.footer-spacer {
  height: 160rpx;
}
</style>
