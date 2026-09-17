<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { hasValidWxAppId } from '@/config';
import { useShopStore } from '@/stores/shop';

import { useShopTheme } from '@/hooks/useShopTheme';
import { useShopShare } from '@/utils/share';

const user = useUserStore();
const { pageStyleStr, primaryColor, palette } = useShopTheme();
useShopShare();
const shopStore = useShopStore();
const { isLoggedIn, profile, mode, staffProfile, canAccessStaffWorkbench } = storeToRefs(user);
const manualPhone = ref('');
const canUseWxPhone = hasValidWxAppId();
const showManualPhoneBind = computed(() => shopStore.miniDisplay.allowManualPhoneBind);

const staffWorkbenchValue = computed(() => {
  const name = staffProfile.value?.name || (mode.value === 'staff' ? profile.value?.name : null);
  return name ? String(name) : '';
});

const displayName = computed(() => {
  if (mode.value === 'staff') {
    return String(profile.value?.name || profile.value?.nickname || '员工');
  }
  return String(profile.value?.nickname || '微信用户');
});

const displayPhone = computed(() => {
  const phone =
    profile.value?.phone ||
    staffProfile.value?.phone ||
    (typeof profile.value?.staff === 'object' ? (profile.value?.staff as { phone?: string }).phone : null);
  return phone ? String(phone) : '';
});

async function withStaffMode(navigate: () => void) {
  if (mode.value === 'staff') {
    navigate();
    return;
  }
  const ok = await user.enterStaffMode();
  if (ok) navigate();
}

async function withCustomerMode(action: () => void) {
  if (mode.value === 'staff') {
    const ok = await user.exitStaffMode();
    if (!ok) return;
  }
  action();
}
const loggingIn = ref(false);
const bindingPhone = ref(false);
const showBindSheet = ref(false);

const STAFF_SECRET_TAPS = 5;
const STAFF_SECRET_WINDOW_MS = 2500;
let staffTapCount = 0;
let staffTapTimer: ReturnType<typeof setTimeout> | null = null;

function goStaffLogin() {
  uni.navigateTo({ url: '/pages/staff/login' });
}

function goStaffToday() {
  void withStaffMode(() => uni.navigateTo({ url: '/pages/staff/today' }));
}

function goStaffScan() {
  void withStaffMode(() => uni.navigateTo({ url: '/pages/staff/scan' }));
}

function goStaffRecords() {
  void withStaffMode(() => uni.navigateTo({ url: '/pages/staff/records' }));
}

function goStaffMember() {
  void withStaffMode(() => uni.navigateTo({ url: '/pages/staff/member' }));
}

onShow(() => {
  void shopStore.ensureShop();
  if (isLoggedIn.value && mode.value === 'customer') {
    void user.refreshProfile();
  }
});

/** 顶部背景连续点击 5 次进入员工登录，不对普通顾客展示入口 */
function onStaffSecretTap() {
  if (mode.value === 'staff') return;
  staffTapCount += 1;
  if (staffTapTimer) clearTimeout(staffTapTimer);
  if (staffTapCount >= STAFF_SECRET_TAPS) {
    staffTapCount = 0;
    goStaffLogin();
    return;
  }
  staffTapTimer = setTimeout(() => {
    staffTapCount = 0;
  }, STAFF_SECRET_WINDOW_MS);
}

const logoutBtnStyle = computed(() => ({
  background: 'transparent',
  color: palette.value.buttonOutlineTextColor,
  border: `2rpx solid ${palette.value.buttonBorderColor}`,
}));

function logout() {
  user.logout();
  uni.showToast({ title: '已退出', icon: 'none' });
}

async function handleLogin() {
  if (loggingIn.value) return;
  loggingIn.value = true;
  try {
    await user.login();
  } finally {
    loggingIn.value = false;
  }
}

async function requireLogin(action: () => void) {
  if (!isLoggedIn.value) {
    const ok = await user.login();
    if (!ok) return;
  }
  action();
}

async function bindManual() {
  if (!manualPhone.value) {
    uni.showToast({ title: '请输入手机号', icon: 'none' });
    return;
  }
  if (bindingPhone.value) return;
  bindingPhone.value = true;
  try {
    await user.bindPhoneManual(manualPhone.value);
    manualPhone.value = '';
    showBindSheet.value = false;
  } finally {
    bindingPhone.value = false;
  }
}

async function onBindWxPhone(e: { detail?: { code?: string; errMsg?: string } }) {
  if (bindingPhone.value) return;
  bindingPhone.value = true;
  try {
    await user.bindPhoneByWx(e);
    if (profile.value?.phone) {
      showBindSheet.value = false;
    }
  } finally {
    bindingPhone.value = false;
  }
}

function openBindSheet() {
  if (!profile.value?.phone) {
    showBindSheet.value = true;
  }
}

function closeBindSheet() {
  showBindSheet.value = false;
}

function goBookings() {
  requireLogin(() => {
    void withCustomerMode(() => uni.switchTab({ url: '/pages/booking/list' }));
  });
}

function goCards() {
  requireLogin(() => {
    void withCustomerMode(() => uni.switchTab({ url: '/pages/card/list' }));
  });
}

function goVerify() {
  requireLogin(() => {
    void withCustomerMode(() => uni.navigateTo({ url: '/pages/verify/code' }));
  });
}

function goBuyCard() {
  requireLogin(() => {
    void withCustomerMode(() => uni.navigateTo({ url: '/pages/card/buy' }));
  });
}

function goLegal(type: 'agreement' | 'privacy' | 'refund') {
  uni.navigateTo({ url: `/pages/legal/index?type=${type}` });
}
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view class="page">
    <view class="profile-header">
      <view class="profile-bg" @click="onStaffSecretTap" />
      <view class="profile-content" :class="{ 'profile-content--guest': !isLoggedIn }">
        <template v-if="isLoggedIn">
          <wd-avatar
            :text="(profile?.nickname || '微').slice(0, 1)"
            size="large"
            bg-color="#faf6f0"
            :color="primaryColor"
          />
          <view class="profile-info">
            <text class="profile-name">{{ displayName }}</text>
            <text
              v-if="displayPhone"
              class="profile-phone"
            >{{ displayPhone }}</text>
            <text v-else class="profile-phone">未绑定手机号</text>
          </view>
          <wd-tag v-if="mode === 'staff'" type="warning" round plain>员工</wd-tag>
          <wd-tag v-else-if="staffProfile" type="warning" round plain>本店员工</wd-tag>
          <wd-tag v-else type="primary" round plain>顾客</wd-tag>
        </template>
        <template v-else>
          <wd-avatar text="?" size="large" bg-color="#f0ebe3" color="#9a958c" />
          <view class="profile-info">
            <text class="profile-name">未登录</text>
            <text class="profile-phone">登录后可查看预约、会员卡与核销码</text>
          </view>
          <theme-button size="small" :loading="loggingIn" @click="handleLogin">
            微信登录
          </theme-button>
        </template>
      </view>
    </view>

    <view class="panel">
      <template v-if="isLoggedIn">
        <wd-cell-group border>
          <wd-cell
            v-if="!displayPhone && mode !== 'staff'"
            title="绑定手机号"
            label="预约通知与员工识别"
            icon="phone"
            is-link
            @click="openBindSheet"
          />
          <wd-cell title="我的预约" icon="calendar" is-link @click="goBookings" />
          <wd-cell title="我的会员卡" icon="discount" is-link @click="goCards" />
          <wd-cell title="核销码" icon="qrcode" is-link @click="goVerify" />
          <wd-cell title="购买会员卡" icon="goods" is-link @click="goBuyCard" />
        </wd-cell-group>

        <wd-cell-group v-if="canAccessStaffWorkbench" border class="staff-group">
          <view class="staff-panel-tip">
            员工工作台{{ staffWorkbenchValue ? ` · ${staffWorkbenchValue}` : '' }}
          </view>
          <wd-cell title="今日预约" icon="calendar" is-link @click="goStaffToday" />
          <wd-cell title="扫码核销" icon="scan" is-link @click="goStaffScan" />
          <wd-cell title="会员查询" icon="search" is-link @click="goStaffMember" />
          <wd-cell title="核销记录" icon="list" is-link @click="goStaffRecords" />
        </wd-cell-group>
      </template>

      <view v-else class="guest-hint">
        <text class="guest-hint__text">以下功能需登录后使用</text>
        <view class="guest-hint__tags">
          <text class="guest-tag">我的预约</text>
          <text class="guest-tag">我的会员卡</text>
          <text class="guest-tag">核销码</text>
          <text class="guest-tag">购买会员卡</text>
        </view>
      </view>

      <wd-cell-group border class="legal-group">
        <wd-cell title="用户服务协议" is-link @click="goLegal('agreement')" />
        <wd-cell title="隐私政策" is-link @click="goLegal('privacy')" />
        <wd-cell title="退卡与订金规则" is-link @click="goLegal('refund')" />
      </wd-cell-group>

      <view v-if="isLoggedIn" class="logout-wrap">
        <view class="logout-btn" :style="logoutBtnStyle" @click="logout">
          <text class="logout-btn__text">退出登录</text>
        </view>
      </view>
    </view>

    <view v-if="showBindSheet" class="sheet-mask" @click="closeBindSheet" />
    <view v-if="showBindSheet" class="bind-sheet">
      <view class="bind-sheet__head">
        <text class="bind-sheet__title">绑定手机号</text>
        <text class="bind-sheet__close" @click="closeBindSheet">关闭</text>
      </view>
      <text class="bind-sheet__tip">用于预约通知；员工请绑定与档案一致的手机号</text>

      <!-- #ifdef MP-WEIXIN -->
      <button
        v-if="canUseWxPhone"
        class="bind-sheet__wx-btn"
        open-type="getPhoneNumber"
        :loading="bindingPhone"
        @getphonenumber="onBindWxPhone"
      >
        微信一键授权
      </button>
      <view v-if="canUseWxPhone && showManualPhoneBind" class="bind-sheet__or">或手动输入</view>
      <!-- #endif -->

      <view v-if="showManualPhoneBind || !canUseWxPhone" class="bind-sheet__field">
        <text class="bind-sheet__prefix">+86</text>
        <input
          v-model="manualPhone"
          class="bind-sheet__input"
          type="number"
          maxlength="11"
          :placeholder="canUseWxPhone ? '11位手机号' : '演示手机号'"
          placeholder-class="bind-sheet__placeholder"
        />
        <text
          class="bind-sheet__action"
          :class="{ 'bind-sheet__action--off': manualPhone.length !== 11 || bindingPhone }"
          @click="bindManual"
        >绑定</text>
      </view>
    </view>
  </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--mb-page-bg);
}

.profile-header {
  position: relative;
  padding-bottom: 32rpx;
}

.profile-bg {
  height: 280rpx;
  background: linear-gradient(135deg, var(--mb-hero-dark) 0%, var(--mb-hero-mid) 50%, var(--mb-primary) 100%);
}

.profile-content {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: -80rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 12rpx 40rpx rgba(44, 42, 38, 0.08);

  &--guest {
    flex-wrap: wrap;
  }
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.profile-phone {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--mb-secondary);
  line-height: 1.5;
}

.panel {
  padding: 20rpx 24rpx 48rpx;
}

.staff-panel-tip {
  padding: 20rpx 32rpx 8rpx;
  font-size: 24rpx;
  color: var(--mb-secondary);
  line-height: 1.5;
}

.staff-group {
  margin-top: 20rpx;
}

.legal-group {
  margin-top: 20rpx;
}

.mt-group {
  margin-top: 20rpx;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(44, 42, 38, 0.45);
}

.bind-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 101;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
}

.bind-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.bind-sheet__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2a26;
}

.bind-sheet__close {
  font-size: 28rpx;
  color: #9a958c;
}

.bind-sheet__tip {
  display: block;
  margin-bottom: 28rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #9a958c;
}

.bind-sheet__wx-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--mb-btn-text);
  background: var(--mb-btn-bg);
  border: none;
  border-radius: 44rpx;

  &::after {
    border: none;
  }
}

.bind-sheet__or {
  margin: 24rpx 0 20rpx;
  text-align: center;
  font-size: 22rpx;
  color: #c9c4bc;
}

.bind-sheet__field {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 8rpx 0 24rpx;
  background: #f5f3f0;
  border-radius: 16rpx;
}

.bind-sheet__prefix {
  flex-shrink: 0;
  margin-right: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #4a4640;
}

.bind-sheet__input {
  flex: 1;
  min-width: 0;
  height: 88rpx;
  font-size: 30rpx;
  color: #2c2a26;
}

.bind-sheet__placeholder {
  color: #c9c4bc;
  font-size: 28rpx;
}

.bind-sheet__action {
  flex-shrink: 0;
  padding: 0 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--mb-primary);

  &--off {
    color: #c9c4bc;
  }
}

.guest-hint {
  margin-top: 8rpx;
  padding: 28rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.guest-hint__text {
  display: block;
  font-size: 26rpx;
  color: #9a958c;
}

.guest-hint__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}

.guest-tag {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  color: #b5b0a8;
  background: #f5f3f0;
  border-radius: 999rpx;
}

.logout-wrap {
  margin-top: 48rpx;
  padding: 0 8rpx;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
}

.logout-btn__text {
  font-size: 30rpx;
  font-weight: 600;
  color: inherit;
}
</style>
