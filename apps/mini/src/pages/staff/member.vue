<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '@/api';
import { fenToYuan } from '@/utils/request';
import { useShopStore } from '@/stores/shop';
import { useShopTheme } from '@/hooks/useShopTheme';
import { cardThemeClass, serviceInitial } from '@/utils/booking-ui';

const shopStore = useShopStore();
useShopTheme();
const phone = ref('');
const members = ref<any[]>([]);
const detail = ref<any>(null);
const serviceId = ref<number | null>(null);
const services = ref<any[]>([]);
const templates = ref<any[]>([]);
const openTemplateId = ref<number | null>(null);
const opening = ref(false);
const searching = ref(false);

async function loadServices() {
  services.value = (await api.getServices()) as any[];
}

async function loadTemplates() {
  templates.value = (await api.getCardTemplates()) as any[];
  if (!openTemplateId.value && templates.value.length) {
    openTemplateId.value = Number(templates.value[0].id);
  }
}

onShow(async () => {
  await shopStore.ensureShop();
  await Promise.all([loadServices(), loadTemplates()]);
});

async function search() {
  if (!phone.value) {
    uni.showToast({ title: '请输入手机号', icon: 'none' });
    return;
  }
  searching.value = true;
  try {
    members.value = (await api.searchMember(phone.value)) as any[];
    detail.value = null;
    if (!members.value.length) {
      uni.showToast({ title: '未找到会员', icon: 'none' });
    }
  } finally {
    searching.value = false;
  }
}

async function viewMember(id: number) {
  detail.value = await api.getMember(id);
}

async function manualVerify(cardId: number) {
  if (!detail.value?.phone) return;
  if (!serviceId.value) {
    uni.showToast({ title: '请选择核销项目', icon: 'none' });
    return;
  }
  await api.manualVerify(detail.value.phone, serviceId.value, cardId);
  uni.showToast({ title: '核销成功', icon: 'success' });
  detail.value = await api.getMember(detail.value.id);
}

function cardRemainText(card: any) {
  if (card.deductMode === 'balance') return `余 ¥${fenToYuan(card.balance)}`;
  if (card.deductMode === 'period') return '周期有效';
  return `余 ${card.remainTimes} 次`;
}

async function openCard() {
  if (!detail.value?.id || !openTemplateId.value) {
    uni.showToast({ title: '请选择卡种', icon: 'none' });
    return;
  }
  opening.value = true;
  try {
    await api.openCard(detail.value.id, openTemplateId.value, '店员线下开卡');
    uni.showToast({ title: '开卡成功', icon: 'success' });
    detail.value = await api.getMember(detail.value.id);
  } finally {
    opening.value = false;
  }
}
</script>

<template>
  <shop-theme-root>
    <view class="staff-page staff-page--dock">
      <staff-header title="会员查询" subtitle="手机号查会员 · 手工核销" />

      <view class="staff-body">
        <view class="staff-card search-card">
          <view class="search-card__row">
            <text class="search-card__icon">🔍</text>
            <input
              v-model="phone"
              class="search-card__input"
              type="number"
              maxlength="11"
              placeholder="输入会员手机号"
              @confirm="search"
            />
          </view>
          <theme-button block round :loading="searching" label="查询会员" @click="search" />
        </view>

        <view v-if="members.length && !detail" class="section-title">查询结果</view>
        <view
          v-for="m in members"
          :key="m.id"
          class="member-row staff-card"
          @click="viewMember(m.id)"
        >
          <view class="staff-avatar">{{ serviceInitial(m.nickname) }}</view>
          <view class="member-row__info">
            <text class="member-row__name">{{ m.nickname }}</text>
            <text class="member-row__phone">{{ m.phone }}</text>
          </view>
          <text class="member-row__arrow">›</text>
        </view>

        <view v-if="detail" class="detail-panel">
          <view class="staff-card member-profile">
            <view class="staff-avatar member-profile__avatar">{{ serviceInitial(detail.nickname) }}</view>
            <view class="member-profile__info">
              <text class="member-profile__name">{{ detail.nickname }}</text>
              <text class="member-profile__phone">{{ detail.phone }}</text>
            </view>
          </view>

          <view class="staff-card">
            <staff-service-picker v-model="serviceId" :services="services" />
          </view>

          <view class="section-title">线下开卡</view>
          <view class="staff-card open-card">
            <picker
              :range="templates"
              range-key="name"
              :value="Math.max(0, templates.findIndex((t) => Number(t.id) === openTemplateId))"
              @change="openTemplateId = Number(templates[Number($event.detail.value)]?.id)"
            >
              <view class="open-card__picker">
                {{ templates.find((t) => Number(t.id) === openTemplateId)?.name || '选择卡种' }}
              </view>
            </picker>
            <theme-button
              size="small"
              round
              :loading="opening"
              :disabled="!templates.length"
              label="确认开卡"
              @click="openCard"
            />
          </view>

          <view class="section-title">会员卡</view>
          <empty-tip v-if="!detail.cards?.length" icon="💳" tip="该会员暂无可用会员卡" />
          <view
            v-for="card in detail.cards"
            :key="card.id"
            class="card-item staff-card"
            :class="cardThemeClass(card.deductMode)"
          >
            <view class="card-item__main">
              <text class="card-item__name">{{ card.cardNo || card.name }}</text>
              <text class="card-item__remain">{{ cardRemainText(card) }}</text>
            </view>
            <theme-button size="small" round label="手工核销" @click.stop="manualVerify(card.id)" />
          </view>
        </view>
      </view>
      <staff-dock active="member" />
    </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
@import '@/styles/staff.scss';

.search-card__icon {
  font-size: 32rpx;
  flex-shrink: 0;
}

.search-card__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 20rpx;
  background: var(--mb-page-bg);
  border-radius: 14rpx;
  margin-bottom: 24rpx;
}

.member-row__arrow {
  font-size: 36rpx;
  color: #c4c0b8;
}

.search-card__input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  color: var(--mb-title);
}

.section-title {
  margin: 8rpx 4rpx 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--mb-secondary);
}

.member-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
}

.member-row__info {
  flex: 1;
  min-width: 0;
}

.member-row__name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.member-row__phone {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--mb-secondary);
}

.member-profile {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.member-profile__avatar {
  width: 100rpx;
  height: 100rpx;
  font-size: 40rpx;
}

.member-profile__name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.member-profile__phone {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--mb-secondary);
}

.staff-picker__value {
  color: var(--mb-title);
  font-weight: 600;
}

.card-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  border-left: 8rpx solid var(--mb-primary);
}

.card-item.card--times {
  border-left-color: #3b82f6;
}

.card-item.card--period {
  border-left-color: #8b5cf6;
}

.card-item__name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--mb-title);
}

.card-item__remain {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--mb-secondary);
}

.open-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.open-card__picker {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--mb-title);
}
</style>
