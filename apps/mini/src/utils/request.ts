import { getApiBase } from '@/config';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export function request<T = unknown>(
  url: string,
  options: {
    method?: Method;
    data?: Record<string, unknown>;
    auth?: boolean;
    /** 为 true 时不弹出 toast（批量请求时用） */
    silent?: boolean;
  } = {},
): Promise<T> {
  const token = uni.getStorageSync('token') as string;
  const method = options.method || 'GET';
  let requestUrl = `${getApiBase()}${url}`;
  let requestData = options.data;

  // 微信小程序 GET 需手动拼 query，否则参数可能丢失
  if (method === 'GET' && options.data && Object.keys(options.data).length > 0) {
    const query = Object.entries(options.data)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    requestUrl = `${requestUrl}${url.includes('?') ? '&' : '?'}${query}`;
    requestData = undefined;
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: requestUrl,
      method,
      data: requestData,
      header: {
        'Content-Type': 'application/json',
        ...(options.auth !== false && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        const body = res.data as ApiResponse<T>;
        if (body?.code !== 0) {
          if (!options.silent) {
            uni.showToast({ title: body?.message || '请求失败', icon: 'none' });
          }
          reject(body);
          return;
        }
        resolve(body.data);
      },
      fail: (err) => {
        const msg = String((err as { errMsg?: string })?.errMsg || '');
        const tip = msg.includes('fail') ? '无法连接服务器，请确认 API 已启动' : '网络错误';
        if (!options.silent) {
          uni.showToast({ title: tip, icon: 'none' });
        }
        reject(err);
      },
    });
  });
}

export function fenToYuan(fen: number) {
  return (fen / 100).toFixed(2);
}

export const bookingStatusMap: Record<number, string> = {
  0: '待支付',
  1: '已预约',
  2: '已到店',
  3: '已完成',
  4: '已取消',
  5: '爽约',
};

export const cardTypeMap: Record<number, string> = {
  1: '储值卡',
  2: '次卡',
  3: '周期卡',
};

export async function withLoading<T>(fn: () => Promise<T>, title = '加载中'): Promise<T> {
  uni.showLoading({ title, mask: true });
  try {
    return await fn();
  } finally {
    uni.hideLoading();
  }
}
