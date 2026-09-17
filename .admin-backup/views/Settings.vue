<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';

const form = reactive({ name: '', address: '', phone: '', logo: '' });
const qrcode = ref<any>(null);

onMounted(async () => {
  const shop: any = await adminApi.getShop();
  form.name = shop.name;
  form.address = shop.address || '';
  form.phone = shop.phone || '';
  form.logo = shop.logo || '';
  qrcode.value = await adminApi.getShopQrcode();
});

async function save() {
  await adminApi.updateShop(form);
  ElMessage.success('已保存');
}

async function refreshQrcode() {
  qrcode.value = await adminApi.getShopQrcode();
}

async function onLogoChange(uploadFile: { raw?: File }) {
  if (!uploadFile.raw) return;
  const { url } = await adminApi.uploadImage(uploadFile.raw);
  form.logo = url;
}
</script>

<template>
  <div class="list-page">
    <h2>店铺设置</h2>
    <el-form label-width="80px" style="max-width:480px;margin-top:16px">
      <el-form-item label="店名"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
      <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
      <el-form-item label="Logo">
        <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="onLogoChange">
          <el-button>上传 Logo</el-button>
        </el-upload>
        <img v-if="form.logo" :src="form.logo" class="logo-preview" />
      </el-form-item>
      <el-button type="primary" @click="save">保存</el-button>
    </el-form>

    <h3 style="margin-top:32px">店铺小程序码</h3>
    <div class="qrcode-box">
      <img v-if="qrcode?.qrcodeBase64" :src="qrcode.qrcodeBase64" alt="店铺码" class="qrcode" />
      <el-alert v-else-if="qrcode?.dev" :title="qrcode.tip" type="info" show-icon :closable="false" />
      <p v-if="qrcode?.scene" class="meta">Scene: {{ qrcode.scene }} · Page: {{ qrcode.page }}</p>
      <el-button style="margin-top:12px" @click="refreshQrcode">刷新小程序码</el-button>
    </div>
  </div>
</template>

<style scoped>
.qrcode-box { margin-top: 16px; }
.qrcode { width: 200px; height: 200px; border: 1px solid #eee; }
.meta { color: #6b7280; font-size: 13px; margin-top: 8px; }
.logo-preview { width: 80px; height: 80px; object-fit: cover; margin-top: 8px; border-radius: 8px; display: block; }
</style>
