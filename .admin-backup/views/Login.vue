<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { Lock, User } from '@element-plus/icons-vue';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = reactive({ username: 'admin', password: 'admin123', shopId: 1 });

async function submit() {
  loading.value = true;
  try {
    const data: any = await authApi.login(form);
    auth.setAuth(data.token, data.admin);
    ElMessage.success('登录成功');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-left">
      <div class="hero">
        <h1>商家预约 · 会员管理</h1>
        <p>预约排班、会员开卡、核销流水，一站式门店经营后台</p>
        <ul>
          <li>今日预约与到店管理</li>
          <li>会员卡充值与流水对账</li>
          <li>项目排班与员工配置</li>
        </ul>
      </div>
    </div>
    <div class="login-right">
      <div class="form-box">
        <div class="form-header">
          <div class="logo">店</div>
          <h2>欢迎登录</h2>
          <p>商家预约管理后台</p>
        </div>
        <el-form size="large" @submit.prevent="submit">
          <el-form-item label="店铺 ID">
            <el-input-number v-model="form.shopId" :min="1" controls-position="right" style="width:100%" />
          </el-form-item>
          <el-form-item label="账号">
            <el-input v-model="form.username" placeholder="请输入账号">
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password>
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-button type="primary" :loading="loading" class="submit-btn" @click="submit">登 录</el-button>
        </el-form>
        <p class="hint">演示账号 admin / admin123 · 店铺 ID 填 1</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  position: relative;
  overflow: hidden;
}

.login-left::before {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
  top: -100px;
  right: -100px;
  border-radius: 50%;
}

.hero {
  max-width: 420px;
  color: #fff;
  position: relative;
  z-index: 1;
}

.hero h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 16px;
  line-height: 1.3;
}

.hero p {
  font-size: 16px;
  opacity: 0.85;
  margin: 0 0 32px;
  line-height: 1.6;
}

.hero ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.hero li {
  padding: 10px 0;
  padding-left: 24px;
  position: relative;
  opacity: 0.9;
  font-size: 15px;
}

.hero li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #38bdf8;
  font-weight: bold;
}

.login-right {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 48px;
}

.form-box {
  width: 100%;
  max-width: 360px;
}

.form-header {
  text-align: center;
  margin-bottom: 36px;
}

.logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #1f2937;
}

.form-header p {
  margin: 0;
  color: #9ca3af;
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  margin-top: 8px;
}

.hint {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 900px) {
  .login-left {
    display: none;
  }
  .login-right {
    width: 100%;
  }
}
</style>
