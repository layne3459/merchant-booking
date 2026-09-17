import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api';
import { devWxLoginCode, hasValidWxAppId } from '@/config';

export const useUserStore = defineStore('user', () => {
  const token = ref((uni.getStorageSync('token') as string) || '');
  const profile = ref<Record<string, unknown> | null>(
    uni.getStorageSync('profile') ? JSON.parse(uni.getStorageSync('profile') as string) : null,
  );
  const mode = ref<'customer' | 'staff'>(
    (uni.getStorageSync('mode') as 'customer' | 'staff') || 'customer',
  );
  const manualLoggedOut = ref(uni.getStorageSync('manualLoggedOut') === '1');

  const isLoggedIn = computed(() => !!token.value);

  const staffProfile = computed(() => {
    const staff = profile.value?.staff;
    if (!staff || typeof staff !== 'object') return null;
    return staff as Record<string, unknown>;
  });

  /** 绑定手机号与员工档案一致，或已处于员工登录态 */
  const canAccessStaffWorkbench = computed(
    () => mode.value === 'staff' || (!!staffProfile.value && isLoggedIn.value),
  );

  function applyMemberProfile(member: Record<string, unknown>) {
    if (mode.value !== 'customer') return;
    profile.value = member;
    uni.setStorageSync('profile', JSON.stringify(member));
    // 员工端备份会话同步更新，避免退出员工端后恢复到未绑定手机号的旧资料
    if (uni.getStorageSync('customerToken')) {
      uni.setStorageSync('customerProfile', JSON.stringify(member));
    }
  }

  function setAuth(t: string, info: Record<string, unknown>, userMode: 'customer' | 'staff') {
    token.value = t;
    profile.value = info;
    mode.value = userMode;
    manualLoggedOut.value = false;
    uni.setStorageSync('token', t);
    uni.setStorageSync('profile', JSON.stringify(info));
    uni.setStorageSync('mode', userMode);
    uni.removeStorageSync('manualLoggedOut');
  }

  function backupCustomerSession() {
    if (mode.value !== 'customer' || !token.value) return;
    uni.setStorageSync('customerToken', token.value);
    uni.setStorageSync('customerProfile', JSON.stringify(profile.value));
  }

  function clearCustomerSessionBackup() {
    uni.removeStorageSync('customerToken');
    uni.removeStorageSync('customerProfile');
  }

  function restoreCustomerSessionFromBackup(): boolean {
    const savedToken = uni.getStorageSync('customerToken') as string;
    const savedProfile = uni.getStorageSync('customerProfile') as string;
    if (!savedToken || !savedProfile) return false;
    setAuth(savedToken, JSON.parse(savedProfile) as Record<string, unknown>, 'customer');
    clearCustomerSessionBackup();
    return true;
  }

  function logout() {
    token.value = '';
    profile.value = null;
    mode.value = 'customer';
    manualLoggedOut.value = true;
    uni.removeStorageSync('token');
    uni.removeStorageSync('profile');
    uni.removeStorageSync('mode');
    clearCustomerSessionBackup();
    uni.setStorageSync('manualLoggedOut', '1');
  }

  async function wxLoginCode(): Promise<string> {
    // 未配置 AppID 时跳过 uni.login，避免开发者工具报 webapi_getwxaasyncsecinfo:fail
    if (!hasValidWxAppId()) {
      return devWxLoginCode();
    }
    // 本地开发时后端多为占位微信配置，uni.login 每次 code 不同会导致会员身份变化
    if (import.meta.env.DEV) {
      return devWxLoginCode();
    }
    return new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (res) => {
          if (res.code) resolve(res.code);
          else reject(new Error('未获取到登录 code'));
        },
        fail: () => resolve(devWxLoginCode()),
      });
    });
  }

  let loginPromise: Promise<boolean> | null = null;

  async function doWxLogin(): Promise<boolean> {
    try {
      const code = await wxLoginCode();
      const data = await api.wxLogin(code);
      setAuth(data.token, data.member as Record<string, unknown>, 'customer');
      return true;
    } catch (err) {
      console.warn('[auth] wx login failed', err);
      return false;
    }
  }

  /** 用户主动登录（清除退出标记后走微信登录） */
  async function login(): Promise<boolean> {
    manualLoggedOut.value = false;
    uni.removeStorageSync('manualLoggedOut');
    const ok = await doWxLogin();
    if (!ok) {
      uni.showToast({ title: '登录失败', icon: 'none' });
    }
    return ok;
  }

  /** 刷新会员资料，同步员工身份识别 */
  async function refreshProfile(): Promise<void> {
    if (!token.value || mode.value === 'staff') return;
    try {
      const member = await api.getProfile();
      applyMemberProfile(member);
    } catch (err) {
      console.warn('[auth] refresh profile failed', err);
    }
  }

  /** 进入员工工作台（需已绑定员工手机号） */
  async function enterStaffMode(): Promise<boolean> {
    if (mode.value === 'staff') return true;
    if (!staffProfile.value) {
      uni.showToast({ title: '当前账号不是本店员工', icon: 'none' });
      return false;
    }
    try {
      backupCustomerSession();
      const data = await api.staffEnter();
      setAuth(data.token, data.staff as Record<string, unknown>, 'staff');
      return true;
    } catch (err) {
      console.warn('[auth] enter staff mode failed', err);
      uni.showToast({ title: '进入员工端失败', icon: 'none' });
      return false;
    }
  }

  /** 退出员工端，恢复顾客身份 */
  async function exitStaffMode(): Promise<boolean> {
    if (mode.value !== 'staff') return true;
    if (restoreCustomerSessionFromBackup()) return true;
    manualLoggedOut.value = false;
    uni.removeStorageSync('manualLoggedOut');
    const ok = await doWxLogin();
    if (!ok) {
      uni.showToast({ title: '返回顾客端失败，请重新登录', icon: 'none' });
    }
    return ok;
  }

  /** 静默登录；用户主动退出后不再自动登录，返回是否已登录 */
  async function ensureLogin(): Promise<boolean> {
    if (token.value) return true;
    if (manualLoggedOut.value) return false;
    if (!loginPromise) {
      loginPromise = doWxLogin().finally(() => {
        loginPromise = null;
      });
    }
    await loginPromise;
    return !!token.value;
  }

  async function bindPhoneByWx(e: { detail?: { code?: string; errMsg?: string } }) {
    const errMsg = e.detail?.errMsg || '';
    if (errMsg && !errMsg.includes('ok')) {
      if (errMsg.includes('deny') || errMsg.includes('cancel')) {
        uni.showToast({ title: '已取消授权', icon: 'none' });
      } else if (errMsg.includes('短信验证') || errMsg.includes('需要进行验证')) {
        uni.showModal({
          title: '无法获取手机号',
          content:
            '当前微信账号的手机号尚未完成短信验证。\n\n请打开微信 → 我 → 设置 → 账号与安全 → 手机号，完成验证后再试；或直接在下方的手动绑定中输入手机号。',
          showCancel: false,
        });
      } else {
        uni.showToast({ title: '授权失败，可改用手动绑定', icon: 'none' });
      }
      return;
    }
    const phoneCode = e.detail?.code;
    if (!phoneCode) {
      uni.showToast({ title: '需要授权手机号', icon: 'none' });
      return;
    }
    try {
      const member: any = await api.bindWxPhone(phoneCode);
      applyMemberProfile(member);
      uni.showToast({ title: '绑定成功', icon: 'success' });
    } catch (err: any) {
      console.warn('[auth] bind wx phone failed', err);
      const msg = String(err?.message || '');
      if (msg.includes('短信验证') || msg.includes('手动绑定')) {
        uni.showModal({ title: '绑定失败', content: msg, showCancel: false });
      } else {
        uni.showToast({ title: msg || '绑定失败，请改用手动绑定', icon: 'none' });
      }
    }
  }

  async function bindPhoneManual(phone: string) {
    const normalized = phone.trim();
    if (!/^1\d{10}$/.test(normalized)) {
      uni.showToast({ title: '请输入11位手机号', icon: 'none' });
      return;
    }
    try {
      const member: any = await api.bindPhone(normalized);
      applyMemberProfile(member);
      uni.showToast({ title: '绑定成功', icon: 'success' });
    } catch (err) {
      console.warn('[auth] bind phone failed', err);
      uni.showToast({ title: '绑定失败，请稍后重试', icon: 'none' });
    }
  }

  return {
    token,
    profile,
    mode,
    manualLoggedOut,
    isLoggedIn,
    staffProfile,
    canAccessStaffWorkbench,
    setAuth,
    logout,
    login,
    ensureLogin,
    refreshProfile,
    enterStaffMode,
    exitStaffMode,
    bindPhoneByWx,
    bindPhoneManual,
  };
});
