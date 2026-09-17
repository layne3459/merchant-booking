<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';

const list = ref<any[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editingId = ref(0);
const form = reactive({ name: '', phone: '', role: 3, status: 1 });

function openCreate() {
  editingId.value = 0;
  form.name = '';
  form.phone = '';
  form.role = 3;
  form.status = 1;
  dialog.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  form.name = row.name;
  form.phone = row.phone || '';
  form.role = row.role;
  form.status = row.status;
  dialog.value = true;
}

async function load() {
  loading.value = true;
  try {
    list.value = await adminApi.listStaff();
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (editingId.value) {
    await adminApi.updateStaff(editingId.value, form);
    ElMessage.success('已更新');
  } else {
    await adminApi.createStaff(form);
    ElMessage.success('已添加');
  }
  dialog.value = false;
  load();
}

onMounted(load);
</script>

<template>
  <BizPage title="员工管理" :loading="loading" @refresh="load">
    <template #extra>
      <ElButton type="primary" @click="openCreate">
        <template #icon><icon-ic-round-plus class="text-icon" /></template>
        新增员工
      </ElButton>
    </template>
    <BizTable :data="list" :loading="loading">
      <ElTableColumn prop="name" label="姓名" min-width="100" />
      <ElTableColumn prop="phone" label="手机" width="120" />
      <ElTableColumn label="角色" width="90" align="center">
        <template #default="{ row }">{{ ({ 1: '老板', 2: '店长', 3: '店员' } as Record<number, string>)[row.role] }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="80" align="center">
        <template #default="{ row }">
          <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small" effect="light">
            {{ row.status === 1 ? '在职' : '停用' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <div class="biz-actions">
            <ElButton plain size="small" type="primary" @click="openEdit(row)">编辑</ElButton>
          </div>
        </template>
      </ElTableColumn>
    </BizTable>
    <ElDialog v-model="dialog" :title="editingId ? '编辑员工' : '新增员工'" width="420px">
      <ElForm label-width="80px">
        <ElFormItem label="姓名"><ElInput v-model="form.name" /></ElFormItem>
        <ElFormItem label="手机"><ElInput v-model="form.phone" /></ElFormItem>
        <ElFormItem label="角色"><ElSelect v-model="form.role"><ElOption :value="3" label="店员" /><ElOption :value="2" label="店长" /></ElSelect></ElFormItem>
        <ElFormItem v-if="editingId" label="状态"><ElSelect v-model="form.status"><ElOption :value="1" label="在职" /><ElOption :value="0" label="停用" /></ElSelect></ElFormItem>
      </ElForm>
      <template #footer><ElButton type="primary" @click="save">保存</ElButton></template>
    </ElDialog>
  </BizPage>
</template>
