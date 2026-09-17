<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi } from '@/api';
import { fenToYuan } from '@/utils/format';

const tab = ref<'tx' | 'verify' | 'pay'>('tx');
const txList = ref<any[]>([]);
const txTotal = ref(0);
const verifyList = ref<any[]>([]);
const verifyTotal = ref(0);
const payList = ref<any[]>([]);
const payTotal = ref(0);
const query = reactive({ page: 1, pageSize: 20, type: undefined as number | undefined });
const verifyQuery = reactive({ page: 1, pageSize: 20 });
const payQuery = reactive({ page: 1, pageSize: 20, status: undefined as number | undefined });

const loading = ref(false);

async function loadTx() {
  loading.value = true;
  try {
    const res = await adminApi.listTransactions({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.type !== undefined ? { type: query.type } : {}),
    });
    txList.value = res.list;
    txTotal.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function loadVerify() {
  loading.value = true;
  try {
    const res = await adminApi.listVerifyRecords({
      page: verifyQuery.page,
      pageSize: verifyQuery.pageSize,
    });
    verifyList.value = res.list;
    verifyTotal.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function loadPay() {
  loading.value = true;
  try {
    const res = await adminApi.listPayments({
      page: payQuery.page,
      pageSize: payQuery.pageSize,
      ...(payQuery.status !== undefined ? { status: payQuery.status } : {}),
    });
    payList.value = res.list;
    payTotal.value = res.total;
  } finally {
    loading.value = false;
  }
}

function refresh() {
  if (tab.value === 'tx') loadTx();
  else if (tab.value === 'verify') loadVerify();
  else loadPay();
}

function searchTx() {
  query.page = 1;
  loadTx();
}

function resetTx() {
  query.type = undefined;
  searchTx();
}

function searchPay() {
  payQuery.page = 1;
  loadPay();
}

function resetPay() {
  payQuery.status = undefined;
  searchPay();
}

async function exportCsv() {
  await adminApi.exportTransactionsCsv();
  ElMessage.success('导出成功');
}

async function reverse(row: any) {
  await ElMessageBox.confirm(`确认反核销 ${row.memberName} 的核销记录？`, '提示');
  await adminApi.reverseVerify(row.id);
  ElMessage.success('反核销成功');
  loadVerify();
  if (tab.value === 'tx') loadTx();
}

async function refund(row: any) {
  await ElMessageBox.confirm(`确认退款 ¥${fenToYuan(row.amount)} 给 ${row.memberName}？`, '退款确认');
  await adminApi.refundPayment(row.id);
  ElMessage.success('退款成功');
  loadPay();
}

watch(tab, (v) => {
  if (v === 'pay') loadPay();
});

onMounted(() => {
  loadTx();
  loadVerify();
});
</script>

<template>
  <BizPage title="流水与核销" :loading="loading" @refresh="refresh">
    <template #filter>
      <BizFilter v-if="tab === 'tx'" @search="searchTx" @reset="resetTx">
        <ElFormItem label="类型">
          <ElSelect v-model="query.type" clearable placeholder="全部">
            <ElOption :value="1" label="开卡" />
            <ElOption :value="2" label="核销" />
            <ElOption :value="3" label="充值" />
            <ElOption :value="5" label="反核销" />
          </ElSelect>
        </ElFormItem>
        <template #actions>
          <ElButton type="primary" @click="searchTx">
            <template #icon><icon-ic-round-search class="text-icon" /></template>
            查询
          </ElButton>
          <ElButton @click="resetTx">重置</ElButton>
          <ElButton @click="exportCsv">导出 CSV</ElButton>
        </template>
      </BizFilter>
      <BizFilter v-else-if="tab === 'pay'" @search="searchPay" @reset="resetPay">
        <ElFormItem label="状态">
          <ElSelect v-model="payQuery.status" clearable placeholder="全部">
            <ElOption :value="0" label="待支付" />
            <ElOption :value="1" label="已支付" />
            <ElOption :value="2" label="已退款" />
          </ElSelect>
        </ElFormItem>
      </BizFilter>
    </template>

    <template #extra>
      <ElRadioGroup v-model="tab">
        <ElRadioButton value="tx">卡流水</ElRadioButton>
        <ElRadioButton value="verify">核销记录</ElRadioButton>
        <ElRadioButton value="pay">支付退款</ElRadioButton>
      </ElRadioGroup>
    </template>

    <template v-if="tab === 'tx'">
      <BizTable :data="txList" :loading="loading">
        <ElTableColumn prop="id" label="ID" width="70" align="center" />
        <ElTableColumn prop="memberName" label="会员" min-width="100" />
        <ElTableColumn prop="memberPhone" label="手机" width="120" />
        <ElTableColumn prop="typeLabel" label="类型" width="90" align="center" />
        <ElTableColumn prop="amount" label="变动" width="90" align="right" />
        <ElTableColumn prop="beforeValue" label="变动前" width="90" align="right" />
        <ElTableColumn prop="afterValue" label="变动后" width="90" align="right" />
        <ElTableColumn prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <ElTableColumn prop="createdAt" label="时间" width="170" />
      </BizTable>
    </template>

    <template v-else-if="tab === 'verify'">
      <BizTable :data="verifyList" :loading="loading">
        <ElTableColumn prop="id" label="ID" width="70" align="center" />
        <ElTableColumn prop="memberName" label="会员" min-width="100" />
        <ElTableColumn prop="memberPhone" label="手机" width="120" />
        <ElTableColumn prop="cardNo" label="卡编号" width="120" />
        <ElTableColumn prop="cardName" label="会员卡" min-width="100" />
        <ElTableColumn prop="createdAt" label="核销时间" width="170" />
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="row.reversed ? 'info' : 'success'" size="small" effect="light">
              {{ row.reversed ? '已反核销' : '正常' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <div class="biz-actions">
              <ElButton v-if="!row.reversed" plain size="small" type="danger" @click="reverse(row)">反核销</ElButton>
            </div>
          </template>
        </ElTableColumn>
      </BizTable>
    </template>

    <template v-else>
      <BizTable :data="payList" :loading="loading">
        <ElTableColumn prop="outTradeNo" label="订单号" min-width="160" show-overflow-tooltip />
        <ElTableColumn prop="memberName" label="会员" min-width="100" />
        <ElTableColumn prop="typeLabel" label="类型" width="90" align="center" />
        <ElTableColumn label="金额" width="100" align="right">
          <template #default="{ row }">¥{{ fenToYuan(row.amount) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="statusLabel" label="状态" width="90" align="center" />
        <ElTableColumn prop="paidAt" label="支付时间" width="170" />
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <div class="biz-actions">
              <ElButton v-if="row.status === 1 && !row.hasRefund" plain size="small" type="danger" @click="refund(row)">退款</ElButton>
            </div>
          </template>
        </ElTableColumn>
      </BizTable>
    </template>

    <template #pagination>
      <ElPagination
        v-if="tab === 'tx'"
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="txTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="biz-pagination"
        background
        @current-change="loadTx"
        @size-change="searchTx"
      />
      <ElPagination
        v-else-if="tab === 'verify'"
        v-model:current-page="verifyQuery.page"
        v-model:page-size="verifyQuery.pageSize"
        :total="verifyTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="biz-pagination"
        background
        @current-change="loadVerify"
      />
      <ElPagination
        v-else
        v-model:current-page="payQuery.page"
        v-model:page-size="payQuery.pageSize"
        :total="payTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="biz-pagination"
        background
        @current-change="loadPay"
        @size-change="searchPay"
      />
    </template>
  </BizPage>
</template>
