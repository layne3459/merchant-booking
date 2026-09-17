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

async function loadTx() {
  const res = await adminApi.listTransactions({
    page: query.page,
    pageSize: query.pageSize,
    ...(query.type !== undefined ? { type: query.type } : {}),
  });
  txList.value = res.list;
  txTotal.value = res.total;
}

async function loadVerify() {
  const res = await adminApi.listVerifyRecords({
    page: verifyQuery.page,
    pageSize: verifyQuery.pageSize,
  });
  verifyList.value = res.list;
  verifyTotal.value = res.total;
}

async function loadPay() {
  const res = await adminApi.listPayments({
    page: payQuery.page,
    pageSize: payQuery.pageSize,
    ...(payQuery.status !== undefined ? { status: payQuery.status } : {}),
  });
  payList.value = res.list;
  payTotal.value = res.total;
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
  <div class="list-page">
    <div class="toolbar">
      <h2>流水与核销</h2>
      <el-radio-group v-model="tab">
        <el-radio-button value="tx">卡流水</el-radio-button>
        <el-radio-button value="verify">核销记录</el-radio-button>
        <el-radio-button value="pay">支付退款</el-radio-button>
      </el-radio-group>
    </div>

    <template v-if="tab === 'tx'">
      <el-form :inline="true" style="margin-bottom:16px">
        <el-form-item label="类型">
          <el-select v-model="query.type" clearable style="width:120px">
            <el-option :value="1" label="开卡" />
            <el-option :value="2" label="核销" />
            <el-option :value="3" label="充值" />
            <el-option :value="5" label="反核销" />
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="() => { query.page = 1; loadTx(); }">查询</el-button>
        <el-button @click="exportCsv">导出 CSV</el-button>
      </el-form>
      <el-table :data="txList" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="memberName" label="会员" />
        <el-table-column prop="memberPhone" label="手机" />
        <el-table-column prop="typeLabel" label="类型" />
        <el-table-column prop="amount" label="变动" />
        <el-table-column prop="beforeValue" label="变动前" />
        <el-table-column prop="afterValue" label="变动后" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column prop="createdAt" label="时间" width="180" />
      </el-table>
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="txTotal"
        layout="total, prev, pager, next"
        style="margin-top:16px"
        @current-change="loadTx"
      />
    </template>

    <template v-else-if="tab === 'verify'">
      <el-table :data="verifyList" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="memberName" label="会员" />
        <el-table-column prop="memberPhone" label="手机" />
        <el-table-column prop="cardName" label="会员卡" />
        <el-table-column prop="createdAt" label="核销时间" width="180" />
        <el-table-column label="状态">
          <template #default="{ row }">{{ row.reversed ? '已反核销' : '正常' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button v-if="!row.reversed" link type="danger" @click="reverse(row)">反核销</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="verifyQuery.page"
        v-model:page-size="verifyQuery.pageSize"
        :total="verifyTotal"
        layout="total, prev, pager, next"
        style="margin-top:16px"
        @current-change="loadVerify"
      />
    </template>

    <template v-else>
      <el-form :inline="true" style="margin-bottom:16px">
        <el-form-item label="状态">
          <el-select v-model="payQuery.status" clearable style="width:120px">
            <el-option :value="0" label="待支付" />
            <el-option :value="1" label="已支付" />
            <el-option :value="2" label="已退款" />
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="() => { payQuery.page = 1; loadPay(); }">查询</el-button>
      </el-form>
      <el-table :data="payList" stripe>
        <el-table-column prop="outTradeNo" label="订单号" show-overflow-tooltip />
        <el-table-column prop="memberName" label="会员" />
        <el-table-column prop="typeLabel" label="类型" />
        <el-table-column label="金额"><template #default="{ row }">¥{{ fenToYuan(row.amount) }}</template></el-table-column>
        <el-table-column prop="statusLabel" label="状态" />
        <el-table-column prop="paidAt" label="支付时间" width="170" />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button v-if="row.status === 1 && !row.hasRefund" link type="danger" @click="refund(row)">退款</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="payQuery.page"
        v-model:page-size="payQuery.pageSize"
        :total="payTotal"
        layout="total, prev, pager, next"
        style="margin-top:16px"
        @current-change="loadPay"
      />
    </template>
  </div>
</template>
