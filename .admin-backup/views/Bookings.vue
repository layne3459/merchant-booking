<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { bookingStatusMap } from '@/utils/format';

const auth = useAuthStore();
const list = ref<any[]>([]);
const total = ref(0);
const query = reactive({
  page: 1,
  pageSize: 20,
  status: undefined as number | undefined,
  dateFrom: '',
  dateTo: '',
  keyword: '',
});

const rescheduleVisible = ref(false);
const rescheduleRow = ref<any>(null);
const rescheduleForm = reactive({ bookDate: '', timeSlot: '', staffId: 0 });
const slotOptions = ref<Array<{ time: string; available: boolean; staffId: number; staffName: string }>>([]);

async function load() {
  const res = await adminApi.listBookings({
    page: query.page,
    pageSize: query.pageSize,
    ...(query.status !== undefined ? { status: query.status } : {}),
    ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
    ...(query.dateTo ? { dateTo: query.dateTo } : {}),
    ...(query.keyword ? { keyword: query.keyword } : {}),
  });
  list.value = res.list;
  total.value = res.total;
}

function search() {
  query.page = 1;
  load();
}

async function doAction(row: any, action: 'cancel' | 'arrive' | 'no-show' | 'complete') {
  const labels = { cancel: '取消', arrive: '确认到店', 'no-show': '标记爽约', complete: '标记完成' };
  const tips = action === 'cancel' ? '取消后将自动退还已付订金（如有）' : '';
  await ElMessageBox.confirm(`确认${labels[action]}该预约？${tips}`, '提示');
  if (action === 'cancel') await adminApi.cancelBooking(row.id);
  else if (action === 'arrive') await adminApi.arriveBooking(row.id);
  else if (action === 'complete') await adminApi.completeBooking(row.id);
  else await adminApi.noShowBooking(row.id);
  ElMessage.success('操作成功');
  load();
}

async function openReschedule(row: any) {
  rescheduleRow.value = row;
  rescheduleForm.bookDate = String(row.bookDate).slice(0, 10);
  rescheduleForm.staffId = Number(row.staffId);
  rescheduleForm.timeSlot = row.timeSlot;
  rescheduleVisible.value = true;
  await loadSlots();
}

async function loadSlots() {
  if (!rescheduleRow.value) return;
  const shopId = auth.admin?.shop?.id || 1;
  const groups: any[] = await adminApi.getSlots({
    shopId,
    serviceId: Number(rescheduleRow.value.serviceId),
    date: rescheduleForm.bookDate,
    ...(rescheduleForm.staffId ? { staffId: rescheduleForm.staffId } : {}),
  });
  slotOptions.value = groups.flatMap((g) =>
    g.slots.map((s: any) => ({
      time: s.time,
      available: s.available,
      staffId: g.staffId,
      staffName: g.staffName,
    })),
  );
  if (!slotOptions.value.find((s) => s.time === rescheduleForm.timeSlot && s.available)) {
    rescheduleForm.timeSlot = '';
  }
}

async function submitReschedule() {
  if (!rescheduleRow.value || !rescheduleForm.timeSlot) {
    ElMessage.warning('请选择时段');
    return;
  }
  const slot = slotOptions.value.find((s) => s.time === rescheduleForm.timeSlot);
  await adminApi.rescheduleBooking(rescheduleRow.value.id, {
    bookDate: rescheduleForm.bookDate,
    timeSlot: rescheduleForm.timeSlot,
    staffId: slot?.staffId || rescheduleForm.staffId,
  });
  ElMessage.success('改约成功');
  rescheduleVisible.value = false;
  load();
}

onMounted(load);
</script>

<template>
  <div class="list-page">
    <h2>预约管理</h2>
    <el-form :inline="true" style="margin:16px 0">
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width:120px">
          <el-option v-for="(label, key) in bookingStatusMap" :key="key" :label="label" :value="Number(key)" />
        </el-select>
      </el-form-item>
      <el-form-item label="开始"><el-date-picker v-model="query.dateFrom" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      <el-form-item label="结束"><el-date-picker v-model="query.dateTo" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      <el-form-item label="会员"><el-input v-model="query.keyword" placeholder="昵称/手机" clearable /></el-form-item>
      <el-button type="primary" @click="search">查询</el-button>
    </el-form>
    <el-table :data="list" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="会员"><template #default="{ row }">{{ row.member?.nickname }}</template></el-table-column>
      <el-table-column label="手机"><template #default="{ row }">{{ row.member?.phone }}</template></el-table-column>
      <el-table-column label="项目"><template #default="{ row }">{{ row.service?.name }}</template></el-table-column>
      <el-table-column label="技师"><template #default="{ row }">{{ row.staff?.name }}</template></el-table-column>
      <el-table-column prop="bookDate" label="日期"><template #default="{ row }">{{ String(row.bookDate).slice(0, 10) }}</template></el-table-column>
      <el-table-column prop="timeSlot" label="时段" />
      <el-table-column label="状态"><template #default="{ row }">{{ bookingStatusMap[row.status] }}</template></el-table-column>
      <el-table-column label="操作" width="300">
        <template #default="{ row }">
          <el-button v-if="row.status === 1" link type="primary" @click="openReschedule(row)">改约</el-button>
          <el-button v-if="row.status === 0 || row.status === 1" link type="danger" @click="doAction(row, 'cancel')">取消</el-button>
          <el-button v-if="row.status === 1" link type="primary" @click="doAction(row, 'arrive')">到店</el-button>
          <el-button v-if="row.status === 2" link type="success" @click="doAction(row, 'complete')">完成</el-button>
          <el-button v-if="row.status === 1" link @click="doAction(row, 'no-show')">爽约</el-button>
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

    <el-dialog v-model="rescheduleVisible" title="改约" width="480px">
      <el-form label-width="80px">
        <el-form-item label="日期">
          <el-date-picker v-model="rescheduleForm.bookDate" type="date" value-format="YYYY-MM-DD" @change="loadSlots" />
        </el-form-item>
        <el-form-item label="时段">
          <el-select v-model="rescheduleForm.timeSlot" placeholder="选择时段" style="width:100%">
            <el-option
              v-for="s in slotOptions.filter((x) => x.available)"
              :key="`${s.staffId}-${s.time}`"
              :label="`${s.time} (${s.staffName})`"
              :value="s.time"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="submitReschedule">确认改约</el-button></template>
    </el-dialog>
  </div>
</template>
