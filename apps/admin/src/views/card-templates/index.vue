<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';
import { buildCardBenefits } from '@/utils/card-benefits';
import {
  CARD_DEDUCT_MODE_LABELS,
  type CardDeductMode,
  type CardTypeDefinition,
  getEnabledCardTypes,
  mergeCardTypes,
  nextCardTypeId,
} from '@/constants/card-types';
import { fenToYuan, normalizeNumericId, normalizeNumericIds, formatCardTemplateNo } from '@/utils/format';

const list = ref<any[]>([]);
const services = ref<any[]>([]);
const cardTypes = ref<CardTypeDefinition[]>([]);
const loading = ref(false);
const dialog = ref(false);
const typeDialog = ref(false);
const editingId = ref(0);
const typeDraft = ref<CardTypeDefinition[]>([]);
const form = reactive({
  name: '',
  type: 2,
  price: 580,
  value: 10,
  validDays: 180,
  serviceIds: [] as number[],
  description: '',
  status: 1,
});

const enabledCardTypes = computed(() => getEnabledCardTypes(cardTypes.value));

const selectedTypeDef = computed(() => cardTypes.value.find((item) => item.id === form.type));

const formDeductMode = computed<CardDeductMode>(() => selectedTypeDef.value?.deductMode ?? 'times');

const isBalanceType = computed(() => formDeductMode.value === 'balance');

const benefitPreview = computed(() =>
  buildCardBenefits({
    deductMode: formDeductMode.value,
    value: isBalanceType.value ? Math.round(form.value * 100) : form.value,
    validDays: form.validDays,
    serviceNames: services.value
      .filter((s) => form.serviceIds.includes(normalizeNumericId(s.id)))
      .map((s) => s.name),
  }),
);

function typeName(typeId: number) {
  return cardTypes.value.find((item) => item.id === Number(typeId))?.name ?? '会员卡';
}

function rowValueText(row: any) {
  const deductMode = row.deductMode ?? cardTypes.value.find((item) => item.id === Number(row.type))?.deductMode ?? 'times';
  if (deductMode === 'balance') return `¥${fenToYuan(row.value)}`;
  if (deductMode === 'period') return '有效期内';
  return `${row.value} 次`;
}

function rowBenefitText(row: any) {
  const ids = new Set(normalizeNumericIds(row.serviceIds));
  const deductMode = row.deductMode ?? cardTypes.value.find((item) => item.id === row.type)?.deductMode ?? 'times';
  return buildCardBenefits({
    deductMode,
    value: row.value,
    validDays: row.validDays,
    serviceNames: services.value.filter((s) => ids.has(normalizeNumericId(s.id))).map((s) => s.name),
  }).join('；');
}

function defaultFormType() {
  return enabledCardTypes.value[0]?.id ?? cardTypes.value[0]?.id ?? 2;
}

function openCreate() {
  editingId.value = 0;
  Object.assign(form, {
    name: '',
    type: defaultFormType(),
    price: 580,
    value: 10,
    validDays: 180,
    serviceIds: [],
    description: '',
    status: 1,
  });
  dialog.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  const deductMode = row.deductMode ?? cardTypes.value.find((item) => item.id === row.type)?.deductMode ?? 'times';
  form.name = row.name;
  form.type = row.type;
  form.price = Number(fenToYuan(row.price));
  form.value = deductMode === 'balance' ? Number(fenToYuan(row.value)) : row.value;
  form.validDays = row.validDays;
  form.serviceIds = normalizeNumericIds(row.serviceIds);
  form.description = row.description || '';
  form.status = row.status;
  dialog.value = true;
}

function openTypeDialog() {
  typeDraft.value = cardTypes.value.map((item) => ({ ...item }));
  typeDialog.value = true;
}

function addCardType() {
  typeDraft.value.push({
    id: nextCardTypeId(typeDraft.value),
    name: '',
    deductMode: 'times',
    theme: 'times',
    enabled: true,
  });
}

function removeCardType(index: number) {
  typeDraft.value.splice(index, 1);
}

async function load() {
  loading.value = true;
  try {
    const [templates, serviceList, shop] = await Promise.all([
      adminApi.listCardTemplates(),
      adminApi.listServices(),
      adminApi.getShop(),
    ]);
    list.value = templates;
    services.value = serviceList.map((s) => ({ ...s, id: normalizeNumericId(s.id) }));
    cardTypes.value = mergeCardTypes(shop.cardTypes);
  } finally {
    loading.value = false;
  }
}

async function saveTypes() {
  const names = new Set<number>();
  for (const item of typeDraft.value) {
    const name = item.name.trim();
    if (!name) {
      ElMessage.warning('请填写卡类型名称');
      return;
    }
    if (names.has(item.id)) {
      ElMessage.warning('卡类型 ID 不能重复');
      return;
    }
    names.add(item.id);
    item.name = name;
    if (item.theme !== 'balance' && item.theme !== 'times' && item.theme !== 'period') {
      item.theme = item.deductMode;
    }
  }
  await adminApi.updateShop({ cardTypes: typeDraft.value });
  cardTypes.value = mergeCardTypes(typeDraft.value);
  typeDialog.value = false;
  ElMessage.success('卡类型已保存');
  load();
}

async function save() {
  const typeDef = cardTypes.value.find((item) => item.id === form.type);
  if (!typeDef || !typeDef.enabled) {
    ElMessage.warning('请选择有效的卡类型');
    return;
  }
  if ((typeDef.deductMode === 'times' || typeDef.deductMode === 'period') && !form.serviceIds.length) {
    ElMessage.warning('次卡/周期卡请至少选择一个适用项目（核销规则）');
    return;
  }
  const payload = {
    name: form.name,
    type: form.type,
    price: Math.round(form.price * 100),
    value: typeDef.deductMode === 'balance' ? Math.round(form.value * 100) : form.value,
    validDays: form.validDays,
    serviceIds: form.serviceIds.length ? form.serviceIds : null,
    description: form.description.trim() || null,
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
  <BizPage title="卡种管理" :loading="loading" @refresh="load">
    <template #extra>
      <ElButton @click="openTypeDialog">卡类型配置</ElButton>
      <ElButton type="primary" @click="openCreate">
        <template #icon><icon-ic-round-plus class="text-icon" /></template>
        新增卡种
      </ElButton>
    </template>
    <BizTable :data="list" :loading="loading">
      <ElTableColumn label="卡种编号" width="110" align="center">
        <template #default="{ row }">{{ formatCardTemplateNo(row.id) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="name" label="名称" min-width="120" />
      <ElTableColumn label="类型" width="130" align="center">
        <template #default="{ row }">
          <div class="type-cell">
            <span>{{ row.typeName || typeName(row.type) }}</span>
            <span class="type-cell__mode">{{ CARD_DEDUCT_MODE_LABELS[(row.deductMode || 'times') as CardDeductMode].split('（')[0] }}</span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="售价" width="100" align="right">
        <template #default="{ row }">¥{{ fenToYuan(row.price) }}</template>
      </ElTableColumn>
      <ElTableColumn label="面值/次数" width="110" align="center">
        <template #default="{ row }">{{ rowValueText(row) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="validDays" label="有效天数" width="100" align="center" />
      <ElTableColumn label="核销权益" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ rowBenefitText(row) }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="80" align="center">
        <template #default="{ row }">
          <ElTag :type="row.status === 1 ? 'success' : 'info'" size="small" effect="light">
            {{ row.status === 1 ? '上架' : '下架' }}
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

    <ElDialog v-model="typeDialog" title="卡类型配置" width="720px">
      <p class="form-tip dialog-tip">可自定义卡类型名称与核销方式，已有卡种仍按类型 ID 关联。</p>
      <ElTable :data="typeDraft" border size="small">
        <ElTableColumn label="名称" min-width="140">
          <template #default="{ row }">
            <ElInput v-model="row.name" placeholder="如：疗程卡" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="核销方式" min-width="220">
          <template #default="{ row }">
            <ElSelect v-model="row.deductMode" style="width: 100%">
              <ElOption
                v-for="(label, key) in CARD_DEDUCT_MODE_LABELS"
                :key="key"
                :value="key"
                :label="label"
              />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="卡面配色" width="120">
          <template #default="{ row }">
            <ElSelect v-model="row.theme">
              <ElOption value="balance" label="金色" />
              <ElOption value="times" label="蓝色" />
              <ElOption value="period" label="紫色" />
            </ElSelect>
          </template>
        </ElTableColumn>
        <ElTableColumn label="启用" width="70" align="center">
          <template #default="{ row }">
            <ElSwitch v-model="row.enabled" />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="70" align="center">
          <template #default="{ $index }">
            <ElButton link type="danger" @click="removeCardType($index)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="type-actions">
        <ElButton @click="addCardType">新增类型</ElButton>
      </div>
      <template #footer>
        <ElButton @click="typeDialog = false">取消</ElButton>
        <ElButton type="primary" @click="saveTypes">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="dialog" :title="editingId ? '编辑卡种' : '新增卡种'" width="560px">
      <ElForm label-width="100px">
        <ElFormItem v-if="editingId" label="卡种编号">
          <ElInput :model-value="formatCardTemplateNo(editingId)" disabled />
        </ElFormItem>
        <ElFormItem label="名称"><ElInput v-model="form.name" placeholder="如：洗剪吹 10 次卡" /></ElFormItem>
        <ElFormItem label="类型">
          <ElSelect v-model="form.type" style="width: 100%">
            <ElOption
              v-for="item in enabledCardTypes"
              :key="item.id"
              :value="item.id"
              :label="`${item.name}（${CARD_DEDUCT_MODE_LABELS[item.deductMode]}）`"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="售价(元)"><ElInputNumber v-model="form.price" :min="0" /></ElFormItem>
        <ElFormItem :label="isBalanceType ? '到账金额(元)' : formDeductMode === 'period' ? '标识值' : '次数'">
          <ElInputNumber v-model="form.value" :min="0" :precision="isBalanceType ? 2 : 0" />
        </ElFormItem>
        <ElFormItem label="有效天数"><ElInputNumber v-model="form.validDays" :min="0" /></ElFormItem>
        <ElFormItem label="适用项目">
          <ElSelect v-model="form.serviceIds" multiple collapse-tags collapse-tags-tooltip placeholder="不选则适用全部项目" style="width: 100%">
            <ElOption v-for="s in services" :key="s.id" :value="s.id" :label="s.name" />
          </ElSelect>
          <p class="form-tip">核销时仅可选用卡项目；次卡/周期卡建议必选</p>
        </ElFormItem>
        <ElFormItem label="权益预览">
          <div class="benefit-preview">
            <p v-for="(line, index) in benefitPreview" :key="index">{{ line }}</p>
          </div>
        </ElFormItem>
        <ElFormItem label="补充说明">
          <ElInput
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="可选，仅作营销展示，不影响核销规则"
          />
        </ElFormItem>
        <ElFormItem v-if="editingId" label="状态">
          <ElSelect v-model="form.status"><ElOption :value="1" label="上架" /><ElOption :value="0" label="下架" /></ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer><ElButton type="primary" @click="save">保存</ElButton></template>
    </ElDialog>
  </BizPage>
</template>

<style scoped lang="scss">
.form-tip {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.dialog-tip {
  margin: 0 0 12px;
}

.type-actions {
  margin-top: 12px;
}

.type-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.3;
}

.type-cell__mode {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.benefit-preview {
  width: 100%;
  padding: 12px 14px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);

  p {
    margin: 0;
  }
}
</style>
