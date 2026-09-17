<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi } from '@/api';
import { bookingStatusMap, fenToYuan, normalizeNumericId } from '@/utils/format';
import {
  listActiveTemplates,
  templateBenefitLines,
  templateOptionLabel,
} from '@/utils/card-template-display';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const query = reactive({ page: 1, pageSize: 20, keyword: '' });
const detailVisible = ref(false);
const detail = ref<any>(null);
const templates = ref<any[]>([]);
const services = ref<any[]>([]);

const openCardVisible = ref(false);
const openCardForm = reactive({ templateId: undefined as number | undefined, remark: '' });

const activeTemplates = computed(() => listActiveTemplates(templates.value));

const selectedTemplate = computed(() =>
  activeTemplates.value.find((item) => item.id === openCardForm.templateId),
);

const selectedBenefits = computed(() => {
  if (!selectedTemplate.value) return [];
  return templateBenefitLines(selectedTemplate.value, services.value);
});

const rechargeVisible = ref(false);
const rechargeCard = ref<any>(null);
const rechargeForm = reactive({ amount: 100, remark: '' });

async function load() {
  loading.value = true;
  try {
    const res = await adminApi.listMembers({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.keyword ? { keyword: query.keyword } : {}),
    });
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function search() {
  query.page = 1;
  load();
}

function reset() {
  query.keyword = '';
  search();
}

async function showDetail(row: any) {
  detail.value = await adminApi.getMember(row.id);
  detailVisible.value = true;
}

async function showOpenCard() {
  const [templateList, serviceList] = await Promise.all([
    adminApi.listCardTemplates(),
    adminApi.listServices(),
  ]);
  templates.value = templateList;
  services.value = serviceList.map((s) => ({ ...s, id: normalizeNumericId(s.id) }));
  openCardForm.templateId = activeTemplates.value[0]?.id;
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
  rechargeForm.amount = card.deductMode === 'times' ? 1 : 1000;
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
  const [templateList, serviceList] = await Promise.all([
    adminApi.listCardTemplates(),
    adminApi.listServices(),
  ]);
  templates.value = templateList;
  services.value = serviceList.map((s) => ({ ...s, id: normalizeNumericId(s.id) }));
});
</script>

<template>
  <BizPage title="会员管理" :loading="loading" @refresh="load">
    <template #filter>
      <BizFilter @search="search" @reset="reset">
        <ElFormItem label="搜索">
          <ElInput v-model="query.keyword" placeholder="昵称/手机" clearable @keyup.enter="search" />
        </ElFormItem>
      </BizFilter>
    </template>

    <BizTable :data="list" :loading="loading">
      <ElTableColumn prop="id" label="ID" width="70" align="center" />
      <ElTableColumn prop="nickname" label="昵称" min-width="100" />
      <ElTableColumn prop="phone" label="手机" width="120" />
      <ElTableColumn prop="cardCount" label="有效卡" width="80" align="center" />
      <ElTableColumn prop="bookingCount" label="预约数" width="80" align="center" />
      <ElTableColumn prop="createdAt" label="注册时间" width="170" />
      <ElTableColumn label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <div class="biz-actions">
            <ElButton plain size="small" type="primary" @click="showDetail(row)">详情</ElButton>
          </div>
        </template>
      </ElTableColumn>
    </BizTable>

    <template #pagination>
      <ElPagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="biz-pagination"
        background
        @current-change="load"
        @size-change="search"
      />
    </template>

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
          <el-table-column prop="cardNo" label="卡编号" width="120" />
          <el-table-column prop="name" label="卡种" />
          <el-table-column label="类型"><template #default="{ row }">{{ row.typeName || '会员卡' }}</template></el-table-column>
          <el-table-column label="余额/次数">
            <template #default="{ row }">
              {{ row.deductMode === 'times' ? `${row.remainTimes} 次` : row.deductMode === 'period' ? '周期有效' : `¥${fenToYuan(row.balance)}` }}
            </template>
          </el-table-column>
          <el-table-column label="到期">
            <template #default="{ row }">{{ row.expireAt ? String(row.expireAt).slice(0, 10) : '永久' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button v-if="row.deductMode !== 'period'" link type="primary" @click="showRecharge(row)">充值</el-button>
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

    <el-dialog v-model="openCardVisible" title="手动开卡" width="560px">
      <el-form label-width="80px">
        <el-form-item label="卡种">
          <el-select
            v-model="openCardForm.templateId"
            placeholder="选择上架卡种"
            filterable
            style="width:100%"
          >
            <el-option
              v-for="t in activeTemplates"
              :key="t.id"
              :label="templateOptionLabel(t)"
              :value="t.id"
            />
          </el-select>
          <p v-if="!activeTemplates.length" class="form-tip">暂无上架卡种，请先在卡种管理中上架</p>
        </el-form-item>
        <el-form-item v-if="selectedBenefits.length" label="核销权益">
          <div class="benefit-preview">
            <p v-for="(line, index) in selectedBenefits" :key="index">{{ line }}</p>
          </div>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="openCardForm.remark" placeholder="可选，如：线下收款补录" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :disabled="!openCardForm.templateId" @click="submitOpenCard">确认开卡</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rechargeVisible" title="会员卡充值" width="400px">
      <el-form v-if="rechargeCard" label-width="100px">
        <el-form-item label="卡种">{{ rechargeCard.name }}</el-form-item>
        <el-form-item :label="rechargeCard.deductMode === 'times' ? '充值次数' : '充值金额(分)'">
          <el-input-number v-model="rechargeForm.amount" :min="1" />
          <span v-if="rechargeCard.deductMode !== 'times'" style="margin-left:8px;color:#999">= ¥{{ fenToYuan(rechargeForm.amount) }}</span>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="rechargeForm.remark" /></el-form-item>
      </el-form>
      <template #footer><ElButton type="primary" @click="submitRecharge">确认充值</ElButton></template>
    </el-dialog>
  </BizPage>
</template>

<style scoped lang="scss">
.form-tip {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.benefit-preview {
  width: 100%;
  padding: 12px 14px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);

  p {
    margin: 0;
  }
}
</style>
