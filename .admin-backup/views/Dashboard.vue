<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Calendar, Coin, CreditCard, TrendCharts } from '@element-plus/icons-vue';
import { adminApi } from '@/api';
import { fenToYuan } from '@/utils/format';

const tab = ref<'daily' | 'monthly'>('daily');
const daily = ref<any>({});
const monthly = ref<any>({});

const stats = computed(() => {
  const data = tab.value === 'daily' ? daily.value : monthly.value;
  return [
    { label: '预约数', value: data.bookingCount ?? 0, icon: Calendar, color: '#1890ff', bg: '#e6f7ff' },
    { label: '实收金额', value: `¥${fenToYuan(data.revenue ?? 0)}`, icon: Coin, color: '#52c41a', bg: '#f6ffed' },
    { label: '核销次数', value: data.verifyCount ?? 0, icon: TrendCharts, color: '#722ed1', bg: '#f9f0ff' },
    { label: '耗卡统计', value: data.cardConsume ?? 0, icon: CreditCard, color: '#fa8c16', bg: '#fff7e6' },
  ];
});

onMounted(async () => {
  daily.value = await adminApi.dailyReport();
  monthly.value = await adminApi.monthlyReport();
});
</script>

<template>
  <div>
    <div class="page-toolbar">
      <h2>经营概览</h2>
      <el-radio-group v-model="tab">
        <el-radio-button value="daily">今日</el-radio-button>
        <el-radio-button value="monthly">本月</el-radio-button>
      </el-radio-group>
    </div>

    <el-row :gutter="16">
      <el-col v-for="(item, i) in stats" :key="i" :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: item.bg, color: item.color }">
            <el-icon :size="28"><component :is="item.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-label">{{ item.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="welcome-card page-card" style="margin-top: 20px">
      <h3>快捷入口</h3>
      <el-row :gutter="16">
        <el-col :span="6"><el-button @click="$router.push('/bookings')">预约管理</el-button></el-col>
        <el-col :span="6"><el-button @click="$router.push('/members')">会员管理</el-button></el-col>
        <el-col :span="6"><el-button @click="$router.push('/transactions')">流水查询</el-button></el-col>
        <el-col :span="6"><el-button @click="$router.push('/settings')">店铺设置</el-button></el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--admin-shadow);
  margin-bottom: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 4px;
}

.welcome-card h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #374151;
}
</style>
