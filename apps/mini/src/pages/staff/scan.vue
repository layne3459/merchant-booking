<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '@/api';
import { useShopStore } from '@/stores/shop';
import { useShopTheme } from '@/hooks/useShopTheme';

const shopStore = useShopStore();
const { palette } = useShopTheme();
const code = ref('');
const serviceId = ref<number | null>(null);
const services = ref<any[]>([]);
const submitting = ref(false);
const loadingServices = ref(true);

async function loadServices() {
  loadingServices.value = true;
  try {
    services.value = (await api.getServices()) as any[];
  } finally {
    loadingServices.value = false;
  }
}

onShow(async () => {
  await shopStore.ensureShop();
  await loadServices();
});

function ensureServiceSelected() {
  if (!serviceId.value) {
    uni.showToast({ title: '请先选择核销项目', icon: 'none' });
    return false;
  }
  return true;
}

function scan() {
  if (!ensureServiceSelected()) return;
  uni.scanCode({
    onlyFromCamera: true,
    success: async (res) => {
      code.value = res.result;
      await submit();
    },
    fail: () => uni.showToast({ title: '扫码取消', icon: 'none' }),
  });
}

function goRecords() {
  uni.navigateTo({ url: '/pages/staff/records' });
}

async function submit() {
  if (!ensureServiceSelected()) return;
  if (!code.value) {
    uni.showToast({ title: '请输入核销码', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const result: any = await api.consumeVerify(code.value.trim(), Number(serviceId.value));
    uni.vibrateShort({});
    uni.showModal({
      title: '核销成功',
      content: `${result.memberName || '会员'}\n${result.cardName || ''} ${result.cardNo || ''}`,
      showCancel: false,
    });
    code.value = '';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <shop-theme-root>
    <view class="staff-page staff-page--dock">
      <staff-header title="扫码核销" subtitle="先选项目，再扫码" />

      <view class="staff-body">
        <view class="staff-card">
          <view v-if="loadingServices" class="service-loading">
            <text :style="{ color: palette.secondaryColor }">加载项目中...</text>
          </view>
          <staff-service-picker v-else v-model="serviceId" :services="services" />
        </view>

        <view class="scan-hero staff-card">
          <view class="scan-hero__ring">
            <view class="scan-hero__icon" @click="scan">
              <text class="scan-hero__icon-text">扫</text>
            </view>
          </view>
          <text class="scan-hero__title">扫描顾客二维码</text>
          <text class="scan-hero__sub">顾客在「核销码」页出示二维码</text>
          <theme-button block round class="scan-hero__btn" label="打开相机扫码" @click="scan" />
        </view>

        <view class="staff-card">
          <view class="staff-card__title" :style="{ color: palette.titleColor }">手动输入核销码</view>
          <input
            v-model="code"
            class="staff-field"
            placeholder="粘贴顾客数字码（非扫码）"
            placeholder-style="color:#9a958c"
            :style="{ color: palette.titleColor, background: palette.pageBackground }"
          />
          <theme-button block round :loading="submitting" label="确认核销" @click="submit" />
          <view class="scan-footer" :style="{ color: palette.primaryColor }" @click="goRecords">
            <text>查看今日核销记录 ›</text>
          </view>
        </view>
      </view>
      <staff-dock active="scan" />
    </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
@import '@/styles/staff.scss';

.scan-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: 32rpx;
  padding-bottom: 32rpx;
}

.scan-hero__ring {
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  border: 4rpx dashed rgba(168, 132, 90, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.scan-hero__icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: var(--mb-page-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-hero__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.scan-hero__sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--mb-secondary);
}

.scan-hero__btn {
  width: 100%;
  margin-top: 28rpx;
}

.scan-hero__icon-text {
  font-size: 52rpx;
  font-weight: 700;
  color: var(--mb-primary);
}

.scan-footer {
  margin-top: 24rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 600;
}

.service-loading {
  padding: 40rpx 0;
  text-align: center;
  font-size: 26rpx;
}
</style>
