<script setup lang="ts">
import { computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { LEGAL_PAGES, type LegalPageType } from '@/utils/legal';
import { useShopTheme } from '@/hooks/useShopTheme';

const { pageStyleStr } = useShopTheme();
const type = ref<LegalPageType>('agreement');

onLoad((query) => {
  const t = String(query?.type || 'agreement') as LegalPageType;
  type.value = t in LEGAL_PAGES ? t : 'agreement';
  uni.setNavigationBarTitle({ title: LEGAL_PAGES[type.value].title });
});

const page = computed(() => LEGAL_PAGES[type.value]);
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
    <view class="legal">
      <text class="legal__title">{{ page.title }}</text>
      <text class="legal__date">更新日期：{{ page.updatedAt }}</text>
      <view v-for="(section, idx) in page.sections" :key="idx" class="legal__block">
        <text class="legal__heading">{{ section.heading }}</text>
        <text class="legal__body">{{ section.body }}</text>
      </view>
    </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.legal {
  min-height: 100vh;
  padding: 32rpx 36rpx 80rpx;
  background: #f5f3f0;
}

.legal__title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2a26;
}

.legal__date {
  display: block;
  margin: 12rpx 0 36rpx;
  font-size: 24rpx;
  color: #9a958c;
}

.legal__block + .legal__block {
  margin-top: 36rpx;
}

.legal__heading {
  display: block;
  margin-bottom: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2a26;
}

.legal__body {
  display: block;
  font-size: 26rpx;
  line-height: 1.7;
  color: #5c5850;
}
</style>
