<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';
import { fenToYuan } from '@/utils/format';
import type { MiniHighlight } from '@/constants/mini-display';
import { DEFAULT_SERVICE_DEPOSIT_RATIO, DepositType, calcServiceDepositPreview } from '@/constants/deposit';

const list = ref<any[]>([]);
const staffList = ref<any[]>([]);
const loading = ref(false);
const dialog = ref(false);
const dialogTab = ref('basic');
const editingId = ref(0);
const form = reactive({
  name: '',
  price: 68,
  duration: 60,
  cover: '',
  description: '',
  tags: [] as string[],
  highlights: [] as MiniHighlight[],
  staffIds: [] as number[],
  depositRatio: DEFAULT_SERVICE_DEPOSIT_RATIO,
  depositType: DepositType.RATIO,
  depositFixedYuan: 10,
});

function resetForm() {
  form.name = '';
  form.price = 68;
  form.duration = 60;
  form.cover = '';
  form.description = '';
  form.tags = [];
  form.highlights = [];
  form.staffIds = [];
  form.depositRatio = DEFAULT_SERVICE_DEPOSIT_RATIO;
  form.depositType = DepositType.RATIO;
  form.depositFixedYuan = 10;
}

function openCreate() {
  editingId.value = 0;
  dialogTab.value = 'basic';
  resetForm();
  dialog.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  dialogTab.value = 'basic';
  form.name = row.name;
  form.price = Number(fenToYuan(row.price));
  form.duration = row.duration;
  form.cover = row.cover || '';
  form.description = row.description || '';
  form.tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  form.highlights = Array.isArray(row.highlights)
    ? row.highlights.map((h: MiniHighlight) => ({ ...h }))
    : [];
  form.staffIds = Array.isArray(row.staffIds)
    ? row.staffIds.map((id: unknown) => Number(id)).filter((id: number) => id > 0)
    : [];
  form.depositType = Number(row.depositType ?? (Number(row.depositRatio) === 0 ? DepositType.NONE : DepositType.RATIO));
  form.depositRatio = Number(row.depositRatio ?? DEFAULT_SERVICE_DEPOSIT_RATIO);
  form.depositFixedYuan = Number(fenToYuan(row.depositFixed || 0)) || 10;
  dialog.value = true;
}

async function load() {
  loading.value = true;
  try {
    const [services, staff] = await Promise.all([adminApi.listServices(), adminApi.listStaff()]);
    list.value = (services || []).map((item: any) => ({
      ...item,
      id: Number(item.id),
      staffIds: Array.isArray(item.staffIds)
        ? item.staffIds.map((id: unknown) => Number(id)).filter((id: number) => id > 0)
        : item.staffIds,
    }));
    staffList.value = (staff || []).map((item: any) => ({
      ...item,
      id: Number(item.id),
      status: Number(item.status),
    }));
  } finally {
    loading.value = false;
  }
}

const activeStaffOptions = computed(() => staffList.value.filter((item) => item.status === 1));

const depositPreviewText = computed(() =>
  calcServiceDepositPreview(
    form.price,
    form.depositType,
    form.depositRatio,
    form.depositFixedYuan,
  ),
);

function staffNames(ids: number[] | null) {
  if (!ids?.length) return '全部技师';
  return ids
    .map((id) => staffList.value.find((s) => Number(s.id) === Number(id))?.name || id)
    .join('、');
}

function tagPreview(row: any) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  return tags.length ? tags.join('、') : '未设置';
}

async function save() {
  const payload = {
    name: form.name,
    price: Math.round(form.price * 100),
    duration: form.duration,
    cover: form.cover || undefined,
    description: form.description || undefined,
    tags: form.tags.map((t) => t.trim()).filter(Boolean),
    highlights: form.highlights
      .map((h) => ({
        icon: h.icon?.trim() || '✨',
        title: h.title?.trim() || '',
        desc: h.desc?.trim() || '',
      }))
      .filter((h) => h.title),
    staffIds: form.staffIds.length ? form.staffIds : null,
    depositType: Number(form.depositType),
    depositRatio: form.depositType === DepositType.RATIO ? Number(form.depositRatio) : 0,
    depositFixed:
      form.depositType === DepositType.FIXED ? Math.round(form.depositFixedYuan * 100) : 0,
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

function addTag() {
  form.tags.push('');
}

function removeTag(index: number) {
  form.tags.splice(index, 1);
}

function addHighlight() {
  form.highlights.push({ icon: '✨', title: '', desc: '' });
}

function removeHighlight(index: number) {
  form.highlights.splice(index, 1);
}

onMounted(load);
</script>

<template>
  <BizPage title="项目管理" :loading="loading" @refresh="load">
    <template #extra>
      <ElButton type="primary" @click="openCreate">
        <template #icon><icon-ic-round-plus class="text-icon" /></template>
        新增项目
      </ElButton>
    </template>
    <BizTable :data="list" :loading="loading">
      <ElTableColumn label="封面" width="70">
        <template #default="{ row }">
          <img v-if="row.cover" :src="row.cover" class="biz-thumb" />
          <span v-else>-</span>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="name" label="名称" width="110" />
      <ElTableColumn label="展示标签" min-width="140">
        <template #default="{ row }">
          <span :class="{ 'desc-empty': !row.tags?.length }">{{ tagPreview(row) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="项目介绍" min-width="200">
        <template #default="{ row }">
          <ElTooltip v-if="row.description" :content="row.description" placement="top" :show-after="200">
            <span class="desc-cell">{{ row.description }}</span>
          </ElTooltip>
          <span v-else class="desc-empty">未设置</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="价格" width="90"><template #default="{ row }">¥{{ fenToYuan(row.price) }}</template></ElTableColumn>
      <ElTableColumn prop="duration" label="时长(分)" width="90" align="center" />
      <ElTableColumn label="适用技师" min-width="120">
        <template #default="{ row }">{{ staffNames(row.staffIds) }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="80" align="center">
        <template #default="{ row }">
          <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small" effect="light">
            {{ row.status === 1 ? '上架' : '下架' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <div class="biz-actions">
            <ElButton plain size="small" type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton plain size="small" type="danger" @click="remove(row)">下架</ElButton>
          </div>
        </template>
      </ElTableColumn>
    </BizTable>
    <ElDialog
      v-model="dialog"
      :title="editingId ? '编辑项目' : '新增项目'"
      width="720px"
      top="4vh"
      append-to-body
      destroy-on-close
      class="service-dialog"
    >
      <ElTabs v-model="dialogTab" class="service-dialog__tabs">
        <ElTabPane label="基本信息" name="basic">
          <ElForm label-width="96px" class="service-form">
            <ElFormItem label="名称"><ElInput v-model="form.name" /></ElFormItem>
            <ElFormItem label="价格(元)"><ElInputNumber v-model="form.price" :min="0" /></ElFormItem>
            <ElFormItem label="时长"><ElInputNumber v-model="form.duration" :min="15" :step="15" /></ElFormItem>
            <ElFormItem label="项目介绍">
              <ElInput v-model="form.description" type="textarea" :rows="4" placeholder="展示在小程序项目详情页" />
            </ElFormItem>
            <ElFormItem label="适用技师">
              <ElSelect
                v-model="form.staffIds"
                multiple
                clearable
                placeholder="不选则全部技师可服务"
                style="width:100%"
              >
                <ElOption
                  v-for="s in activeStaffOptions"
                  :key="s.id"
                  :label="s.name"
                  :value="s.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="预约订金">
              <div class="stack-block">
                <ElRadioGroup v-model="form.depositType">
                  <ElRadio :value="DepositType.RATIO">按比例</ElRadio>
                  <ElRadio :value="DepositType.FIXED">固定金额</ElRadio>
                  <ElRadio :value="DepositType.NONE">不收订金</ElRadio>
                </ElRadioGroup>
                <div v-if="form.depositType === DepositType.RATIO" class="deposit-field">
                  <ElInputNumber
                    v-model="form.depositRatio"
                    :min="1"
                    :max="100"
                    :step="5"
                    controls-position="right"
                  />
                  <span class="deposit-field__unit">%</span>
                </div>
                <div v-else-if="form.depositType === DepositType.FIXED" class="deposit-field">
                  <ElInputNumber
                    v-model="form.depositFixedYuan"
                    :min="0.01"
                    :step="1"
                    :precision="2"
                    controls-position="right"
                  />
                  <span class="deposit-field__unit">元</span>
                </div>
                <p v-if="form.depositType !== DepositType.NONE" class="field-hint">
                  当前预计订金 ¥{{ depositPreviewText }}
                </p>
              </div>
            </ElFormItem>
            <ElFormItem label="封面">
              <ElUpload :auto-upload="false" :show-file-list="false" accept="image/*" @change="onCoverChange">
                <ElButton>上传图片</ElButton>
              </ElUpload>
              <img v-if="form.cover" :src="form.cover" class="biz-cover-preview" />
            </ElFormItem>
          </ElForm>
        </ElTabPane>
        <ElTabPane label="展示配置" name="display">
          <ElForm label-width="96px" class="service-form">
            <ElFormItem label="展示标签">
              <div class="stack-block">
                <div v-for="(_, idx) in form.tags" :key="idx" class="inline-row">
                  <ElInput v-model="form.tags[idx]" placeholder="如：专业染发、进口染膏" />
                  <ElButton text type="danger" @click="removeTag(idx)">删除</ElButton>
                </div>
                <ElButton @click="addTag">添加标签</ElButton>
                <p class="field-hint">展示在详情页价格下方（时长旁），留空则小程序不展示</p>
              </div>
            </ElFormItem>
            <ElFormItem label="服务亮点">
              <div class="stack-block">
                <div v-for="(item, idx) in form.highlights" :key="idx" class="highlight-card">
                  <div class="inline-row">
                    <ElInput v-model="item.icon" placeholder="图标" style="width: 72px" />
                    <ElInput v-model="item.title" placeholder="标题" />
                  </div>
                  <ElInput v-model="item.desc" placeholder="描述" class="mt-8px" />
                  <ElButton text type="danger" @click="removeHighlight(idx)">删除</ElButton>
                </div>
                <ElButton @click="addHighlight">添加亮点</ElButton>
                <p class="field-hint">展示在详情页「服务亮点」区块，留空则小程序不展示</p>
              </div>
            </ElFormItem>
          </ElForm>
        </ElTabPane>
      </ElTabs>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" @click="save">保存</ElButton>
      </template>
    </ElDialog>
  </BizPage>
</template>

<style scoped lang="scss">
.desc-cell {
  display: block;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1.5;
  cursor: default;
}

.desc-empty {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.service-form {
  padding: 4px 12px 8px 0;
  max-height: min(62vh, 560px);
  overflow-y: auto;
}

:deep(.service-dialog) {
  .el-dialog__body {
    padding-top: 8px;
    padding-bottom: 12px;
  }
}

.service-dialog__tabs {
  :deep(.el-tabs__content) {
    padding-top: 4px;
  }
}

.stack-block {
  width: 100%;
}

.inline-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;

  .el-input {
    flex: 1;
  }
}

.highlight-card {
  padding: 12px;
  margin-bottom: 10px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.mt-8px {
  margin-top: 8px;
}

.deposit-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.deposit-field__unit {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
