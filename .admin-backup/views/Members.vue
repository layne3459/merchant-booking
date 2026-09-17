<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi } from '@/api';
import { bookingStatusMap, cardTypeMap, fenToYuan } from '@/utils/format';

const list = ref<any[]>([]);
const total = ref(0);
const query = reactive({ page: 1, pageSize: 20, keyword: '' });
const detailVisible = ref(false);
const detail = ref<any>(null);
const templates = ref<any[]>([]);

const openCardVisible = ref(false);
const openCardForm = reactive({ templateId: undefined as number | undefined, remark: '' });

const rechargeVisible = ref(false);
const rechargeCard = ref<any>(null);
const rechargeForm = reactive({ amount: 100, remark: '' });

async function load() {
  const res = await adminApi.listMembers({
    page: query.page,
    pageSize: query.pageSize,
    ...(query.keyword ? { keyword: query.keyword } : {}),
  });
  list.value = res.list;
  total.value = res.total;
}

function search() {
  query.page = 1;
  load();
}

async function showDetail(row: any) {
  detail.value = await adminApi.getMember(row.id);
  detailVisible.value = true;
}

function showOpenCard() {
  openCardForm.templateId = templates.value[0]?.id;
  openCardForm.remark = '';
  openCardVisible.value = true;
}

async function submitOpenCard() {
  if (!openCardForm.templateId || !detail.value) return;
  await adminApi.openCard(detail.value.id, {
    templateId: openCardForm.templateId,
    remark: openCardForm.remark || undefined,
  });
  ElMessage.success('开卡成功');
  openCardVisible.value = false;
  detail.value = await adminApi.getMember(detail.value.id);
  load();
}

function showRecharge(card: any) {
  rechargeCard.value = card;
  rechargeForm.amount = card.type === 2 ? 1 : 1000;
  rechargeForm.remark = '';
  rechargeVisible.value = true;
}

async function submitRecharge() {
  if (!rechargeCard.value) return;
  await adminApi.rechargeCard(rechargeCard.value.id, {
    amount: rechargeForm.amount,
    remark: rechargeForm.remark || undefined,
  });
  ElMessage.success('充值成功');
  rechargeVisible.value = false;
  detail.value = await adminApi.getMember(detail.value.id);
}

onMounted(async () => {
  load();
  templates.value = await adminApi.listCardTemplates();
});
</script>

<template>
  <div class="list-page">
    <h2>会员管理</h2>
    <el-form :inline="true" style="margin:16px 0">
      <el-form-item label="搜索">
        <el-input v-model="query.keyword" placeholder="昵称/手机" clearable @keyup.enter="search" />
      </el-form-item>
      <el-button type="primary" @click="search">查询</el-button>
    </el-form>
    <el-table :data="list" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="phone" label="手机" />
      <el-table-column prop="cardCount" label="有效卡" width="80" />
      <el-table-column prop="bookingCount" label="预约数" width="80" />
      <el-table-column prop="createdAt" label="注册时间" width="170" />
      <el-table-column label="操作" width="90">
        <template #default="{ row }">
          <el-button link type="primary" @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top:16px"
      @current-change="load"
      @size-change="search"
    />

    <el-dialog v-model="detailVisible" title="会员详情" width="680px">
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="昵称">{{ detail.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机">{{ detail.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间" :span="2">{{ detail.createdAt }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin:16px 0;display:flex;gap:8px">
          <el-button type="primary" size="small" @click="showOpenCard">手动开卡</el-button>
        </div>

        <h4 style="margin:12px 0 8px">会员卡</h4>
        <el-table :data="detail.cards" size="small" stripe>
          <el-table-column prop="name" label="卡种" />
          <el-table-column label="类型"><template #default="{ row }">{{ cardTypeMap[row.type] }}</template></el-table-column>
          <el-table-column label="余额/次数">
            <template #default="{ row }">
              {{ row.type === 2 ? `${row.remainTimes} 次` : `¥${fenToYuan(row.balance)}` }}
            </template>
          </el-table-column>
          <el-table-column label="到期">
            <template #default="{ row }">{{ row.expireAt ? String(row.expireAt).slice(0, 10) : '永久' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button v-if="row.type !== 3" link type="primary" @click="showRecharge(row)">充值</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!detail.cards?.length" description="暂无有效会员卡" />

        <h4 style="margin:20px 0 8px">最近预约</h4>
        <el-table :data="detail.recentBookings" size="small" stripe>
          <el-table-column prop="serviceName" label="项目" />
          <el-table-column prop="staffName" label="技师" />
          <el-table-column prop="bookDate" label="日期" />
          <el-table-column prop="timeSlot" label="时段" />
          <el-table-column label="状态"><template #default="{ row }">{{ bookingStatusMap[row.status] }}</template></el-table-column>
        </el-table>
      </template>
    </el-dialog>

    <el-dialog v-model="openCardVisible" title="手动开卡" width="400px">
      <el-form label-width="80px">
        <el-form-item label="卡种">
          <el-select v-model="openCardForm.templateId" placeholder="选择卡种" style="width:100%">
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="openCardForm.remark" /></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="submitOpenCard">确认开卡</el-button></template>
    </el-dialog>

    <el-dialog v-model="rechargeVisible" title="会员卡充值" width="400px">
      <el-form v-if="rechargeCard" label-width="100px">
        <el-form-item label="卡种">{{ rechargeCard.name }}</el-form-item>
        <el-form-item :label="rechargeCard.type === 2 ? '充值次数' : '充值金额(分)'">
          <el-input-number v-model="rechargeForm.amount" :min="1" />
          <span v-if="rechargeCard.type !== 2" style="margin-left:8px;color:#999">= ¥{{ fenToYuan(rechargeForm.amount) }}</span>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="rechargeForm.remark" /></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="submitRecharge">确认充值</el-button></template>
    </el-dialog>
  </div>
</template>
