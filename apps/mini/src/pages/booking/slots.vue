<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { flattenSlots, listStaffFromSlots, type FlatSlot } from '@/utils/slots';
import {
  addDays,
  availabilityStatusText,
  dateDayNum,
  dateWeekLabel,
  formatLocalDate,
  type DateAvailability,
  type DateOption,
} from '@/utils/date';
import { api } from '@/api';
import { getApiBase } from '@/config';
import { withLoading, request } from '@/utils/request';
import { ensureDemoShop } from '@/utils/shop';
import { useShopStore } from '@/stores/shop';
import { useShopTheme } from '@/hooks/useShopTheme';

const shopStore = useShopStore();
const { pageStyleStr, primaryColor } = useShopTheme();

const serviceId = ref(0);
const serviceName = ref('');
const bookingId = ref(0);
const isReschedule = ref(false);
const selectedDate = ref('');
const staffId = ref(0);
const staffList = ref<Array<{ id: number; name: string }>>([]);
const allSlots = ref<FlatSlot[]>([]);
const dateOptions = ref<DateOption[]>([]);
const selectedKey = ref('');
const loadingDates = ref(false);
const loadingSlots = ref(false);
const scrollIntoDate = ref('');
const loadError = ref('');

const today = formatLocalDate(new Date());

const staffOptions = computed(() => [{ id: 0, name: '全部技师' }, ...staffList.value]);
const staffLabel = computed(
  () => staffOptions.value.find((s) => s.id === staffId.value)?.name || '全部技师',
);
const staffColumns = computed(() => staffOptions.value.map((s) => s.name));

const slots = computed(() =>
  staffId.value ? allSlots.value.filter((s) => s.staffId === staffId.value) : allSlots.value,
);

const availableCount = computed(() => slots.value.filter((s) => s.available).length);
const hasBookableDate = computed(() => dateOptions.value.some((d) => d.status === 'available'));
const currentDateInfo = computed(() => dateOptions.value.find((d) => d.date === selectedDate.value));
const availabilityDays = computed(() => shopStore.miniDisplay.availabilityDays);
const slotsEmptyTip = computed(() => shopStore.miniDisplay.slotsEmptyTip);

onLoad((query) => {
  serviceId.value = Number(query?.serviceId || 0);
  bookingId.value = Number(query?.bookingId || 0);
  isReschedule.value = query?.reschedule === '1';
  initPage();
});

async function initPage() {
  ensureDemoShop();
  await shopStore.ensureShop();
  await loadAvailability(true);
}

function normalizeAvailability(item: DateAvailability): DateAvailability {
  if (item.status) return item;
  if (item.availableCount > 0) return { ...item, status: 'available' };
  return { ...item, status: 'rest' };
}

async function checkApiHealth() {
  try {
    await request('/health', { auth: false, silent: true });
    return true;
  } catch {
    return false;
  }
}

async function fetchAvailabilityList(): Promise<DateAvailability[]> {
  const days = availabilityDays.value;
  try {
    const list = (await api.getAvailability({
      serviceId: serviceId.value,
      from: today,
      days,
      ...(staffId.value ? { staffId: staffId.value } : {}),
    })) as DateAvailability[];
    if (Array.isArray(list) && list.length > 0) {
      return list.map(normalizeAvailability);
    }
  } catch {
    // 走下方逐日查询兜底
  }

  const results: DateAvailability[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    try {
      const groups: any[] = await api.getSlots(
        {
          serviceId: serviceId.value,
          date,
          ...(staffId.value ? { staffId: staffId.value } : {}),
        },
        { silent: true },
      );
      const flat = flattenSlots(groups);
      const count = flat.filter((s) => s.available).length;
      const status = groups.length === 0 ? 'rest' : count > 0 ? 'available' : 'full';
      results.push({ date, availableCount: count, status });
    } catch {
      results.push({ date, availableCount: 0, status: 'rest' });
    }
  }
  return results;
}

async function loadAvailability(autoPick = false) {
  loadingDates.value = true;
  loadError.value = '';
  try {
    if (!serviceId.value) {
      loadError.value = '服务项目无效，请返回重新选择';
      dateOptions.value = [];
      return;
    }

    const services = (await api.getServices({ silent: true })) as Array<{ id: number; name: string }>;
    const service = services.find((s) => Number(s.id) === serviceId.value);
    if (!service) {
      loadError.value = `项目不存在（#${serviceId.value}），请从首页重新选择`;
      dateOptions.value = [];
      return;
    }
    serviceName.value = service.name;

    const list = await fetchAvailabilityList();
    dateOptions.value = list.map((item) => ({
      ...item,
      weekLabel: dateWeekLabel(item.date, today),
      dayNum: dateDayNum(item.date),
    }));

    if (!dateOptions.value.length) {
      loadError.value = '未能加载可约日期';
      return;
    }

    const allRest = dateOptions.value.every((d) => d.status === 'rest');
    if (allRest) {
      const apiOk = await checkApiHealth();
      if (!apiOk) {
        loadError.value =
          '无法连接本地 API。请先运行 pnpm dev:api，并在开发者工具勾选「不校验合法域名」';
        dateOptions.value = [];
        return;
      }
      loadError.value = '当前项目暂无排班，请返回首页重新选择服务';
      return;
    }

    if (autoPick) {
      const first = dateOptions.value.find((d) => d.status === 'available');
      if (first) {
        await pickDate(first.date, false);
      } else {
        selectedDate.value = '';
        allSlots.value = [];
        staffList.value = [];
      }
    } else if (selectedDate.value) {
      const current = dateOptions.value.find((d) => d.date === selectedDate.value);
      if (!current || current.status !== 'available') {
        const first = dateOptions.value.find((d) => d.status === 'available');
        if (first) {
          await pickDate(first.date, false);
        } else {
          selectedDate.value = '';
          allSlots.value = [];
        }
      } else {
        await loadSlots();
      }
    }
  } catch (err) {
    const msg = String((err as { message?: string; errMsg?: string })?.message || (err as { errMsg?: string })?.errMsg || '');
    const isNetwork = msg.includes('fail') || msg.includes('request');
    loadError.value = isNetwork
      ? `无法连接 API（${getApiBase()}），请确认已运行 pnpm dev:api，并在开发者工具勾选「不校验合法域名」`
      : msg || '加载失败，请稍后重试';
    dateOptions.value = [];
  } finally {
    loadingDates.value = false;
  }
}

async function pickDate(date: string, checkStatus = true) {
  const item = dateOptions.value.find((d) => d.date === date);
  if (checkStatus && item && item.status !== 'available') {
    const tip =
      item.status === 'rest' ? '该日技师休息，请选择其他日期' : '该日已约满，请选择其他日期';
    uni.showToast({ title: tip, icon: 'none' });
    return;
  }
  selectedDate.value = date;
  scrollIntoDate.value = `date-${date}`;
  selectedKey.value = '';
  await loadSlots();
}

async function loadSlots() {
  if (!selectedDate.value) return;
  loadingSlots.value = true;
  try {
    const groups: any[] = await api.getSlots({
      serviceId: serviceId.value,
      date: selectedDate.value,
      ...(staffId.value ? { staffId: staffId.value } : {}),
    });
    staffList.value = listStaffFromSlots(groups);
    allSlots.value = flattenSlots(groups);
    selectedKey.value = '';
  } catch {
    allSlots.value = [];
    staffList.value = [];
    uni.showToast({ title: '时段加载失败，请稍后重试', icon: 'none' });
  } finally {
    loadingSlots.value = false;
  }
}

async function onStaffConfirm({ value }: { value: string }) {
  const name = Array.isArray(value) ? value[0] : value;
  staffId.value = staffOptions.value.find((s) => s.name === name)?.id ?? 0;
  await loadAvailability(false);
}

function selectSlot(slot: FlatSlot) {
  if (!slot.available) {
    uni.showToast({ title: '该时段已满', icon: 'none' });
    return;
  }
  selectedKey.value = slot.key;
}

async function next() {
  const slot = allSlots.value.find((s) => s.key === selectedKey.value);
  if (!slot) {
    uni.showToast({ title: '请选择时段', icon: 'none' });
    return;
  }

  if (isReschedule.value) {
    await withLoading(async () => {
      await api.rescheduleBooking(bookingId.value, {
        bookDate: selectedDate.value,
        timeSlot: slot.timeSlot,
        staffId: slot.staffId,
      });
    }, '提交中');
    uni.showToast({ title: '改约成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }

  uni.navigateTo({
    url: `/pages/booking/confirm?serviceId=${serviceId.value}&date=${selectedDate.value}&timeSlot=${slot.timeSlot}&staffId=${slot.staffId}&serviceName=${encodeURIComponent(serviceName.value)}&staffName=${encodeURIComponent(slot.staffName)}`,
  });
}

function statusText(status: DateAvailability['status']) {
  return availabilityStatusText(status);
}
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view class="page">
    <view class="panel">
      <view class="panel-head">
        <text class="panel-title">选择日期</text>
        <text class="panel-sub">未来 {{ availabilityDays }} 天</text>
      </view>

      <view v-if="loadingDates" class="loading-wrap">
        <wd-loading />
      </view>

      <view v-else-if="loadError" class="load-error">
        <text class="load-error__text">{{ loadError }}</text>
        <theme-button size="small" round @click="loadAvailability(true)">重新加载</theme-button>
      </view>

      <view v-else class="date-grid">
        <view
          v-for="item in dateOptions"
          :id="`date-${item.date}`"
          :key="item.date"
          class="date-card"
          :class="{
            'date-card--active': selectedDate === item.date,
            'date-card--available': item.status === 'available',
            'date-card--full': item.status === 'full',
            'date-card--rest': item.status === 'rest',
          }"
          @click="pickDate(item.date)"
        >
          <text class="date-card__week">{{ item.weekLabel }}</text>
          <text class="date-card__day">{{ item.dayNum }}</text>
          <text class="date-card__status">{{ statusText(item.status) }}</text>
          <text v-if="item.status === 'available'" class="date-card__count">{{ item.availableCount }}个</text>
        </view>
      </view>

      <view class="legend">
        <view class="legend-item"><view class="legend-dot legend-dot--available" />可约</view>
        <view class="legend-item"><view class="legend-dot legend-dot--full" />约满</view>
        <view class="legend-item"><view class="legend-dot legend-dot--rest" />休息</view>
      </view>
    </view>

    <wd-cell-group v-if="staffList.length" border custom-class="staff-group">
      <wd-picker
        :columns="staffColumns"
        label="选择技师"
        :model-value="staffLabel"
        @confirm="onStaffConfirm"
      />
    </wd-cell-group>

    <view class="section">
      <view class="section-head">
        <text class="section-title">选择时段</text>
        <text v-if="selectedDate && currentDateInfo?.status === 'available'" class="section-sub">
          {{ selectedDate }} · 可选 {{ availableCount }} 个
        </text>
      </view>

      <empty-tip
        v-if="!loadingDates && !hasBookableDate"
        icon="📅"
        :tip="slotsEmptyTip"
      />

      <view v-else-if="!selectedDate" class="loading-wrap">
        <wd-loading />
      </view>

      <view v-else-if="loadingSlots" class="loading-wrap">
        <wd-loading />
      </view>

      <empty-tip
        v-else-if="!availableCount"
        icon="🕐"
        tip="该日暂无可选时段，请换一天"
      />

      <view v-else class="slot-grid">
        <view
          v-for="slot in slots"
          :key="slot.key"
          class="slot-item"
          :class="{
            'slot-item--active': selectedKey === slot.key,
            'slot-item--disabled': !slot.available,
          }"
          @click="selectSlot(slot)"
        >
          <text class="slot-time">{{ slot.timeSlot }}</text>
          <text class="slot-staff">{{ slot.staffName }}</text>
          <wd-tag v-if="!slot.available" type="danger" size="small" custom-class="slot-tag">已满</wd-tag>
        </view>
      </view>
    </view>

    <view class="footer-bar">
      <theme-button
        block
        size="large"
        :label="isReschedule ? '确认改约' : '下一步'"
        :disabled="!selectedKey"
        @click="next"
      />
    </view>
    <view class="footer-spacer" />
  </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 0;
  background: #f5f3f0;
  box-sizing: border-box;
}

.panel {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 0 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(44, 42, 38, 0.04);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28rpx 20rpx;
}

.panel-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2a26;
}

.panel-sub {
  font-size: 24rpx;
  color: #9a958c;
}

.date-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 0 28rpx 8rpx;
}

.load-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 32rpx 28rpx;
}

.load-error__text {
  font-size: 26rpx;
  color: #9a958c;
  text-align: center;
}

.date-card {
  width: calc((100% - 48rpx) / 4);
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx 16rpx;
  border-radius: 16rpx;
  background: #f8f6f3;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}

.date-card--active {
  border-color: #a8845a;
  background: #faf6f0;
  box-shadow: 0 8rpx 24rpx rgba(168, 132, 90, 0.15);
}

.date-card--full,
.date-card--rest {
  opacity: 0.55;
}

.date-card__week {
  font-size: 22rpx;
  color: #9a958c;
}

.date-card__day {
  margin-top: 8rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2a26;
  line-height: 1;
}

.date-card__status {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #9a958c;
}

.date-card--available .date-card__status {
  color: #6b8f5e;
}

.date-card--full .date-card__status {
  color: #c47b6a;
}

.date-card__count {
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #a8845a;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 28rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0ebe3;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: #9a958c;
}

.legend-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.legend-dot--available {
  background: #6b8f5e;
}

.legend-dot--full {
  background: #c47b6a;
}

.legend-dot--rest {
  background: #c4bdb2;
}

.staff-group {
  margin-top: 20rpx;
}

.section {
  margin-top: 24rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 0 4rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2a26;
}

.section-sub {
  font-size: 24rpx;
  color: #9a958c;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
}

.slot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.slot-item {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  box-sizing: border-box;
  border: 2rpx solid transparent;
  position: relative;
  box-shadow: 0 4rpx 16rpx rgba(44, 42, 38, 0.04);
}

.slot-item--active {
  border-color: #a8845a;
  background: #faf6f0;
}

.slot-item--disabled {
  opacity: 0.5;
}

.slot-time {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2a26;
}

.slot-staff {
  display: block;
  font-size: 22rpx;
  color: #9a958c;
  margin-top: 8rpx;
}

.slot-tag {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
}

.footer-spacer {
  height: 140rpx;
}
</style>
