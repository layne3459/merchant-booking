<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi } from '@/api';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const tab = ref<'weekly' | 'exception'>('weekly');
const staffList = ref<any[]>([]);
const schedules = ref<any[]>([]);
const form = reactive({
  staffId: 1,
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '21:00',
  isRest: 0,
  exceptionDate: '',
});

async function load() {
  staffList.value = await adminApi.listStaff();
  if (staffList.value.length && !form.staffId) form.staffId = staffList.value[0].id;
  schedules.value = await adminApi.listSchedules(form.staffId);
}

const weeklyList = () =>
  schedules.value.filter((s) => !s.exceptionDate).map((s) => ({
    ...s,
    dayLabel: WEEKDAYS[s.dayOfWeek] ?? s.dayOfWeek,
  }));

const exceptionList = () =>
  schedules.value
    .filter((s) => s.exceptionDate)
    .map((s) => ({
      ...s,
      dateLabel: String(s.exceptionDate).slice(0, 10),
    }));

async function saveWeekly() {
  await adminApi.createSchedule({
    staffId: form.staffId,
    dayOfWeek: form.dayOfWeek,
    startTime: form.startTime,
    endTime: form.endTime,
    isRest: form.isRest,
  });
  ElMessage.success('已保存');
  schedules.value = await adminApi.listSchedules(form.staffId);
}

async function saveException() {
  if (!form.exceptionDate) {
    ElMessage.warning('请选择例外日期');
    return;
  }
  await adminApi.createSchedule({
    staffId: form.staffId,
    dayOfWeek: 0,
    startTime: form.startTime,
    endTime: form.endTime,
    isRest: form.isRest,
    exceptionDate: form.exceptionDate,
  });
  ElMessage.success('已添加例外日');
  schedules.value = await adminApi.listSchedules(form.staffId);
}

async function toggleRest(row: any) {
  await adminApi.updateSchedule(row.id, { isRest: row.isRest ? 0 : 1 });
  ElMessage.success('已更新');
  schedules.value = await adminApi.listSchedules(form.staffId);
}

async function remove(row: any) {
  await ElMessageBox.confirm('确认删除该排班？', '提示');
  await adminApi.deleteSchedule(row.id);
  ElMessage.success('已删除');
  schedules.value = await adminApi.listSchedules(form.staffId);
}

onMounted(load);
</script>

<template>
  <div class="list-page">
    <h2>排班管理</h2>
    <el-form :inline="true" style="margin:16px 0">
      <el-form-item label="员工">
        <el-select v-model="form.staffId" @change="load">
          <el-option v-for="s in staffList" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-radio-group v-model="tab" style="margin-bottom:16px">
      <el-radio-button value="weekly">每周排班</el-radio-button>
      <el-radio-button value="exception">例外日期</el-radio-button>
    </el-radio-group>

    <template v-if="tab === 'weekly'">
      <el-form :inline="true" style="margin-bottom:16px">
        <el-form-item label="星期">
          <el-select v-model="form.dayOfWeek" style="width:100px">
            <el-option v-for="(label, i) in WEEKDAYS" :key="i" :label="label" :value="i" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始"><el-input v-model="form.startTime" style="width:90px" /></el-form-item>
        <el-form-item label="结束"><el-input v-model="form.endTime" style="width:90px" /></el-form-item>
        <el-form-item label="休息">
          <el-switch v-model="form.isRest" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-button type="primary" @click="saveWeekly">添加</el-button>
      </el-form>
      <el-table :data="weeklyList()" stripe>
        <el-table-column prop="dayLabel" label="星期" />
        <el-table-column prop="startTime" label="开始" />
        <el-table-column prop="endTime" label="结束" />
        <el-table-column label="休息">
          <template #default="{ row }">{{ row.isRest ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button link @click="toggleRest(row)">{{ row.isRest ? '设为上班' : '设为休息' }}</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <template v-else>
      <el-form :inline="true" style="margin-bottom:16px">
        <el-form-item label="日期">
          <el-date-picker v-model="form.exceptionDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="开始"><el-input v-model="form.startTime" style="width:90px" /></el-form-item>
        <el-form-item label="结束"><el-input v-model="form.endTime" style="width:90px" /></el-form-item>
        <el-form-item label="休息">
          <el-switch v-model="form.isRest" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-button type="primary" @click="saveException">添加例外</el-button>
      </el-form>
      <p class="hint">例外日期优先于每周排班，可用于节假日调休或临时加班</p>
      <el-table :data="exceptionList()" stripe>
        <el-table-column prop="dateLabel" label="日期" />
        <el-table-column prop="startTime" label="开始" />
        <el-table-column prop="endTime" label="结束" />
        <el-table-column label="休息">
          <template #default="{ row }">{{ row.isRest ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.hint { color: #6b7280; font-size: 13px; margin-bottom: 12px; }
</style>
