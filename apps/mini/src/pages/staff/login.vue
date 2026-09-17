<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '@/api';
import { useUserStore } from '@/stores/user';
import { useShopStore } from '@/stores/shop';
import { hasValidWxAppId } from '@/config';
import { useShopTheme } from '@/hooks/useShopTheme';

const user = useUserStore();
const shopStore = useShopStore();
useShopTheme();
const phone = ref('');
const loading = ref(false);
const isDev = !hasValidWxAppId();

const shopName = computed(() => String(shopStore.shop?.name || '门店'));

onShow(async () => {
  await shopStore.ensureShop();
});

async function login() {
  if (!phone.value) {
    uni.showToast({ title: '请输入员工手机号', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const data = await api.staffLogin(phone.value);
    user.setAuth(data.token, data.staff as Record<string, unknown>, 'staff');
    uni.showToast({ title: '登录成功', icon: 'success' });
    uni.redirectTo({ url: '/pages/staff/today' });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <shop-theme-root>
    <view class="staff-page login-page">
      <staff-header :title="shopName" subtitle="员工工作台 · 预约与核销" />

      <view class="staff-body login-body">
        <view class="login-card staff-card">
          <view class="login-card__badge">STAFF</view>
          <text class="login-card__title">员工登录</text>
          <text class="login-card__sub">使用登记手机号登录工作台</text>

          <view class="login-field">
            <text class="login-field__icon">📱</text>
            <input v-model="phone" class="login-field__input" type="number" maxlength="11" placeholder="员工手机号" />
          </view>

          <theme-button block round :loading="loading" label="进入工作台" @click="login" />

          <text v-if="isDev" class="login-tip">开发演示：13800000001 / 13800000002</text>
        </view>
      </view>
    </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
@import '@/styles/staff.scss';

.login-body {
  margin-top: 24rpx;
}

.login-card {
  position: relative;
  padding-top: 48rpx;
}

.login-card__badge {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  background: var(--mb-page-bg);
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: var(--mb-secondary);
}

.login-card__title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.login-card__sub {
  display: block;
  margin: 12rpx 0 36rpx;
  font-size: 26rpx;
  color: var(--mb-secondary);
}

.login-field__icon {
  font-size: 32rpx;
  flex-shrink: 0;
}

.login-field {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 20rpx;
  background: var(--mb-page-bg);
  border-radius: 14rpx;
  margin-bottom: 28rpx;
}

.login-field__input {
  flex: 1;
  height: 80rpx;
  font-size: 30rpx;
  color: var(--mb-title);
}

.login-tip {
  display: block;
  margin-top: 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--mb-secondary);
}
</style>
