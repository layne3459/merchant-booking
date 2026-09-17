<script setup lang="ts">
import { ElCard } from 'element-plus';

defineOptions({ name: 'BizFilter' });

withDefaults(
  defineProps<{
    labelWidth?: string;
    showReset?: boolean;
    embedded?: boolean;
  }>(),
  {
    labelWidth: 'auto',
    showReset: true,
    embedded: false,
  },
);

defineEmits<{
  search: [];
  reset: [];
}>();
</script>

<template>
  <component :is="embedded ? 'div' : ElCard" shadow="never" :class="embedded ? 'biz-filter-embedded' : 'card-wrapper biz-filter-card'">
    <ElForm
      class="biz-filter"
      label-position="left"
      :label-width="labelWidth"
      @submit.prevent="$emit('search')"
    >
      <div class="biz-filter__row">
        <slot />
        <div v-if="$slots.actions || showReset" class="biz-filter__actions">
          <slot name="actions">
            <ElButton type="primary" @click="$emit('search')">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              查询
            </ElButton>
            <ElButton v-if="showReset" @click="$emit('reset')">
              <template #icon>
                <icon-mdi-refresh class="text-icon" />
              </template>
              重置
            </ElButton>
          </slot>
        </div>
      </div>
    </ElForm>
  </component>
</template>

<style scoped lang="scss">
.biz-filter-card {
  border: 1px solid var(--el-border-color-lighter);

  :deep(.el-card__body) {
    padding: 14px 20px;
  }
}

.biz-filter-embedded {
  margin-bottom: 16px;
}
</style>
