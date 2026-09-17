<script setup lang="ts">
defineOptions({ name: 'BizTable', inheritAttrs: false });

withDefaults(
  defineProps<{
    loading?: boolean;
  }>(),
  {
    loading: false,
  },
);
</script>

<template>
  <div class="biz-table-wrap">
    <ElTable
      v-bind="$attrs"
      v-loading="loading"
      border
      stripe
      size="default"
      class="biz-table"
      :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-regular)' }"
    >
      <slot />
      <template #empty>
        <slot name="empty">
          <ElEmpty description="暂无数据" :image-size="80" />
        </slot>
      </template>
    </ElTable>
  </div>
</template>
