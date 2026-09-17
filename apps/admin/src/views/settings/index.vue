<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api';
import {
  DEFAULT_MINI_DISPLAY,
  mergeMiniDisplay,
  parseBusinessHours,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  type BusinessHours,
  type MiniDisplayConfig,
} from '@/constants/mini-display';
import {
  normalizeThemeColor,
  type MiniThemeConfig,
} from '@/constants/shop-theme';
import {
  THEME_PRESET_TAB_LABELS,
  THEME_PRESETS,
  applyThemePreset,
  findMatchingThemePreset,
  getThemePresetsByCategory,
  type ThemePresetTab,
} from '@/constants/theme-presets';
import {
  EMPTY_WX_CONFIG,
  mergeWxConfig,
  WX_SECRET_KEEP,
  type ShopWxConfigPublic,
  type WxConfigStatus,
} from '@/constants/wx-config';

const form = reactive({
  name: '',
  address: '',
  phone: '',
  logo: '',
  businessHours: parseBusinessHours(),
  miniConfig: structuredClone(DEFAULT_MINI_DISPLAY) as MiniDisplayConfig,
  wxConfig: structuredClone(EMPTY_WX_CONFIG) as ShopWxConfigPublic,
});
const wxStatus = ref<WxConfigStatus | null>(null);
const shopId = ref<number | null>(null);
const qrcode = ref<any>(null);
const activeTab = ref('basic');
const saving = ref(false);
const certUploading = ref<'privateKey' | 'platformCert' | null>(null);

onMounted(async () => {
  const shop: any = await adminApi.getShop();
  form.name = shop.name;
  form.address = shop.address || '';
  form.phone = shop.phone || '';
  form.logo = shop.logo || '';
  form.businessHours = parseBusinessHours(shop.businessHours);
  form.miniConfig = mergeMiniDisplay(shop.miniConfig);
  form.wxConfig = mergeWxConfig(shop.wxConfig);
  shopId.value = Number(shop.id) || shop.wxStatus?.shopId || null;
  wxStatus.value = shop.wxStatus ?? null;
  qrcode.value = await adminApi.getShopQrcode();
  syncThemePresetTab();
});

async function save() {
  saving.value = true;
  try {
    await adminApi.updateShop({
      name: form.name,
      address: form.address,
      phone: form.phone,
      logo: form.logo,
      businessHours: form.businessHours,
      miniConfig: form.miniConfig,
      wxConfig: form.wxConfig,
    });
    const shop: any = await adminApi.getShop();
    form.wxConfig = mergeWxConfig(shop.wxConfig);
    form.miniConfig = mergeMiniDisplay(shop.miniConfig);
    shopId.value = Number(shop.id) || shop.wxStatus?.shopId || null;
    wxStatus.value = shop.wxStatus ?? null;
    syncThemePresetTab();
    ElMessage.success('已保存');
  } finally {
    saving.value = false;
  }
}

async function refreshQrcode() {
  qrcode.value = await adminApi.getShopQrcode();
}

async function onLogoChange(uploadFile: { raw?: File }) {
  if (!uploadFile.raw) return;
  const { url } = await adminApi.uploadImage(uploadFile.raw);
  form.logo = url;
}

function addHighlight() {
  form.miniConfig.serviceHighlights.push({ icon: '✨', title: '', desc: '' });
}

function removeHighlight(index: number) {
  form.miniConfig.serviceHighlights.splice(index, 1);
}

function addBookingStep() {
  form.miniConfig.bookingSteps.push({ title: '', desc: '' });
}

function removeBookingStep(index: number) {
  form.miniConfig.bookingSteps.splice(index, 1);
}

function addBookingNotice() {
  form.miniConfig.bookingNotices.push('');
}

function removeBookingNotice(index: number) {
  form.miniConfig.bookingNotices.splice(index, 1);
}

const themeColorGroups = [
  {
    title: '品牌与页面',
    fields: [
      { key: 'primaryColor' as const, label: '主题色', desc: '图标强调、底部导航选中' },
      { key: 'pageBackground' as const, label: '页面背景', desc: '各页面整体底色' },
    ],
  },
  {
    title: '实心按钮',
    fields: [
      { key: 'buttonBgColor' as const, label: '按钮背景', desc: '如「立即预约」填充色' },
      { key: 'buttonTextColor' as const, label: '按钮文字', desc: '实心按钮上的文字' },
    ],
  },
  {
    title: '线框按钮',
    fields: [
      { key: 'buttonBorderColor' as const, label: '边框颜色', desc: '默认与实心按钮背景相同，可单独设置' },
      { key: 'buttonOutlineTextColor' as const, label: '文字颜色', desc: '默认与边框同色，可单独设置' },
    ],
  },
  {
    title: '文字颜色',
    fields: [
      { key: 'titleColor' as const, label: '标题文字', desc: '页面标题、昵称等' },
      { key: 'contentColor' as const, label: '正文文字', desc: '一般说明与列表内容' },
      { key: 'secondaryColor' as const, label: '次要文字', desc: '副标题、提示与未选中 Tab' },
    ],
  },
];

type ThemeColorKey = keyof MiniThemeConfig;

const themeColorSwatches = [
  '#a8845a',
  '#2c2a26',
  '#ffffff',
  '#f5f3f0',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#0ea5e9',
  '#06b6d4',
  '#22c55e',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#1a1a1a',
];

const themeHexDrafts = reactive<Partial<Record<ThemeColorKey, string>>>({});

function themeHexDisplay(key: ThemeColorKey) {
  return themeHexDrafts[key] ?? form.miniConfig.theme[key];
}

function onThemeNativeColor(key: ThemeColorKey, value: string) {
  form.miniConfig.theme[key] = value.toLowerCase();
  delete themeHexDrafts[key];
  switchThemeToCustom();
}

function onThemeHexInput(key: ThemeColorKey, value: string) {
  themeHexDrafts[key] = value;
  const normalized = value.trim();
  const withHash = normalized.startsWith('#') ? normalized : `#${normalized}`;
  if (/^#[0-9a-f]{6}$/i.test(withHash)) {
    form.miniConfig.theme[key] = withHash.toLowerCase();
    switchThemeToCustom();
  }
}

function onThemeHexBlur(key: ThemeColorKey) {
  const draft = themeHexDrafts[key];
  if (draft !== undefined) {
    form.miniConfig.theme[key] = normalizeThemeColor(draft, form.miniConfig.theme[key]);
    switchThemeToCustom();
  }
  delete themeHexDrafts[key];
}

function applyThemeSwatch(key: ThemeColorKey, color: string) {
  form.miniConfig.theme[key] = color;
  delete themeHexDrafts[key];
  switchThemeToCustom();
}

const themePresetTab = ref<ThemePresetTab>('featured');
const activeThemePresetId = computed(() => findMatchingThemePreset(form.miniConfig.theme));

const themePresetsInCategory = computed(() => {
  if (themePresetTab.value === 'custom') return [];
  return getThemePresetsByCategory(themePresetTab.value);
});

function syncThemePresetTab() {
  const id = findMatchingThemePreset(form.miniConfig.theme);
  if (!id) {
    themePresetTab.value = 'custom';
    return;
  }
  const preset = THEME_PRESETS.find((item) => item.id === id);
  themePresetTab.value = preset?.category ?? 'featured';
}

function switchThemeToCustom() {
  if (themePresetTab.value !== 'custom') {
    themePresetTab.value = 'custom';
  }
}

function selectThemePreset(preset: ReturnType<typeof getThemePresetsByCategory>[number]) {
  Object.assign(form.miniConfig.theme, applyThemePreset(preset));
  Object.keys(themeHexDrafts).forEach((key) => {
    delete themeHexDrafts[key as ThemeColorKey];
  });
  themePresetTab.value = preset.category;
  ElMessage.success(`已应用「${preset.name}」，可继续微调或保存`);
}

watch(activeThemePresetId, (id) => {
  if (!id && themePresetTab.value !== 'custom') {
    themePresetTab.value = 'custom';
  }
});

function setHours(day: keyof BusinessHours, part: 0 | 1, value: string) {
  form.businessHours[day][part] = value;
}

async function onWxCertChange(type: 'privateKey' | 'platformCert', uploadFile: { raw?: File }) {
  if (!uploadFile.raw) return;
  certUploading.value = type;
  try {
    await adminApi.uploadWxCert(type, uploadFile.raw);
    if (type === 'privateKey') form.wxConfig.hasPrivateKey = true;
    else form.wxConfig.hasPlatformCert = true;
    const shop: any = await adminApi.getShop();
    wxStatus.value = shop.wxStatus ?? null;
    ElMessage.success('证书已上传');
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  } finally {
    certUploading.value = null;
  }
}

function onSecretFocus(field: 'appSecret' | 'apiV3Key') {
  if (form.wxConfig[field] === WX_SECRET_KEEP || form.wxConfig[field].includes('****')) {
    form.wxConfig[field] = '';
  }
}

function buildNotifyUrlExample(id: number) {
  return `https://api.你的域名.com/api/pay/notify?shop=${id}`;
}

const notifyUrlDisplay = computed(() => {
  const url = wxStatus.value?.notifyUrl;
  const id = wxStatus.value?.shopId ?? shopId.value;
  if (url?.startsWith('https://')) return url;
  if (id) return buildNotifyUrlExample(id);
  return 'https://api.你的域名.com/api/pay/notify?shop=店铺ID';
});

async function copyNotifyUrl() {
  const url = notifyUrlDisplay.value;
  try {
    await navigator.clipboard.writeText(url);
    ElMessage.success('已复制支付回调地址');
  } catch {
    ElMessage.error('复制失败，请手动选中复制');
  }
}
</script>

<template>
  <BizPage title="店铺设置" :refreshable="false">
    <template #extra>
      <ElButton type="primary" :loading="saving" @click="save">保存全部设置</ElButton>
    </template>

    <ElTabs v-model="activeTab" class="settings-tabs">
      <ElTabPane label="基本信息" name="basic">
        <ElRow :gutter="24">
          <ElCol :xs="24" :lg="14">
            <div class="settings-section">
              <ElForm label-width="80px" class="settings-form">
                <ElFormItem label="店名"><ElInput v-model="form.name" /></ElFormItem>
                <ElFormItem label="地址"><ElInput v-model="form.address" /></ElFormItem>
                <ElFormItem label="电话"><ElInput v-model="form.phone" /></ElFormItem>
                <ElFormItem label="Logo">
                  <div class="logo-upload">
                    <ElUpload :auto-upload="false" :show-file-list="false" accept="image/*" @change="onLogoChange">
                      <ElButton>上传 Logo</ElButton>
                    </ElUpload>
                    <img v-if="form.logo" :src="form.logo" class="logo-preview" alt="Logo" />
                  </div>
                </ElFormItem>
              </ElForm>
            </div>
          </ElCol>
          <ElCol :xs="24" :lg="10">
            <div class="settings-section qrcode-section">
              <h4 class="settings-section__title">店铺小程序码</h4>
              <p class="settings-section__desc">顾客扫码即可进入您店铺的小程序预约页面</p>
              <div class="qrcode-box">
                <img v-if="qrcode?.qrcodeBase64" :src="qrcode.qrcodeBase64" alt="店铺码" class="qrcode" />
                <ElAlert v-else-if="qrcode?.dev" :title="qrcode.tip" type="info" show-icon :closable="false" />
                <p v-if="qrcode?.scene" class="meta">Scene: {{ qrcode.scene }} · Page: {{ qrcode.page }}</p>
                <ElButton class="mt-12px" @click="refreshQrcode">刷新小程序码</ElButton>
              </div>
            </div>
          </ElCol>
        </ElRow>
      </ElTabPane>

      <ElTabPane label="营业时间" name="hours">
        <div class="settings-section">
          <p class="settings-section__desc">小程序项目详情页「门店信息」中展示</p>
          <ElTable :data="WEEKDAY_KEYS.map((k) => ({ key: k, label: WEEKDAY_LABELS[k] }))" border style="max-width: 520px">
            <ElTableColumn prop="label" label="星期" width="100" />
            <ElTableColumn label="开始">
              <template #default="{ row }">
                <ElTimeSelect
                  :model-value="form.businessHours[row.key][0]"
                  start="06:00"
                  step="00:30"
                  end="23:30"
                  placeholder="开始"
                  @update:model-value="setHours(row.key, 0, $event)"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn label="结束">
              <template #default="{ row }">
                <ElTimeSelect
                  :model-value="form.businessHours[row.key][1]"
                  start="06:00"
                  step="00:30"
                  end="23:30"
                  placeholder="结束"
                  @update:model-value="setHours(row.key, 1, $event)"
                />
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </ElTabPane>

      <ElTabPane label="主题外观" name="theme">
        <div class="settings-section theme-page">
          <p class="settings-section__desc">
            选推荐方案一键套用，或切到「自定义」逐项配色。保存后顾客重新进入小程序即可生效。
          </p>
          <div class="theme-layout">
            <div class="theme-layout__main">
              <div class="theme-presets-card">
                <div class="theme-presets-card__head">
                  <div>
                    <h4 class="theme-presets-card__title">配色方案</h4>
                    <p class="theme-presets-card__sub">
                      {{ themePresetTab === 'custom' ? '逐项配置品牌色、按钮与文字颜色' : '一键套用，下方可继续微调' }}
                    </p>
                  </div>
                  <ElRadioGroup v-model="themePresetTab" size="default" class="theme-presets-card__tabs">
                    <ElRadioButton
                      v-for="(label, key) in THEME_PRESET_TAB_LABELS"
                      :key="key"
                      :value="key"
                    >
                      {{ label }}
                    </ElRadioButton>
                  </ElRadioGroup>
                </div>
                <div v-if="themePresetTab !== 'custom'" class="theme-preset-grid">
                  <button
                    v-for="preset in themePresetsInCategory"
                    :key="preset.id"
                    type="button"
                    class="theme-preset-item"
                    :class="{ 'is-active': activeThemePresetId === preset.id }"
                    @click="selectThemePreset(preset)"
                  >
                    <div
                      class="theme-preset-item__cover"
                      :style="{
                        background: `linear-gradient(135deg, ${preset.theme.titleColor} 0%, ${preset.theme.primaryColor} 55%, ${preset.theme.pageBackground} 100%)`,
                      }"
                    >
                      <span
                        class="theme-preset-item__chip"
                        :style="{ background: preset.theme.buttonBgColor, color: preset.theme.buttonTextColor }"
                      >
                        按钮
                      </span>
                    </div>
                    <div class="theme-preset-item__body">
                      <span class="theme-preset-item__name">{{ preset.name }}</span>
                      <span class="theme-preset-item__desc">{{ preset.desc }}</span>
                    </div>
                  </button>
                </div>
                <div v-else class="theme-custom-banner">
                  <span class="theme-custom-banner__dot" :style="{ background: form.miniConfig.theme.primaryColor }" />
                  <div>
                    <p class="theme-custom-banner__title">当前为自定义配色</p>
                    <p class="theme-custom-banner__desc">在下方调整各项颜色，右侧可实时预览效果</p>
                  </div>
                </div>
              </div>

              <div class="theme-colors-card">
                <div class="theme-colors-card__head theme-colors-card__head--solo">
                  {{ themePresetTab === 'custom' ? '自定义配色' : '微调当前方案' }}
                </div>
                <template v-for="group in themeColorGroups" :key="group.title">
                  <div class="theme-colors-card__head">{{ group.title }}</div>
                  <div
                    v-for="field in group.fields"
                    :key="field.key"
                    class="theme-color-row"
                  >
                    <label class="theme-color-row__swatch" :title="`点击选择${field.label}`">
                      <input
                        type="color"
                        class="theme-color-row__swatch-input"
                        :value="form.miniConfig.theme[field.key]"
                        @input="onThemeNativeColor(field.key, ($event.target as HTMLInputElement).value)"
                      />
                    </label>
                    <div class="theme-color-row__info">
                      <span class="theme-color-row__label">{{ field.label }}</span>
                      <span class="theme-color-row__desc">{{ field.desc }}</span>
                    </div>
                    <div class="theme-color-row__picker">
                      <ElInput
                        class="theme-color-row__hex-input"
                        :model-value="themeHexDisplay(field.key)"
                        size="default"
                        maxlength="7"
                        placeholder="#000000"
                        @update:model-value="onThemeHexInput(field.key, $event)"
                        @blur="onThemeHexBlur(field.key)"
                      />
                      <ElPopover placement="bottom-end" :width="236" trigger="click">
                        <template #reference>
                          <ElButton class="theme-color-row__preset-btn" size="default">常用色</ElButton>
                        </template>
                        <div class="theme-swatch-grid">
                          <button
                            v-for="color in themeColorSwatches"
                            :key="color"
                            type="button"
                            class="theme-swatch-grid__item"
                            :class="{ 'is-active': form.miniConfig.theme[field.key] === color }"
                            :style="{ background: color }"
                            :title="color"
                            @click="applyThemeSwatch(field.key, color)"
                          />
                        </div>
                      </ElPopover>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <aside class="theme-layout__aside">
              <div class="theme-preview-card">
                <h4 class="theme-preview-card__title">小程序预览</h4>
                <div class="theme-phone">
                  <div class="theme-phone__status" />
                  <div
                    class="theme-phone__hero"
                    :style="{
                      background: `linear-gradient(135deg, ${form.miniConfig.theme.titleColor} 0%, ${form.miniConfig.theme.primaryColor} 100%)`,
                    }"
                  />
                  <div
                    class="theme-phone__body"
                    :style="{ background: form.miniConfig.theme.pageBackground }"
                  >
                    <p
                      class="theme-phone__title"
                      :style="{ color: form.miniConfig.theme.titleColor }"
                    >
                      店铺首页
                    </p>
                    <p
                      class="theme-phone__content"
                      :style="{ color: form.miniConfig.theme.contentColor }"
                    >
                      在线预约 · 尊享服务
                    </p>
                    <p
                      class="theme-phone__sub"
                      :style="{ color: form.miniConfig.theme.secondaryColor }"
                    >
                      新客首次预约享专属礼遇
                    </p>
                    <div
                      class="theme-phone__btn"
                      :style="{
                        background: form.miniConfig.theme.buttonBgColor,
                        color: form.miniConfig.theme.buttonTextColor,
                      }"
                    >
                      立即预约
                    </div>
                    <div
                      class="theme-phone__btn theme-phone__btn--outline"
                      :style="{
                        color: form.miniConfig.theme.buttonOutlineTextColor,
                        borderColor: form.miniConfig.theme.buttonBorderColor,
                      }"
                    >
                      退出登录
                    </div>
                  </div>
                  <div class="theme-phone__tabbar">
                    <span :style="{ color: form.miniConfig.theme.primaryColor }">首页</span>
                    <span :style="{ color: form.miniConfig.theme.secondaryColor }">预约</span>
                    <span :style="{ color: form.miniConfig.theme.secondaryColor }">会员卡</span>
                    <span :style="{ color: form.miniConfig.theme.secondaryColor }">我的</span>
                  </div>
                </div>
                <p class="theme-preview-card__hint">点击上方方案一键套用，右侧实时预览</p>
              </div>
            </aside>
          </div>
        </div>
      </ElTabPane>

      <ElTabPane label="小程序首页" name="home">
        <div class="settings-section settings-form--wide">
          <ElForm label-width="120px">
            <ElDivider content-position="left">首页文案</ElDivider>
            <ElFormItem label="顶部公告"><ElInput v-model="form.miniConfig.homeNotice" type="textarea" :rows="2" /></ElFormItem>
            <ElFormItem label="轮播默认标题"><ElInput v-model="form.miniConfig.heroDefaultTitle" /></ElFormItem>
            <ElFormItem label="轮播默认副标题"><ElInput v-model="form.miniConfig.heroDefaultSubtitle" /></ElFormItem>
            <ElFormItem label="服务区块标题"><ElInput v-model="form.miniConfig.homeServicesTitle" /></ElFormItem>
            <ElFormItem label="服务区块副标题"><ElInput v-model="form.miniConfig.homeServicesSubtitle" /></ElFormItem>
            <ElDivider content-position="left">快捷入口文案</ElDivider>
            <ElFormItem label="我的预约"><ElInput v-model="form.miniConfig.quickActions.bookings" /></ElFormItem>
            <ElFormItem label="购买会员卡"><ElInput v-model="form.miniConfig.quickActions.card" /></ElFormItem>
            <ElFormItem label="核销码"><ElInput v-model="form.miniConfig.quickActions.verify" /></ElFormItem>
            <ElFormItem label="联系门店"><ElInput v-model="form.miniConfig.quickActions.call" /></ElFormItem>
          </ElForm>
        </div>
      </ElTabPane>

      <ElTabPane label="项目详情展示" name="service">
        <div class="settings-section settings-form--wide">
          <ElForm label-width="140px">
            <ElFormItem label="默认可约天数">
              <ElInputNumber v-model="form.miniConfig.availabilityDays" :min="7" :max="30" />
              <span class="field-hint">选时段页查询未来多少天可约</span>
            </ElFormItem>
            <ElFormItem label="默认项目介绍">
              <ElInput v-model="form.miniConfig.defaultServiceDescription" type="textarea" :rows="3" />
              <span class="field-hint">项目未填写介绍时使用；可在「项目管理」为每个项目单独设置</span>
            </ElFormItem>
            <ElDivider content-position="left">默认服务亮点</ElDivider>
            <p class="settings-section__desc field-hint--lead">
              展示在小程序「项目详情页」，项目未单独设置亮点时使用。条数不限，可自由增删，不在首页展示。
            </p>
            <div v-for="(item, idx) in form.miniConfig.serviceHighlights" :key="idx" class="list-card">
              <ElFormItem label="图标"><ElInput v-model="item.icon" style="width: 80px" /></ElFormItem>
              <ElFormItem label="标题"><ElInput v-model="item.title" /></ElFormItem>
              <ElFormItem label="描述"><ElInput v-model="item.desc" /></ElFormItem>
              <ElButton text type="danger" @click="removeHighlight(idx)">删除</ElButton>
            </div>
            <ElButton @click="addHighlight">添加亮点</ElButton>
            <ElDivider content-position="left">预约流程</ElDivider>
            <div v-for="(step, idx) in form.miniConfig.bookingSteps" :key="idx" class="list-card">
              <ElFormItem :label="`步骤 ${idx + 1}`"><ElInput v-model="step.title" placeholder="标题" /></ElFormItem>
              <ElFormItem label="说明"><ElInput v-model="step.desc" /></ElFormItem>
              <ElButton text type="danger" @click="removeBookingStep(idx)">删除</ElButton>
            </div>
            <ElButton @click="addBookingStep">添加步骤</ElButton>
          </ElForm>
        </div>
      </ElTabPane>

      <ElTabPane label="预约规则" name="rules">
        <div class="settings-section settings-form--wide">
          <p class="settings-section__desc">
            配置到店、取消、爽约等规则。下方「预约须知」文案会展示在小程序确认预约页，建议与规则保持一致。
          </p>
          <ElForm label-width="140px">
            <ElFormItem label="提前到店">
              <div class="inline-field">
                <ElInputNumber v-model="form.miniConfig.bookingRules.arriveEarlyMinutes" :min="0" :max="120" />
                <span class="field-hint field-hint--after">分钟，建议顾客提前到店</span>
              </div>
            </ElFormItem>
            <ElFormItem label="迟到宽限">
              <div class="inline-field">
                <ElInputNumber v-model="form.miniConfig.bookingRules.lateGraceMinutes" :min="0" :max="120" />
                <span class="field-hint field-hint--after">分钟，超过后门店可调整服务安排</span>
              </div>
            </ElFormItem>
            <ElFormItem label="取消时限">
              <div class="inline-field">
                <ElInputNumber v-model="form.miniConfig.bookingRules.cancelBeforeHours" :min="0" :max="72" />
                <span class="field-hint field-hint--after">小时，需提前多久可取消；0 表示不限制（后续版本将自动校验）</span>
              </div>
            </ElFormItem>
            <ElFormItem label="爽约订金">
              <div class="inline-field inline-field--wrap">
                <ElRadioGroup v-model="form.miniConfig.bookingRules.noShowDepositPolicy" class="rule-radio-group">
                  <ElRadio value="forfeit">订金不退还</ElRadio>
                  <ElRadio value="refund">退还订金</ElRadio>
                </ElRadioGroup>
                <span class="field-hint field-hint--after">顾客未到店，店员或后台标记为「爽约」后</span>
              </div>
            </ElFormItem>
            <ElDivider content-position="left">预约须知（展示给顾客）</ElDivider>
            <div v-for="(_, idx) in form.miniConfig.bookingNotices" :key="idx" class="list-card list-card--inline">
              <ElInput v-model="form.miniConfig.bookingNotices[idx]" type="textarea" :rows="2" />
              <ElButton text type="danger" @click="removeBookingNotice(idx)">删除</ElButton>
            </div>
            <ElButton @click="addBookingNotice">添加须知</ElButton>
          </ElForm>
        </div>
      </ElTabPane>

      <ElTabPane label="提示文案" name="tips">
        <div class="settings-section settings-form--wide">
          <ElForm label-width="140px">
            <ElFormItem label="确认预约提示"><ElInput v-model="form.miniConfig.bookingConfirmTip" type="textarea" :rows="2" /></ElFormItem>
            <ElFormItem label="核销码提示">
              <ElInput
                v-model="form.miniConfig.verifyCodeNotice"
                type="textarea"
                :rows="2"
                placeholder="扫码方式：换行分步说明，例如「1. 店员在微信打开本店小程序」"
              />
            </ElFormItem>
            <ElFormItem label="购卡页副标题"><ElInput v-model="form.miniConfig.cardBuySubtitle" /></ElFormItem>
            <ElFormItem label="会员卡空状态"><ElInput v-model="form.miniConfig.cardEmptyTip" /></ElFormItem>
            <ElFormItem label="取消预约确认"><ElInput v-model="form.miniConfig.cancelBookingTip" type="textarea" :rows="2" /></ElFormItem>
            <ElFormItem label="无可约日期提示"><ElInput v-model="form.miniConfig.slotsEmptyTip" type="textarea" :rows="2" /></ElFormItem>
          </ElForm>
        </div>
      </ElTabPane>

      <ElTabPane label="微信与支付" name="wx">
        <div class="settings-section settings-form--wide">
          <ElAlert
            type="info"
            :closable="false"
            show-icon
            class="wx-intro-alert"
            title="本系统对接的是微信小程序，不是微信公众号"
            description="AppID / AppSecret 在下方「小程序账号」填写；订阅消息在小程序后台申请模板 ID，无需单独配置公众号。支付在微信商户平台开通。"
          />

          <div v-if="wxStatus" class="wx-status">
            <ElRow :gutter="16" class="wx-status-grid">
              <ElCol :xs="24" :sm="12" class="wx-status-col">
                <div class="wx-status-card" :class="wxStatus.miniReady ? 'wx-status-card--ok' : 'wx-status-card--warn'">
                  <span class="wx-status-card__label">小程序登录</span>
                  <span class="wx-status-card__value">{{ wxStatus.miniReady ? '已就绪' : '未配置' }}</span>
                  <span class="wx-status-card__sub">
                    {{ wxStatus.miniReady ? '登录与门店码可用' : '需配置 AppID 与 AppSecret' }}
                  </span>
                </div>
              </ElCol>
              <ElCol :xs="24" :sm="12" class="wx-status-col">
                <div class="wx-status-card" :class="wxStatus.payReady ? 'wx-status-card--ok' : 'wx-status-card--info'">
                  <span class="wx-status-card__label">微信支付</span>
                  <span class="wx-status-card__value">{{ wxStatus.payReady ? '已就绪' : '未配置' }}</span>
                  <span class="wx-status-card__sub">
                    {{ wxStatus.payReady ? '可正常收款' : '将自动模拟已付款' }}
                  </span>
                </div>
              </ElCol>
            </ElRow>
            <ul v-if="wxStatus.hints.length" class="wx-hints">
              <li v-for="(hint, idx) in wxStatus.hints" :key="idx">{{ hint }}</li>
            </ul>
          </div>

          <ElDivider content-position="left">手机号绑定</ElDivider>
          <ElForm label-width="140px">
            <ElFormItem label="手动输入绑定">
              <div class="phone-bind-switch">
                <ElSwitch v-model="form.miniConfig.allowManualPhoneBind" />
                <span class="field-hint">
                  开启后小程序可手动输入手机号（仅开发测试用，正式上线请关闭，顾客使用微信授权即可）
                </span>
              </div>
            </ElFormItem>
          </ElForm>

          <ElDivider content-position="left">小程序账号</ElDivider>
          <p class="settings-section__desc">
            登录 <a href="https://mp.weixin.qq.com" target="_blank" rel="noopener">微信公众平台</a> → 选择你的小程序（不是公众号）→ 开发管理 → 开发设置，复制 AppID 与 AppSecret。
          </p>
          <ElForm label-width="140px">
            <ElFormItem label="AppID">
              <ElInput v-model="form.wxConfig.appId" placeholder="wx..." />
              <span class="field-hint">
                与小程序 manifest 中的 AppID 保持一致即可，通常不用改小程序；只有换成另一个小程序时才需重新编译发布
              </span>
            </ElFormItem>
            <ElFormItem label="AppSecret">
              <ElInput
                v-model="form.wxConfig.appSecret"
                type="password"
                show-password
                placeholder="留空表示不修改"
                @focus="onSecretFocus('appSecret')"
              />
            </ElFormItem>
          </ElForm>

          <ElDivider content-position="left">微信支付</ElDivider>
          <ElForm label-width="140px">
            <ElFormItem label="支付回调地址">
              <div class="notify-url-row">
                <ElInput :model-value="notifyUrlDisplay" readonly>
                  <template #append>
                    <ElButton @click="copyNotifyUrl">复制</ElButton>
                  </template>
                </ElInput>
              </div>
              <span class="field-hint">
                复制到微信商户平台 → 产品中心 → 开发配置 → 支付回调 URL，将「你的域名」换成实际上线域名
              </span>
            </ElFormItem>
            <ElFormItem label="商户号">
              <ElInput v-model="form.wxConfig.mchId" placeholder="10 位商户号" />
            </ElFormItem>
            <ElFormItem label="API v3 密钥">
              <ElInput
                v-model="form.wxConfig.apiV3Key"
                type="password"
                show-password
                placeholder="32 位密钥，留空表示不修改"
                @focus="onSecretFocus('apiV3Key')"
              />
            </ElFormItem>
            <ElFormItem label="证书序列号">
              <ElInput v-model="form.wxConfig.serialNo" placeholder="商户 API 证书序列号" />
            </ElFormItem>
            <ElFormItem label="商户私钥">
              <div class="cert-upload">
                <ElUpload :auto-upload="false" :show-file-list="false" accept=".pem" @change="onWxCertChange('privateKey', $event)">
                  <ElButton :loading="certUploading === 'privateKey'">上传 apiclient_key.pem</ElButton>
                </ElUpload>
                <ElTag v-if="form.wxConfig.hasPrivateKey" type="success" size="small">已上传</ElTag>
              </div>
            </ElFormItem>
            <ElFormItem label="平台证书">
              <div class="cert-upload">
                <ElUpload :auto-upload="false" :show-file-list="false" accept=".pem" @change="onWxCertChange('platformCert', $event)">
                  <ElButton :loading="certUploading === 'platformCert'">上传 wechatpay_platform.pem</ElButton>
                </ElUpload>
                <ElTag v-if="form.wxConfig.hasPlatformCert" type="success" size="small">已上传</ElTag>
                <span class="field-hint">用于验证支付回调签名，建议上传</span>
              </div>
            </ElFormItem>
          </ElForm>

          <ElDivider content-position="left">订阅消息模板</ElDivider>
          <p class="settings-section__desc">
            在小程序后台 → 功能 → 订阅消息 申请模板，把模板 ID 填到下面。发送额度由微信按小程序规则管控，此处只需填 ID，无需配置公众号。
          </p>
          <ElForm label-width="140px">
            <ElFormItem label="预约成功">
              <ElInput v-model="form.wxConfig.tplBookingSuccess" placeholder="小程序订阅消息模板 ID" />
            </ElFormItem>
            <ElFormItem label="预约提醒">
              <ElInput v-model="form.wxConfig.tplBookingRemind" placeholder="模板 ID，如提前 2 小时提醒类" />
            </ElFormItem>
            <ElFormItem label="新预约通知">
              <ElInput v-model="form.wxConfig.tplNewBooking" placeholder="模板 ID，通知店长/前台" />
            </ElFormItem>
          </ElForm>
        </div>
      </ElTabPane>
    </ElTabs>
  </BizPage>
</template>

<style scoped lang="scss">
.settings-tabs {
  :deep(.el-tabs__content) {
    padding-top: 8px;
  }
}

.settings-section {
  padding: 4px 0;
}

.settings-section__title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.settings-section__desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.settings-form {
  max-width: 480px;
}

.settings-form--wide {
  max-width: 640px;
}

.logo-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logo-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.qrcode-section {
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 12px;
}

.qrcode {
  width: 200px;
  height: 200px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.meta {
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.list-card {
  padding: 12px 16px;
  margin-bottom: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.list-card--inline {
  display: flex;
  gap: 12px;
  align-items: flex-start;

  .el-input {
    flex: 1;
  }
}

.field-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.phone-bind-switch {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.theme-page {
  padding-top: 4px;
}

.theme-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.theme-layout__main {
  flex: 1;
  min-width: 0;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.theme-presets-card {
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;
}

.theme-presets-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 16px 20px;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.theme-presets-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.theme-presets-card__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.theme-presets-card__tabs {
  flex-shrink: 0;
}

.theme-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 12px;
  padding: 16px 20px 20px;
}

.theme-preset-item {
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 2px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  &.is-active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }
}

.theme-preset-item__cover {
  position: relative;
  height: 72px;
  padding: 10px;
  display: flex;
  align-items: flex-end;
}

.theme-preset-item__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.theme-preset-item__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--el-border-color-extra-light);
}

.theme-preset-item__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.theme-preset-item__desc {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.theme-custom-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 16px 20px 20px;
  padding: 16px 18px;
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
}

.theme-custom-banner__dot {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.theme-custom-banner__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.theme-custom-banner__desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.theme-colors-card__head--solo {
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.theme-layout__aside {
  width: 360px;
  flex-shrink: 0;
  align-self: stretch;
}

.theme-colors-card {
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;
}

.theme-colors-card__head {
  padding: 12px 18px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:not(:first-child) {
    border-top: 1px solid var(--el-border-color-extra-light);
  }
}

.theme-color-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:last-child {
    border-bottom: none;
  }
}

.theme-color-row__swatch {
  display: block;
  width: 52px;
  height: 52px;
  cursor: pointer;
}

.theme-color-row__swatch-input {
  width: 52px;
  height: 52px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  cursor: pointer;
  background: transparent;

  &::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  &::-webkit-color-swatch {
    border: none;
    border-radius: 8px;
  }

  &::-moz-color-swatch {
    border: none;
    border-radius: 8px;
  }
}

.theme-color-row__info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-color-row__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.theme-color-row__desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.theme-color-row__picker {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.theme-color-row__hex-input {
  width: 112px;

  :deep(.el-input__inner) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    letter-spacing: 0.02em;
  }
}

.theme-color-row__preset-btn {
  flex-shrink: 0;
}

.theme-swatch-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.theme-swatch-grid__item {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.08);
  }

  &.is-active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }
}

.theme-preview-card {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 220px);
  padding: 24px 20px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.theme-preview-card__title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.theme-preview-card__hint {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.theme-phone {
  width: 280px;
  margin: auto auto 0;
  border-radius: 32px;
  overflow: hidden;
  background: #fff;
  border: 8px solid #1a1a1a;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.14);
}

.theme-phone__status {
  height: 28px;
  background: #1a1a1a;
}

.theme-phone__hero {
  height: 104px;
}

.theme-phone__body {
  padding: 20px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 320px;
}

.theme-phone__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}

.theme-phone__content {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.theme-phone__sub {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
}

.theme-phone__btn {
  margin-top: 6px;
  padding: 10px 0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
  border: none;
  box-sizing: border-box;
}

.theme-phone__btn--outline {
  background: transparent;
  border: 1px solid;
}

.theme-phone__tabbar {
  display: flex;
  justify-content: space-around;
  padding: 12px 8px 14px;
  font-size: 11px;
  background: #fff;
  border-top: 1px solid var(--el-border-color-extra-light);
}

@media (max-width: 960px) {
  .theme-layout {
    flex-direction: column;
  }

  .theme-layout__main {
    max-width: none;
    width: 100%;
  }

  .theme-layout__aside {
    width: 100%;
  }

  .theme-preview-card {
    position: static;
  }

  .theme-phone {
    width: 100%;
    max-width: 280px;
  }
}

@media (max-width: 640px) {
  .theme-color-row {
    grid-template-columns: 36px 1fr;
    grid-template-rows: auto auto;
  }

  .theme-color-row__picker {
    grid-column: 1 / -1;
    padding-left: 50px;
  }
}

.field-hint--lead {
  margin: 0 0 12px;
}

.field-hint--below {
  margin: 10px 0 0;
}

.inline-field {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 16px;
  width: 100%;
}

.inline-field--wrap {
  flex-wrap: wrap;
  row-gap: 8px;
}

.field-hint--after {
  margin: 0;
  flex: 1;
  min-width: 0;
  line-height: 1.5;
}

.stack-block {
  width: 100%;
}

.rule-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;

  :deep(.el-radio) {
    margin-right: 0;
    height: 32px;
  }
}

.wx-intro-alert {
  margin-bottom: 16px;
}

.wx-status {
  margin-bottom: 20px;
}

.wx-status-grid {
  margin-bottom: 4px;

  .wx-status-col {
    display: flex;
  }
}

.wx-status-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  width: 100%;
  padding: 16px 18px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
  min-height: 96px;
}

.wx-status-card--ok {
  border-color: var(--el-color-success-light-5);
  background: var(--el-color-success-light-9);
}

.wx-status-card--warn {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.wx-status-card--info {
  border-color: var(--el-border-color);
  background: var(--el-fill-color-light);
}

.wx-status-card__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.wx-status-card__value {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.wx-status-card__sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  min-height: 18px;
}

.wx-hints {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.cert-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.notify-url-row {
  width: 100%;
  max-width: 560px;
}

.mt-12px {
  margin-top: 12px;
}
</style>
