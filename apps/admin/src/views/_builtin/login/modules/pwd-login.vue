<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FormItemRule } from 'element-plus';
import { useAuthStore } from '@/store/modules/auth';
import { useForm, useFormRules } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({ name: 'PwdLogin' });

const authStore = useAuthStore();
const { formRef, validate } = useForm();

interface FormModel {
  shopId: string;
  userName: string;
  password: string;
}

const model = ref<FormModel>({
  shopId: '10000000001',
  userName: 'admin',
  password: 'admin123'
});

const shopIdRules: FormItemRule[] = [
  {
    validator: (_rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!/^\d{1,20}$/.test(String(value))) {
        callback(new Error('店铺 ID 须为数字'));
        return;
      }
      callback();
    },
    trigger: 'blur'
  }
];

const rules = computed(() => {
  const { formRules } = useFormRules();
  return {
    shopId: shopIdRules,
    userName: formRules.userName,
    password: formRules.pwd
  };
});

function onShopIdInput(value: string) {
  model.value.shopId = value.replace(/\D/g, '').slice(0, 20);
}

async function handleSubmit() {
  await validate();
  await authStore.login(model.value.userName, model.value.password, model.value.shopId);
}
</script>

<template>
  <ElForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="handleSubmit">
    <ElFormItem prop="shopId">
      <ElInput
        :model-value="model.shopId"
        placeholder="店铺 ID（老板可留空；平台账号无需填写）"
        maxlength="20"
        inputmode="numeric"
        autocomplete="off"
        @update:model-value="onShopIdInput"
      />
    </ElFormItem>
    <ElFormItem prop="userName">
      <ElInput v-model="model.userName" :placeholder="$t('page.login.common.userNamePlaceholder')" />
    </ElFormItem>
    <ElFormItem prop="password">
      <ElInput
        v-model="model.password"
        type="password"
        show-password-on="click"
        :placeholder="$t('page.login.common.passwordPlaceholder')"
      />
    </ElFormItem>
    <ElSpace direction="vertical" :size="24" class="w-full" fill>
      <ElButton type="primary" size="large" round block :loading="authStore.loginLoading" @click="handleSubmit">
        登录
      </ElButton>
    </ElSpace>
  </ElForm>
</template>

<style scoped></style>
