<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSvgIcon } from '@/hooks/common/icon';
import { useEcharts } from '@/hooks/common/echarts';
import { adminApi } from '@/api';
import { bookingStatusMap, bookingStatusType, fenToYuan, formatMemberNickname, formatMemberPhone } from '@/utils/format';

const router = useRouter();
const { SvgIconVNode } = useSvgIcon();

const tab = ref<'daily' | 'monthly'>('daily');
const daily = ref<Record<string, number | string>>({});
const monthly = ref<Record<string, number | string>>({});
const trendData = ref<Array<{ date: string; label: string; bookingCount: number; revenue: number; verifyCount: number }>>([]);
const todayBookings = ref<any[]>([]);
const recentMembers = ref<any[]>([]);
const shop = ref<any>(null);
const loading = ref(true);

const slotEntries = computed(() => {
  const map = new Map<string, number>();
  todayBookings.value.forEach((b) => {
    const slot = b.timeSlot || '未知';
    map.set(slot, (map.get(slot) || 0) + 1);
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
});

function buildTrendChartOption() {
  const labels = trendData.value.map((d) => d.label);
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['预约数', '实收(元)', '核销次数'],
      bottom: 0,
    },
    grid: {
      left: '2%',
      right: '2%',
      bottom: '14%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisTick: { alignWithLabel: true },
    },
    yAxis: [
      { type: 'value', name: '次数', minInterval: 1 },
      { type: 'value', name: '元', splitLine: { show: false } },
    ],
    series: [
      {
        name: '预约数',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color: '#2080f0', borderRadius: [4, 4, 0, 0] },
        data: trendData.value.map((d) => d.bookingCount),
      },
      {
        name: '实收(元)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        itemStyle: { color: '#18a058' },
        data: trendData.value.map((d) => Number(fenToYuan(d.revenue))),
      },
      {
        name: '核销次数',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#7c3aed' },
        data: trendData.value.map((d) => d.verifyCount),
      },
    ],
  };
}

function buildSlotChartOption() {
  const entries = slotEntries.value;
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        return `${item.name}<br/>预约 ${item.value} 单`;
      },
    },
    grid: {
      left: '2%',
      right: '6%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: entries.map(([slot]) => slot),
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: entries.map(([, count]) => count),
        barMaxWidth: 18,
        itemStyle: { color: '#a8845a', borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
}

const { domRef: trendChartRef, updateOptions: updateTrendChart } = useEcharts(() => buildTrendChartOption(), {
  onRender: () => {},
});

const { domRef: slotChartRef, updateOptions: updateSlotChart } = useEcharts(() => buildSlotChartOption(), {
  onRender: () => {},
});

async function refreshCharts() {
  await nextTick();
  const apply = () => {
    updateTrendChart(() => buildTrendChartOption() as any);
    if (slotEntries.value.length) {
      updateSlotChart(() => buildSlotChartOption() as any);
    }
  };
  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 120);
}

watch(trendData, () => refreshCharts(), { deep: true });
watch(slotEntries, async () => {
  await nextTick();
  if (slotEntries.value.length) {
    updateSlotChart(() => buildSlotChartOption() as any);
  }
}, { deep: true });

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const stats = computed(() => {
  const data = tab.value === 'daily' ? daily.value : monthly.value;
  return [
    {
      label: '预约数',
      value: data.bookingCount ?? 0,
      icon: 'mdi:calendar-clock',
      color: '#2080f0',
      bg: 'rgba(32, 128, 240, 0.1)',
    },
    {
      label: '实收金额',
      value: `¥${fenToYuan(Number(data.revenue ?? 0))}`,
      icon: 'mdi:cash-multiple',
      color: '#18a058',
      bg: 'rgba(24, 160, 88, 0.1)',
    },
    {
      label: '核销次数',
      value: data.verifyCount ?? 0,
      icon: 'mdi:check-decagram',
      color: '#7c3aed',
      bg: 'rgba(124, 58, 237, 0.1)',
    },
    {
      label: tab.value === 'daily' ? '今日新会员' : '本月新会员',
      value: data.newMemberCount ?? 0,
      icon: 'mdi:account-plus-outline',
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.1)',
    },
  ];
});

const quickLinks = [
  { label: '预约管理', path: '/bookings', icon: 'mdi:calendar-clock', color: '#2080f0', bg: 'rgba(32, 128, 240, 0.1)' },
  { label: '会员管理', path: '/members', icon: 'mdi:account-group', color: '#18a058', bg: 'rgba(24, 160, 88, 0.1)' },
  { label: '项目管理', path: '/services', icon: 'mdi:briefcase-outline', color: '#a8845a', bg: 'rgba(168, 132, 90, 0.12)' },
  { label: '员工管理', path: '/staff', icon: 'mdi:account-tie', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' },
  { label: '排班管理', path: '/schedules', icon: 'mdi:calendar-month', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  { label: '卡种管理', path: '/card-templates', icon: 'mdi:card-bulleted', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
  { label: '流水查询', path: '/transactions', icon: 'mdi:file-document-outline', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
  { label: '店铺设置', path: '/settings', icon: 'mdi:cog', color: '#f0a020', bg: 'rgba(240, 160, 32, 0.1)' },
];

const sortedTodayBookings = computed(() =>
  [...todayBookings.value].sort((a, b) => String(a.timeSlot).localeCompare(String(b.timeSlot))),
);

const wxStatus = computed(() => shop.value?.wxStatus);

const setupTodos = computed(() => {
  const items: string[] = [];
  const wx = wxStatus.value;
  if (wx && !wx.miniReady) items.push('配置小程序 AppID 与 AppSecret');
  if (wx && !wx.payReady) items.push('完善微信支付配置（未配时将模拟已付款）');
  if (!todayBookings.value.length && !loading.value) items.push('今日暂无预约，可检查排班与项目设置');
  return items;
});

function memberName(row: any) {
  return row.member?.nickname || row.member?.phone || '顾客';
}

onMounted(async () => {
  loading.value = true;
  const today = todayStr();
  try {
    const [dailyRes, monthlyRes, trendRes, bookingRes, memberRes, shopRes] = await Promise.all([
      adminApi.dailyReport(),
      adminApi.monthlyReport(),
      adminApi.trendReport(7),
      adminApi.listBookings({ page: 1, pageSize: 20, dateFrom: today, dateTo: today }),
      adminApi.listMembers({ page: 1, pageSize: 5 }),
      adminApi.getShop(),
    ]);
    daily.value = dailyRes as Record<string, number>;
    monthly.value = monthlyRes as Record<string, number>;
    trendData.value = trendRes || [];
    todayBookings.value = bookingRes.list || [];
    recentMembers.value = memberRes.list || [];
    shop.value = shopRes;
    await refreshCharts();
  } finally {
    loading.value = false;
    await refreshCharts();
  }
});
</script>

<template>
  <div class="dashboard">
    <ElCard shadow="never" class="dashboard-card">
      <div class="dashboard-card__head">
        <h3 class="dashboard-card__title">{{ shop?.name ? `${shop.name} · ` : '' }}经营概览</h3>
        <ElRadioGroup v-model="tab" size="default">
          <ElRadioButton value="daily">今日</ElRadioButton>
          <ElRadioButton value="monthly">本月</ElRadioButton>
        </ElRadioGroup>
      </div>

      <ElRow :gutter="16" class="mt-20px">
        <ElCol v-for="(item, i) in stats" :key="i" :xs="24" :sm="12" :lg="6">
          <div class="stat-card">
            <div class="stat-card__icon" :style="{ background: item.bg, color: item.color }">
              <component :is="SvgIconVNode({ icon: item.icon, fontSize: 26 })" />
            </div>
            <div class="stat-card__body">
              <div class="stat-card__value">{{ item.value }}</div>
              <div class="stat-card__label">{{ item.label }}</div>
            </div>
          </div>
        </ElCol>
      </ElRow>
    </ElCard>

    <ElRow :gutter="16" class="mt-16px">
      <ElCol :xs="24" :lg="16">
        <ElCard shadow="never" class="dashboard-card">
          <div class="dashboard-card__head">
            <h3 class="dashboard-card__title">近 7 日趋势</h3>
          </div>
          <div ref="trendChartRef" class="chart-box chart-box--trend" />
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="8">
        <ElCard shadow="never" class="dashboard-card">
          <div class="dashboard-card__head">
            <h3 class="dashboard-card__title">今日时段分布</h3>
            <span class="chart-sub">各时段预约单量</span>
          </div>
          <div v-loading="loading" class="chart-box chart-box--slot">
            <ElEmpty
              v-if="!loading && !slotEntries.length"
              description="今日暂无预约"
              :image-size="72"
            />
            <div v-else ref="slotChartRef" class="chart-box__canvas" />
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="mt-16px">
      <ElCol :xs="24" :lg="16">
        <ElCard shadow="never" class="dashboard-card dashboard-card--fill">
          <div class="dashboard-card__head">
            <h3 class="dashboard-card__title">今日预约</h3>
            <ElButton text type="primary" @click="router.push('/bookings')">全部预约</ElButton>
          </div>
          <ElTable v-loading="loading" :data="sortedTodayBookings" stripe empty-text="今日暂无预约">
            <ElTableColumn label="时段" prop="timeSlot" width="80" />
            <ElTableColumn label="项目" min-width="120">
              <template #default="{ row }">{{ row.service?.name || '—' }}</template>
            </ElTableColumn>
            <ElTableColumn label="顾客" min-width="100">
              <template #default="{ row }">{{ memberName(row) }}</template>
            </ElTableColumn>
            <ElTableColumn label="技师" width="90">
              <template #default="{ row }">{{ row.staff?.name || '—' }}</template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="90">
              <template #default="{ row }">
                <ElTag :type="bookingStatusType[row.status]" size="small" effect="light">
                  {{ bookingStatusMap[row.status] }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="8">
        <ElCard shadow="never" class="dashboard-card">
          <h3 class="dashboard-card__title mb-12px">系统状态</h3>
          <div v-if="wxStatus" class="status-list">
            <div class="status-item">
              <span>小程序登录</span>
              <ElTag :type="wxStatus.miniReady ? 'success' : 'warning'" size="small">
                {{ wxStatus.miniReady ? '已就绪' : '未配置' }}
              </ElTag>
            </div>
            <div class="status-item">
              <span>微信支付</span>
              <ElTag :type="wxStatus.payReady ? 'success' : 'info'" size="small">
                {{ wxStatus.payReady ? '已就绪' : '模拟付款' }}
              </ElTag>
            </div>
          </div>
          <ElButton class="mt-12px" @click="router.push('/settings')">去配置</ElButton>

          <ElDivider />

          <h3 class="dashboard-card__title mb-12px">运营提示</h3>
          <div v-if="setupTodos.length" class="todo-list">
            <div v-for="(tip, idx) in setupTodos" :key="idx" class="todo-item">
              <component
                :is="SvgIconVNode({ icon: 'mdi:information-outline', fontSize: 16 })"
                class="todo-item__icon"
              />
              <span>{{ tip }}</span>
            </div>
          </div>
          <p v-else class="todo-empty">一切正常，继续保持</p>
        </ElCard>

        <ElCard shadow="never" class="dashboard-card mt-16px">
          <div class="dashboard-card__head">
            <h3 class="dashboard-card__title">新会员</h3>
            <ElButton text type="primary" @click="router.push('/members')">全部</ElButton>
          </div>
          <ElTable v-loading="loading" :data="recentMembers" size="small" empty-text="暂无会员">
            <ElTableColumn label="昵称" min-width="80">
              <template #default="{ row }">{{ formatMemberNickname(row) }}</template>
            </ElTableColumn>
            <ElTableColumn label="手机" min-width="110">
              <template #default="{ row }">
                <span :class="{ 'member-phone--empty': !row.phone }">{{ formatMemberPhone(row.phone) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="预约" prop="bookingCount" width="60" align="center" />
          </ElTable>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard shadow="never" class="dashboard-card mt-16px">
      <h3 class="dashboard-card__title mb-16px">快捷入口</h3>
      <div class="quick-grid">
        <div
          v-for="item in quickLinks"
          :key="item.path"
          class="quick-link"
          @click="router.push(item.path)"
        >
          <div class="quick-link__icon" :style="{ background: item.bg, color: item.color }">
            <component :is="SvgIconVNode({ icon: item.icon, fontSize: 22 })" />
          </div>
          <span class="quick-link__label">{{ item.label }}</span>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.dashboard-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.dashboard-card--fill {
  min-height: 360px;
}

.dashboard-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.dashboard-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin-bottom: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  transition: box-shadow 0.2s, transform 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
}

.stat-card__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
}

.stat-card__value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.stat-card__label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.todo-item__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--el-color-warning);
}

.member-phone--empty {
  color: var(--el-text-color-placeholder);
}

.todo-empty {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 1200px) {
  .quick-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  transition: all 0.2s;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  }
}

.quick-link__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.quick-link__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.chart-box {
  width: 100%;
}

.chart-box--trend {
  height: 300px;
}

.chart-box--slot {
  height: 300px;
}

.chart-box__canvas {
  width: 100%;
  height: 100%;
}

.chart-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
