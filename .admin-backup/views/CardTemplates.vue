<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';
import { fenToYuan } from '@/utils/format';

const list = ref<any[]>([]);
const dialog = ref(false);
const editingId = ref(0);
const form = reactive({ name: '', type: 2, price: 580, value: 10, validDays: 180, status: 1 });

function openCreate() {
  editingId.value = 0;
  Object.assign(form, { name: '', type: 2, price: 580, value: 10, validDays: 180, status: 1 });
  dialog.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  form.name = row.name;
  form.type = row.type;
  form.price = Number(fenToYuan(row.price));
  form.value = row.value;
  form.validDays = row.validDays;
  form.status = row.status;
  dialog.value = true;
}

async function load() {
  list.value = await adminApi.listCardTemplates();
}

async function save() {
  const payload = {
    name: form.name,
    type: form.type,
    price: Math.round(form.price * 100),
    value: form.value,
    validDays: form.validDays,
    ...(editingId.value ? { status: form.status } : {}),
  };
  if (editingId.value) {
    await adminApi.updateCardTemplate(editingId.value, payload);
    ElMessage.success('已更新');
  } else {
    await adminApi.createCardTemplate(payload);
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
      <h2>卡种管理</h2>
      <el-button type="primary" @click="openCreate">新增卡种</el-button>
    </div>
    <el-table :data="list" stripe>
      <el-table-column prop="name" label="名称" />
      <el-table-column label="类型"><template #default="{ row }">{{ ({ 1: '储值', 2: '次卡', 3: '期限' } as Record<number, string>)[row.type] }}</template></el-table-column>
      <el-table-column label="售价"><template #default="{ row }">¥{{ fenToYuan(row.price) }}</template></el-table-column>
      <el-table-column prop="value" label="面值/次数" />
      <el-table-column prop="validDays" label="有效天数" />
      <el-table-column prop="status" label="状态" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }"><el-button link @click="openEdit(row)">编辑</el-button></template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialog" :title="editingId ? '编辑卡种' : '新增卡种'" width="420px">
      <el-form label-width="90px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="form.type"><el-option :value="1" label="储值" /><el-option :value="2" label="次卡" /><el-option :value="3" label="期限" /></el-select></el-form-item>
        <el-form-item label="售价(元)"><el-input-number v-model="form.price" /></el-form-item>
        <el-form-item label="面值/次数"><el-input-number v-model="form.value" /></el-form-item>
        <el-form-item label="有效天数"><el-input-number v-model="form.validDays" /></el-form-item>
        <el-form-item v-if="editingId" label="状态"><el-select v-model="form.status"><el-option :value="1" label="上架" /><el-option :value="0" label="下架" /></el-select></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>
