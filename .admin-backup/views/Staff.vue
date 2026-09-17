<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';

const list = ref<any[]>([]);
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
  list.value = await adminApi.listStaff();
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
  <div class="list-page">
    <div class="toolbar">
      <h2>员工管理</h2>
      <el-button type="primary" @click="openCreate">新增员工</el-button>
    </div>
    <el-table :data="list" stripe>
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="phone" label="手机" />
      <el-table-column label="角色">
        <template #default="{ row }">{{ ({ 1: '老板', 2: '店长', 3: '店员' } as Record<number, string>)[row.role] }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }"><el-button link @click="openEdit(row)">编辑</el-button></template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialog" :title="editingId ? '编辑员工' : '新增员工'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="手机"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="角色"><el-select v-model="form.role"><el-option :value="3" label="店员" /><el-option :value="2" label="店长" /></el-select></el-form-item>
        <el-form-item v-if="editingId" label="状态"><el-select v-model="form.status"><el-option :value="1" label="在职" /><el-option :value="0" label="停用" /></el-select></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>
