import { ref, type Ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';

const DEFAULT_STALE_MS = 60_000;
const REFRESH_PREFIX = 'page:refresh:';

interface StalePageLoadOptions {
  /** 超过该时间才在 onShow 时后台刷新，默认 60s */
  staleMs?: number;
  /** 其他页面可通过 markPageRefresh 触发强制刷新 */
  refreshKey?: string;
}

export function markPageRefresh(refreshKey: string) {
  uni.setStorageSync(`${REFRESH_PREFIX}${refreshKey}`, Date.now());
}

function consumePageRefresh(refreshKey: string) {
  const key = `${REFRESH_PREFIX}${refreshKey}`;
  const marked = uni.getStorageSync(key);
  if (!marked) return false;
  uni.removeStorageSync(key);
  return true;
}

/**
 * Tab 页数据加载：首次显示骨架屏，再次进入优先展示缓存，过期后静默刷新。
 */
export function useStalePageLoad<T>(
  loader: () => Promise<T>,
  apply: (data: T) => void,
  options: StalePageLoadOptions = {},
) {
  const loading = ref(false);
  const initialized = ref(false);
  let lastLoadedAt = 0;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;

  async function loadData(force = false) {
    const now = Date.now();
    const isStale = now - lastLoadedAt > staleMs;
    if (initialized.value && !force && !isStale) return;

    const firstLoad = !initialized.value;
    if (firstLoad) loading.value = true;

    try {
      const data = await loader();
      apply(data);
      initialized.value = true;
      lastLoadedAt = Date.now();
    } finally {
      loading.value = false;
      uni.stopPullDownRefresh();
    }
  }

  onShow(() => {
    const force = options.refreshKey ? consumePageRefresh(options.refreshKey) : false;
    loadData(force);
  });
  onPullDownRefresh(() => loadData(true));

  return {
    loading,
    initialized,
    reload: () => loadData(true),
  } satisfies {
    loading: Ref<boolean>;
    initialized: Ref<boolean>;
    reload: () => Promise<void>;
  };
}
