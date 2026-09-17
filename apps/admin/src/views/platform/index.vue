<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { platformApi } from '@/api';
import { fenToYuan } from '@/utils/format';

defineOptions({ name: 'PlatformShops' });

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const keyword = ref('');
const plans = ref<Array<{ code: string; name: string; priceMonth: number }>>([]);
const query = reactive({ page: 1, pageSize: 20 });

const createVisible = ref(false);
const creating = ref(false);
const form = reactive({
  name: '',
  phone: '',
  address: '',
  username: '',
  password: 'admin123',
  planCode: 'trial',
});

const statusLabel: Record<number, string> = { 0: '已冻结', 1: '营业中' };
const subLabel: Record<number, string> = { 1: '试用', 2: '已付费', 3: '已到期', 4: '已冻结' };

async function load() {
  loading.value = true;
  try {
    const data = await platformApi.listShops({ ...query, keyword: keyword.value || undefined });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function loadPlans() {
  plans.value = await platformApi.listPlans();
}

function openCreate() {
  form.name = '';
  form.phone = '';
  form.address = '';
  form.username = '';
  form.password = 'admin123';
  form.planCode = 'trial';
  createVisible.value = true;
}

async function submitCreate() {
  if (!form.name || !form.username || !form.password) {
    ElMessage.warning('请填写店名、老板账号和密码');
    return;
  }
  creating.value = true;
  try {
    await platformApi.createShop({ ...form });
    ElMessage.success('店铺已开通');
    createVisible.value = false;
    await load();
  } finally {
    creating.value = false;
  }
}

async function freeze(row: any) {
  await ElMessageBox.confirm(`冻结「${row.name}」后顾客端将无法使用`, '确认冻结', { type: 'warning' });
  await platformApi.freezeShop(row.id);
  ElMessage.success('已冻结');
  await load();
}

async function unfreeze(row: any) {
  await platformApi.unfreezeShop(row.id);
  ElMessage.success('已解冻');
  await load();
}

async function renew(row: any) {
  await platformApi.renewShop(row.id, { months: 1, planCode: row.planCode || 'basic' });
  ElMessage.success('已续费 1 个月');
  await load();
}

async function resetPwd(row: any) {
  const { value } = await ElMessageBox.prompt(`重置「${row.name}」老板密码`, '重置密码', {
    inputPlaceholder: '新密码至少 6 位',
    inputValue: 'admin123',
  });
  if (!value || String(value).length < 6) {
    ElMessage.warning('密码至少 6 位');
    return;
  }
  const res = await platformApi.resetPassword(row.id, String(value));
  ElMessage.success(`已重置账号 ${res.username} 的密码`);
}

onMounted(async () => {
  await Promise.all([loadPlans(), load()]);
});
</script>

<template>
  <div class="flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <ElCard shadow="never">
      <div class="flex flex-wrap items-center gap-12px">
        <ElInput v-model="keyword" placeholder="店名 / 电话" clearable class="w-220px" @keyup.enter="load" />
        <ElButton type="primary" @click="load">查询</ElButton>
        <ElButton type="primary" plain @click="openCreate">开通店铺</ElButton>
      </div>
    </ElCard>

    <ElCard shadow="never" class="flex-1-hidden">
      <ElTable v-loading="loading" :data="list" height="100%">
        <ElTableColumn prop="id" label="店铺 ID" width="130" />
        <ElTableColumn prop="name" label="店名" min-width="140" />
        <ElTableColumn prop="phone" label="电话" width="130" />
        <ElTableColumn prop="planName" label="套餐" width="100" />
        <ElTableColumn label="订阅" width="90">
          <template #default="{ row }">{{ subLabel[row.subscriptionStatus] || '—' }}</template>
        </ElTableColumn>
        <ElTableColumn label="到期" width="120">
          <template #default="{ row }">{{ row.expireAt ? String(row.expireAt).slice(0, 10) : '—' }}</template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ statusLabel[row.status] }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <ElButton v-if="row.status === 1" link type="warning" @click="freeze(row)">冻结</ElButton>
            <ElButton v-else link type="success" @click="unfreeze(row)">解冻</ElButton>
            <ElButton link type="primary" @click="renew(row)">续 1 个月</ElButton>
            <ElButton link @click="resetPwd(row)">重置密码</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-12px flex justify-end">
        <ElPagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="load"
        />
      </div>
    </ElCard>

    <ElDialog v-model="createVisible" title="开通店铺" width="520px">
      <ElForm label-width="96px">
        <ElFormItem label="店名" required>
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="电话">
          <ElInput v-model="form.phone" />
        </ElFormItem>
        <ElFormItem label="地址">
          <ElInput v-model="form.address" />
        </ElFormItem>
        <ElFormItem label="老板账号" required>
          <ElInput v-model="form.username" />
        </ElFormItem>
        <ElFormItem label="初始密码" required>
          <ElInput v-model="form.password" />
        </ElFormItem>
        <ElFormItem label="套餐">
          <ElSelect v-model="form.planCode" class="w-full">
            <ElOption
              v-for="p in plans"
              :key="p.code"
              :value="p.code"
              :label="`${p.name}${p.priceMonth ? ` · ¥${fenToYuan(p.priceMonth)}/月` : ' · 试用'}`"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="creating" @click="submitCreate">开通</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
