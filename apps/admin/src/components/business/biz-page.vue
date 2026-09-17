<script setup lang="ts">
defineOptions({ name: 'BizPage' });

withDefaults(
  defineProps<{
    title?: string;
    loading?: boolean;
    refreshable?: boolean;
  }>(),
  { refreshable: true },
);

defineEmits<{
  refresh: [];
}>();
</script>

<template>
  <div class="biz-page-layout">
    <slot name="filter" />

    <ElCard shadow="never" class="card-wrapper biz-page-layout__main">
      <template v-if="title || $slots.extra || $slots.toolbar || refreshable" #header>
        <div class="biz-page-layout__header">
          <h3 v-if="title" class="biz-page-layout__title">{{ title }}</h3>
          <div class="biz-page-layout__actions">
            <slot name="toolbar" />
            <ElButton v-if="refreshable" :loading="loading" @click="$emit('refresh')">
              <template #icon>
                <icon-mdi-refresh class="text-icon" />
              </template>
              刷新
            </ElButton>
            <slot name="extra" />
          </div>
        </div>
      </template>

      <slot />

      <div v-if="$slots.pagination" class="biz-page-layout__footer">
        <slot name="pagination" />
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.biz-page-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 480px;
}

.biz-page-layout__main {
  flex: 1;
  border: 1px solid var(--el-border-color-lighter);

  :deep(.el-card__header) {
    padding: 14px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-card__body) {
    padding: 0 20px 20px;
  }
}

.biz-page-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.biz-page-layout__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.biz-page-layout__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  :deep(.el-button),
  :deep(.el-select .el-select__wrapper) {
    height: 32px;
  }
}

.biz-page-layout__footer {
  padding-top: 16px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
