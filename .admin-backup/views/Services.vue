<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';
import { fenToYuan } from '@/utils/format';

const list = ref<any[]>([]);
const staffList = ref<any[]>([]);
const dialog = ref(false);
const editingId = ref(0);
const form = reactive({ name: '', price: 68, duration: 60, cover: '', staffIds: [] as number[] });

function openCreate() {
  editingId.value = 0;
  form.name = '';
  form.price = 68;
  form.duration = 60;
  form.cover = '';
  form.staffIds = [];
  dialog.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  form.name = row.name;
  form.price = Number(fenToYuan(row.price));
  form.duration = row.duration;
  form.cover = row.cover || '';
  form.staffIds = Array.isArray(row.staffIds) ? [...row.staffIds] : [];
  dialog.value = true;
}

async function load() {
  [list.value, staffList.value] = await Promise.all([adminApi.listServices(), adminApi.listStaff()]);
}

function staffNames(ids: number[] | null) {
  if (!ids?.length) return '全部技师';
  return ids
    .map((id) => staffList.value.find((s) => s.id === id)?.name || id)
    .join('、');
}

async function save() {
  const payload = {
    name: form.name,
    price: Math.round(form.price * 100),
    duration: form.duration,
    cover: form.cover || undefined,
    staffIds: form.staffIds.length ? form.staffIds : null,
  };
  if (editingId.value) {
    await adminApi.updateService(editingId.value, payload);
    ElMessage.success('已更新');
  } else {
    await adminApi.createService(payload);
    ElMessage.success('已添加');
  }
  dialog.value = false;
  load();
}

async function remove(row: any) {
  await adminApi.deleteService(row.id);
  ElMessage.success('已下架');
  load();
}

async function onCoverChange(uploadFile: { raw?: File }) {
  if (!uploadFile.raw) return;
  const { url } = await adminApi.uploadImage(uploadFile.raw);
  form.cover = url;
}

onMounted(load);
</script>

<template>
  <div class="list-page">
    <div class="toolbar">
      <h2>项目管理</h2>
      <el-button type="primary" @click="openCreate">新增项目</el-button>
    </div>
    <el-table :data="list" stripe>
      <el-table-column label="封面" width="70">
        <template #default="{ row }">
          <img v-if="row.cover" :src="row.cover" class="thumb" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" />
      <el-table-column label="价格"><template #default="{ row }">¥{{ fenToYuan(row.price) }}</template></el-table-column>
      <el-table-column prop="duration" label="时长(分)" />
      <el-table-column label="适用技师">
        <template #default="{ row }">{{ staffNames(row.staffIds) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="70" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">下架</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialog" :title="editingId ? '编辑项目' : '新增项目'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="价格(元)"><el-input-number v-model="form.price" :min="0" /></el-form-item>
        <el-form-item label="时长"><el-input-number v-model="form.duration" :min="15" :step="15" /></el-form-item>
        <el-form-item label="适用技师">
          <el-select v-model="form.staffIds" multiple clearable placeholder="不选则全部技师可服务" style="width:100%">
            <el-option v-for="s in staffList.filter((x) => x.status === 1)" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面">
          <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="onCoverChange">
            <el-button>上传图片</el-button>
          </el-upload>
          <img v-if="form.cover" :src="form.cover" class="cover-preview" />
        </el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.cover-preview { width: 80px; height: 80px; object-fit: cover; margin-top: 8px; border-radius: 8px; }
.thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; }
</style>
