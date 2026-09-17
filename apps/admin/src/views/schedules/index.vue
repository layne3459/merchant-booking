<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface DayRow {
  dayOfWeek: number;
  dayLabel: string;
  startTime: string;
  endTime: string;
  isRest: number;
}

interface DaySchedule {
  startTime: string;
  endTime: string;
  isRest: number;
  source: 'exception' | 'weekly' | 'default';
}

interface CalendarCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

interface DayStaffRow {
  staffId: number;
  name: string;
  startTime: string;
  endTime: string;
  isRest: number;
  source: DaySchedule['source'];
}

const loading = ref(false);
const saving = ref(false);
const dayDrawerVisible = ref(false);
const weeklyDrawerVisible = ref(false);
const staffList = ref<any[]>([]);
const allSchedules = ref<any[]>([]);
const editingDate = ref('');
const editingStaffId = ref(0);
const weeklyRows = ref<DayRow[]>([]);
const dayStaffRows = ref<DayStaffRow[]>([]);

const todayKey = formatDateKey(new Date());
const monthCursor = ref({ year: new Date().getFullYear(), month: new Date().getMonth() });

const filters = reactive({ staffId: 0 });

const editingStaff = computed(() => staffList.value.find((s) => s.id === editingStaffId.value));
const workingDays = computed(() => weeklyRows.value.filter((row) => !row.isRest).length);

const monthTitle = computed(
  () => `${monthCursor.value.year}年${MONTH_LABELS[monthCursor.value.month]}`,
);

const isCurrentMonth = computed(() => {
  const now = new Date();
  return monthCursor.value.year === now.getFullYear() && monthCursor.value.month === now.getMonth();
});

const activeStaff = computed(() => staffList.value.filter((s) => s.status === 1));

const filteredStaff = computed(() => {
  if (!filters.staffId) return activeStaff.value;
  return activeStaff.value.filter((s) => s.id === filters.staffId);
});

const calendarCells = computed(() => buildMonthCells(monthCursor.value.year, monthCursor.value.month));

const editingDateLabel = computed(() => {
  if (!editingDate.value) return '';
  const d = new Date(`${editingDate.value}T12:00:00`);
  return `${editingDate.value}（${WEEKDAYS[d.getDay()]}）`;
});

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildMonthCells(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const cells: CalendarCell[] = [];

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push(makeCell(d, false));
  }
  for (let day = 1; day <= lastDay; day++) {
    cells.push(makeCell(new Date(year, month, day), true));
  }
  let tail = 1;
  while (cells.length % 7 !== 0) {
    cells.push(makeCell(new Date(year, month + 1, tail++), false));
  }
  return cells;
}

function makeCell(date: Date, inMonth: boolean): CalendarCell {
  const dayOfWeek = date.getDay();
  return {
    date: formatDateKey(date),
    day: date.getDate(),
    inMonth,
    isToday: formatDateKey(date) === todayKey,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
}

function weeklyForStaff(staffId: number) {
  return allSchedules.value.filter(
    (s) => !s.exceptionDate && Number(s.staffId) === Number(staffId),
  );
}

function exceptionForStaff(staffId: number, date: string) {
  return allSchedules.value
    .filter((s) => s.exceptionDate && Number(s.staffId) === Number(staffId))
    .find((s) => String(s.exceptionDate).slice(0, 10) === date);
}

function resolveDaySchedule(staffId: number, date: string): DaySchedule {
  const exception = exceptionForStaff(staffId, date);
  if (exception) {
    return {
      startTime: exception.startTime,
      endTime: exception.endTime,
      isRest: exception.isRest ?? 0,
      source: 'exception',
    };
  }

  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  const matches = weeklyForStaff(staffId)
    .filter((s) => s.dayOfWeek === dayOfWeek)
    .sort((a, b) => Number(b.id) - Number(a.id));
  const weekly = matches[0];
  if (!weekly) {
    return { startTime: '09:00', endTime: '21:00', isRest: 0, source: 'default' };
  }
  if (weekly.isRest) {
    return { startTime: '', endTime: '', isRest: 1, source: 'weekly' };
  }
  return {
    startTime: weekly.startTime,
    endTime: weekly.endTime,
    isRest: 0,
    source: 'weekly',
  };
}

function staffLinesForDate(date: string) {
  return filteredStaff.value.map((staff) => {
    const schedule = resolveDaySchedule(staff.id, date);
    return {
      staffId: staff.id,
      name: staff.name,
      schedule,
    };
  });
}

function scheduleLabel(schedule: DaySchedule) {
  if (schedule.isRest) return '休息';
  return `${schedule.startTime}-${schedule.endTime}`;
}

function buildWeeklyRows(staffId: number) {
  weeklyRows.value = WEEK_ORDER.map((dayOfWeek) => {
    const matches = weeklyForStaff(staffId)
      .filter((s) => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => Number(b.id) - Number(a.id));
    const row = matches[0];
    return {
      dayOfWeek,
      dayLabel: WEEKDAYS[dayOfWeek],
      startTime: row?.startTime || '09:00',
      endTime: row?.endTime || '21:00',
      isRest: row?.isRest ?? 0,
    };
  });
}

function openDayEditor(date: string) {
  editingDate.value = date;
  dayStaffRows.value = activeStaff.value.map((staff) => {
    const schedule = resolveDaySchedule(staff.id, date);
    return {
      staffId: staff.id,
      name: staff.name,
      startTime: schedule.startTime || '09:00',
      endTime: schedule.endTime || '21:00',
      isRest: schedule.isRest,
      source: schedule.source,
    };
  });
  dayDrawerVisible.value = true;
}

function openWeeklyEditor(staffId?: number) {
  const id = staffId || filters.staffId || activeStaff.value[0]?.id;
  if (!id) {
    ElMessage.warning('暂无在职员工');
    return;
  }
  editingStaffId.value = id;
  buildWeeklyRows(id);
  weeklyDrawerVisible.value = true;
}

function shiftMonth(delta: number) {
  const d = new Date(monthCursor.value.year, monthCursor.value.month + delta, 1);
  monthCursor.value = { year: d.getFullYear(), month: d.getMonth() };
}

function goToday() {
  const now = new Date();
  monthCursor.value = { year: now.getFullYear(), month: now.getMonth() };
}

async function load() {
  loading.value = true;
  try {
    const [staff, schedules] = await Promise.all([
      adminApi.listStaff(),
      adminApi.listSchedules(),
    ]);
    staffList.value = staff;
    allSchedules.value = schedules;
  } finally {
    loading.value = false;
  }
}

async function saveDaySchedules() {
  if (!editingDate.value) return;
  saving.value = true;
  try {
    const dayOfWeek = new Date(`${editingDate.value}T12:00:00`).getDay();
    const rows = filters.staffId
      ? dayStaffRows.value.filter((r) => r.staffId === filters.staffId)
      : dayStaffRows.value;
    await Promise.all(
      rows.map((row) =>
        adminApi.createSchedule({
          staffId: row.staffId,
          dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          isRest: row.isRest,
          exceptionDate: editingDate.value,
        }),
      ),
    );
    ElMessage.success('当日排班已保存');
    allSchedules.value = await adminApi.listSchedules();
    dayDrawerVisible.value = false;
  } finally {
    saving.value = false;
  }
}

async function resetDayStaffRow(row: DayStaffRow) {
  const exception = exceptionForStaff(row.staffId, editingDate.value);
  if (!exception) return;
  await adminApi.deleteSchedule(exception.id);
  allSchedules.value = await adminApi.listSchedules();
  const fresh = resolveDaySchedule(row.staffId, editingDate.value);
  row.startTime = fresh.startTime || '09:00';
  row.endTime = fresh.endTime || '21:00';
  row.isRest = fresh.isRest;
  row.source = fresh.source;
  ElMessage.success('已恢复为每周固定排班');
}

async function saveWeeklyRows() {
  if (!editingStaffId.value) return;
  saving.value = true;
  try {
    await Promise.all(
      weeklyRows.value.map((row) =>
        adminApi.createSchedule({
          staffId: editingStaffId.value,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          isRest: row.isRest,
        }),
      ),
    );
    ElMessage.success(`${editingStaff.value?.name || '员工'}每周排班已保存`);
    allSchedules.value = await adminApi.listSchedules();
    weeklyDrawerVisible.value = false;
  } finally {
    saving.value = false;
  }
}

function applyMondayToWeekdays() {
  const monday = weeklyRows.value.find((row) => row.dayOfWeek === 1);
  if (!monday) return;
  weeklyRows.value = weeklyRows.value.map((row) => {
    if (row.dayOfWeek >= 1 && row.dayOfWeek <= 5) {
      return { ...row, startTime: monday.startTime, endTime: monday.endTime, isRest: monday.isRest };
    }
    return row;
  });
}

onMounted(load);
</script>

<template>
  <BizPage title="排班管理" :loading="loading" @refresh="load">
    <template #toolbar>
      <div class="page-toolbar">
        <ElSelect
          v-model="filters.staffId"
          clearable
          placeholder="全部员工"
          class="staff-select"
        >
          <ElOption :value="0" label="全部员工" />
          <ElOption v-for="s in activeStaff" :key="s.id" :label="s.name" :value="s.id" />
        </ElSelect>
        <ElButton @click="openWeeklyEditor()">每周固定排班</ElButton>
      </div>
    </template>

    <div class="month-panel">
      <div class="month-nav">
        <ElButton text @click="shiftMonth(-1)">
          <icon-mdi-chevron-left class="text-icon" />
        </ElButton>
        <div class="month-nav__title">{{ monthTitle }}</div>
        <ElButton text @click="shiftMonth(1)">
          <icon-mdi-chevron-right class="text-icon" />
        </ElButton>
        <ElButton v-if="!isCurrentMonth" size="small" @click="goToday">本月</ElButton>
      </div>

      <div class="month-grid">
        <div v-for="day in WEEK_ORDER" :key="day" class="month-grid__weekday">
          周{{ ['日', '一', '二', '三', '四', '五', '六'][day] }}
        </div>

        <div
          v-for="cell in calendarCells"
          :key="cell.date"
          class="month-cell"
          :class="{
            'month-cell--outside': !cell.inMonth,
            'month-cell--today': cell.isToday,
            'month-cell--weekend': cell.isWeekend,
          }"
          @click="cell.inMonth && openDayEditor(cell.date)"
        >
          <div class="month-cell__head">
            <span class="month-cell__day">{{ cell.day }}</span>
          </div>
          <div class="month-cell__body">
            <div
              v-for="item in staffLinesForDate(cell.date)"
              :key="item.staffId"
              class="staff-line"
              :class="{
                'staff-line--rest': item.schedule.isRest,
                'staff-line--exception': item.schedule.source === 'exception',
              }"
            >
              <span class="staff-line__name">{{ item.name }}</span>
              <span class="staff-line__time">{{ scheduleLabel(item.schedule) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ElDrawer v-model="dayDrawerVisible" :title="`${editingDateLabel} 排班`" size="560px">
      <p class="drawer-tip">修改仅对当天生效；如需每周重复，请使用「每周固定排班」。</p>
      <div class="day-staff-list">
        <div
          v-for="row in dayStaffRows"
          :key="row.staffId"
          class="day-staff-row"
          :class="{
            'day-staff-row--hidden': filters.staffId && row.staffId !== filters.staffId,
            'day-staff-row--rest': row.isRest,
          }"
        >
          <div class="day-staff-row__head">
            <span class="day-staff-row__name">{{ row.name }}</span>
            <ElTag v-if="row.source === 'exception'" size="small" type="warning" effect="light">已单独调整</ElTag>
          </div>
          <div class="day-staff-row__body">
            <ElSwitch
              v-model="row.isRest"
              :active-value="0"
              :inactive-value="1"
              inline-prompt
              active-text="上班"
              inactive-text="休息"
              style="--el-switch-on-color: #18a058; --el-switch-off-color: #c0c4cc"
            />
            <template v-if="!row.isRest">
              <ElTimeSelect v-model="row.startTime" start="06:00" step="00:30" end="23:30" style="width: 100px" />
              <span>至</span>
              <ElTimeSelect
                v-model="row.endTime"
                start="06:00"
                step="00:30"
                end="23:30"
                :min-time="row.startTime"
                style="width: 100px"
              />
            </template>
            <ElButton v-if="row.source === 'exception'" text size="small" type="primary" @click="resetDayStaffRow(row)">
              恢复每周
            </ElButton>
          </div>
        </div>
      </div>
      <template #footer>
        <ElButton @click="dayDrawerVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="saveDaySchedules">保存当天</ElButton>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="weeklyDrawerVisible"
      :title="`${editingStaff?.name || ''} · 每周固定排班`"
      size="520px"
    >
      <p class="drawer-tip">设置后每周自动生效，单日可在日历中单独调整。</p>
      <div class="drawer-toolbar">
        <ElButton size="small" @click="applyMondayToWeekdays">周一复制到工作日</ElButton>
        <span class="drawer-meta">当前 {{ workingDays }} 天上班</span>
      </div>
      <div class="week-grid">
        <div v-for="row in weeklyRows" :key="row.dayOfWeek" class="week-row" :class="{ 'week-row--rest': row.isRest }">
          <span class="week-row__label">{{ row.dayLabel }}</span>
          <ElSwitch
            v-model="row.isRest"
            :active-value="0"
            :inactive-value="1"
            inline-prompt
            active-text="上班"
            inactive-text="休息"
            style="--el-switch-on-color: #18a058; --el-switch-off-color: #c0c4cc"
          />
          <div class="week-row__time">
            <template v-if="!row.isRest">
              <ElTimeSelect v-model="row.startTime" start="06:00" step="00:30" end="23:30" style="width: 100px" />
              <span>至</span>
              <ElTimeSelect
                v-model="row.endTime"
                start="06:00"
                step="00:30"
                end="23:30"
                :min-time="row.startTime"
                style="width: 100px"
              />
            </template>
            <span v-else class="week-row__rest-tip">休息</span>
          </div>
        </div>
      </div>
      <template #footer>
        <ElButton @click="weeklyDrawerVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="saveWeeklyRows">保存每周</ElButton>
      </template>
    </ElDrawer>
  </BizPage>
</template>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.staff-select {
  width: 160px;
}

.month-panel {
  margin-top: 4px;
  padding: 16px;
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.month-nav__title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.month-grid__weekday {
  padding: 8px 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.month-cell {
  min-height: 120px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.month-cell:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.month-cell--outside {
  opacity: 0.45;
  cursor: default;
}

.month-cell--today {
  border-color: var(--el-color-primary);
  box-shadow: inset 0 0 0 1px rgba(32, 128, 240, 0.15);
}

.month-cell--weekend .month-cell__day {
  color: var(--el-color-warning);
}

.month-cell__head {
  margin-bottom: 6px;
}

.month-cell__day {
  font-size: 14px;
  font-weight: 700;
}

.month-cell__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.staff-line {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 11px;
  background: rgba(24, 160, 88, 0.08);
  color: var(--el-color-success);
}

.staff-line--rest {
  background: var(--el-fill-color);
  color: var(--el-text-color-placeholder);
}

.staff-line--exception {
  background: rgba(230, 162, 60, 0.12);
  color: var(--el-color-warning);
}

.staff-line__name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.staff-line__time {
  flex-shrink: 0;
}

.drawer-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.day-staff-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.day-staff-row {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
}

.day-staff-row--hidden {
  display: none;
}

.day-staff-row--rest {
  background: var(--el-fill-color-lighter);
}

.day-staff-row__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.day-staff-row__name {
  font-weight: 600;
}

.day-staff-row__body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.drawer-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.week-grid {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  overflow: hidden;
}

.week-row {
  display: grid;
  grid-template-columns: 56px 120px 1fr;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.week-row:last-child {
  border-bottom: none;
}

.week-row--rest {
  background: var(--el-fill-color-lighter);
}

.week-row__label {
  font-weight: 600;
}

.week-row__time {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.week-row__rest-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
