<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api';
import { fenToYuan } from '@/utils/request';
import { useUserStore } from '@/stores/user';
import { useShopStore } from '@/stores/shop';
import { handlePaymentResult } from '@/utils/payment';
import { requestSubscribeMessage } from '@/utils/subscribe';
import { calcServiceDepositAmount } from '@/utils/deposit';
import { useShopTheme } from '@/hooks/useShopTheme';

const DEFAULT_SERVICE_DEPOSIT_RATIO = 20;

const user = useUserStore();
const shopStore = useShopStore();
const { pageStyleStr, primaryColor } = useShopTheme();
const form = ref({ serviceId: 0, staffId: 1, bookDate: '', timeSlot: '', remark: '' });
const serviceName = ref('');
const staffName = ref('');
const servicePrice = ref(0);
const serviceDepositType = ref(1);
const serviceDepositRatio = ref(DEFAULT_SERVICE_DEPOSIT_RATIO);
const serviceDepositFixed = ref(0);
const loading = ref(false);
const routeQuery = ref<Record<string, string | undefined>>({});

const depositAmount = computed(() =>
  calcServiceDepositAmount(
    servicePrice.value,
    serviceDepositType.value,
    serviceDepositRatio.value,
    serviceDepositFixed.value,
  ),
);

const bookingNotices = computed(() =>
  shopStore.miniDisplay.bookingNotices.map((tip) => tip.trim()).filter(Boolean),
);

onLoad(async (query) => {
  routeQuery.value = (query || {}) as Record<string, string | undefined>;
  await shopStore.ensureShop();
  if (!(await user.ensureLogin())) return;
  await initPage(routeQuery.value);
});

async function initPage(query: Record<string, string | undefined>) {
  form.value = {
    serviceId: Number(query?.serviceId || 0),
    staffId: Number(query?.staffId || 1),
    bookDate: String(query?.date || ''),
    timeSlot: String(query?.timeSlot || ''),
    remark: '',
  };
  serviceName.value = decodeQueryText(query?.serviceName);
  staffName.value = decodeQueryText(query?.staffName);
  await loadBookingMeta();
}

async function handleLogin() {
  const ok = await user.login();
  if (ok) await initPage(routeQuery.value);
}

function decodeQueryText(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

async function loadBookingMeta() {
  if (!form.value.serviceId) return;
  try {
    const services = (await api.getServices({ silent: true })) as Array<{
      id: number;
      name: string;
      price: number;
      depositType?: number;
      depositRatio?: number | null;
      depositFixed?: number;
    }>;
    const service = services.find((item) => Number(item.id) === form.value.serviceId);
    if (service?.name) serviceName.value = service.name;
    if (service?.price) servicePrice.value = Number(service.price);
    if (service) {
      serviceDepositType.value = Number(service.depositType ?? 1);
      serviceDepositRatio.value = Number(service.depositRatio ?? DEFAULT_SERVICE_DEPOSIT_RATIO);
      serviceDepositFixed.value = Number(service.depositFixed ?? 0);
    }

    if (form.value.bookDate && form.value.staffId) {
      const groups = (await api.getSlots(
        {
          serviceId: form.value.serviceId,
          date: form.value.bookDate,
          staffId: form.value.staffId,
        },
        { silent: true },
      )) as Array<{ staffId: number; staffName: string }>;
      const staff = groups.find((item) => Number(item.staffId) === form.value.staffId);
      if (staff?.staffName) staffName.value = staff.staffName;
    }
  } catch {
    // 保留 URL 传入的展示名称
  }
}

async function submit() {
  loading.value = true;
  try {
    await requestSubscribeMessage();
    const result: any = await api.createBooking(form.value);
    if (result.payment) {
      if (result.payment.devAutoPaid) {
        uni.showToast({ title: '开发模式：已模拟支付', icon: 'none', duration: 2000 });
      } else if (result.payment.payParams) {
        await handlePaymentResult(result.payment);
      }
    }
    uni.showToast({ title: '预约成功', icon: 'success' });
    setTimeout(() => uni.switchTab({ url: '/pages/booking/list' }), 800);
  } catch {
    // toast handled by request
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view v-if="!user.isLoggedIn" class="mb-page confirm-page">
    <empty-tip icon="👤" tip="登录后确认预约">
      <template #bottom>
        <theme-button round @click="handleLogin">立即登录</theme-button>
      </template>
    </empty-tip>
  </view>
  <view v-else class="mb-page confirm-page">
    <view class="mb-card block">
      <view class="mb-card--pad">
        <text class="block__title">预约信息</text>
        <view class="mb-info-row">
          <text class="mb-info-row__label">预约项目</text>
          <text class="mb-info-row__value">{{ serviceName || '—' }}</text>
        </view>
        <view class="mb-info-row">
          <text class="mb-info-row__label">预约技师</text>
          <text class="mb-info-row__value">{{ staffName || '—' }}</text>
        </view>
        <view class="mb-info-row">
          <text class="mb-info-row__label">预约日期</text>
          <text class="mb-info-row__value">{{ form.bookDate }}</text>
        </view>
        <view class="mb-info-row">
          <text class="mb-info-row__label">预约时段</text>
          <text class="mb-info-row__value">{{ form.timeSlot }}</text>
        </view>
        <view v-if="depositAmount > 0" class="mb-info-row">
          <text class="mb-info-row__label">预约订金</text>
          <text class="mb-info-row__value mb-info-row__value--price">¥{{ fenToYuan(depositAmount) }}</text>
        </view>
      </view>
    </view>

    <view class="mb-card block">
      <view class="mb-card--pad">
        <text class="block__title">备注</text>
        <wd-textarea
          v-model="form.remark"
          placeholder="如有特殊需求请填写（选填）"
          :maxlength="200"
          show-word-limit
          auto-height
          custom-class="remark-input"
        />
      </view>
    </view>

    <view v-if="bookingNotices.length" class="mb-card block">
      <view class="mb-card--pad">
        <text class="block__title">预约须知</text>
        <view v-for="(tip, idx) in bookingNotices" :key="idx" class="notice-item">
          <text class="notice-item__text">{{ tip }}</text>
        </view>
      </view>
    </view>

    <view class="tips">
      <wd-icon name="warning" size="28rpx" :color="primaryColor" />
      <text class="tips__text">{{ shopStore.miniDisplay.bookingConfirmTip }}</text>
    </view>

    <view class="legal-links">
      <text @click="uni.navigateTo({ url: '/pages/legal/index?type=refund' })">订金退款规则</text>
      <text class="legal-links__dot">·</text>
      <text @click="uni.navigateTo({ url: '/pages/legal/index?type=agreement' })">用户协议</text>
    </view>

    <view class="mb-footer-bar">
      <theme-button block size="large" label="确认预约" :loading="loading" @click="submit" />
    </view>
    <view class="mb-footer-spacer" />
  </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.confirm-page {
  padding-bottom: 0;
}

.block {
  margin-bottom: 20rpx;
}

.block__title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2a26;
  letter-spacing: 0.5rpx;
}

.mb-info-row__value--price {
  color: #c45c4a;
  font-weight: 700;
}

:deep(.remark-input) {
  margin-top: 8rpx;
  padding: 0 !important;
}

.notice-item {
  position: relative;
  padding-left: 24rpx;
  margin-top: 16rpx;
}

.notice-item::before {
  content: '·';
  position: absolute;
  left: 0;
  top: 0;
  color: #a8845a;
  font-weight: 700;
}

.notice-item__text {
  display: block;
  font-size: 26rpx;
  color: #6b665e;
  line-height: 1.6;
}

.tips {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-bottom: 20rpx;
  padding: 28rpx 32rpx;
  background: #faf6f0;
  border-radius: 20rpx;
}

.tips__text {
  flex: 1;
  font-size: 24rpx;
  color: #8b6914;
  line-height: 1.6;
}

.legal-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
  font-size: 22rpx;
  color: #9a958c;
}

.legal-links__dot {
  opacity: 0.6;
}

.mb-footer-bar {
  padding-left: 24rpx;
  padding-right: 24rpx;
}

.mb-footer-spacer {
  height: 180rpx;
}
</style>
