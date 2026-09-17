<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi } from '@/api';
import { localStg } from '@/utils/storage';
import { bookingStatusMap, bookingStatusType } from '@/utils/format';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
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
  loading.value = true;
  try {
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
  } finally {
    loading.value = false;
  }
}

function search() {
  query.page = 1;
  load();
}

function reset() {
  query.status = undefined;
  query.dateFrom = '';
  query.dateTo = '';
  query.keyword = '';
  search();
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
  const shopId = Number(localStg.get('adminInfo')?.shop?.id || 0);
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
  <BizPage title="预约管理" :loading="loading" @refresh="load">
    <template #filter>
      <BizFilter @search="search" @reset="reset">
        <ElFormItem label="状态">
          <ElSelect v-model="query.status" clearable placeholder="全部" style="width:168px">
            <ElOption v-for="(label, key) in bookingStatusMap" :key="key" :label="label" :value="Number(key)" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="开始">
          <ElDatePicker v-model="query.dateFrom" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:168px" />
        </ElFormItem>
        <ElFormItem label="结束">
          <ElDatePicker v-model="query.dateTo" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:168px" />
        </ElFormItem>
        <ElFormItem label="会员">
          <ElInput v-model="query.keyword" placeholder="昵称/手机" clearable @keyup.enter="search" />
        </ElFormItem>
      </BizFilter>
    </template>

    <BizTable :data="list" :loading="loading">
      <ElTableColumn prop="id" label="ID" width="70" align="center" />
      <ElTableColumn label="会员" min-width="100">
        <template #default="{ row }">{{ row.member?.nickname || '-' }}</template>
      </ElTableColumn>
      <ElTableColumn label="手机" width="120">
        <template #default="{ row }">{{ row.member?.phone || '-' }}</template>
      </ElTableColumn>
      <ElTableColumn label="项目" min-width="100">
        <template #default="{ row }">{{ row.service?.name || '-' }}</template>
      </ElTableColumn>
      <ElTableColumn label="技师" width="90">
        <template #default="{ row }">{{ row.staff?.name || '-' }}</template>
      </ElTableColumn>
      <ElTableColumn prop="bookDate" label="日期" width="110" align="center">
        <template #default="{ row }">{{ String(row.bookDate).slice(0, 10) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="timeSlot" label="时段" width="90" align="center" />
      <ElTableColumn label="状态" width="90" align="center">
        <template #default="{ row }">
          <ElTag :type="bookingStatusType[row.status]" size="small" effect="light">
            {{ bookingStatusMap[row.status] }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <div class="biz-actions">
            <ElButton v-if="row.status === 1" plain size="small" type="primary" @click="openReschedule(row)">改约</ElButton>
            <ElButton v-if="row.status === 0 || row.status === 1" plain size="small" type="danger" @click="doAction(row, 'cancel')">取消</ElButton>
            <ElButton v-if="row.status === 1" plain size="small" type="success" @click="doAction(row, 'arrive')">到店</ElButton>
            <ElButton v-if="row.status === 2" plain size="small" type="primary" @click="doAction(row, 'complete')">完成</ElButton>
            <ElButton v-if="row.status === 1" plain size="small" @click="doAction(row, 'no-show')">爽约</ElButton>
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

    <ElDialog v-model="rescheduleVisible" title="改约" width="480px">
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
      <template #footer><ElButton type="primary" @click="submitReschedule">确认改约</ElButton></template>
    </ElDialog>
  </BizPage>
</template>
