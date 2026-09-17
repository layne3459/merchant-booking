import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';
import { localStg } from '@/utils/storage';

interface ApiBody<T = unknown> {
  code: number;
  message: string;
  data: T;
}

const instance = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

instance.interceptors.request.use((config) => {
  const token = localStg.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res: AxiosResponse<ApiBody>) => {
    const body = res.data;
    if (body?.code !== 0) {
      ElMessage.error(body?.message || '请求失败');
      return Promise.reject(body);
    }
    return body.data as unknown as AxiosResponse;
  },
  (err) => {
    ElMessage.error(err.response?.data?.message || err.message || '网络错误');
    return Promise.reject(err);
  },
);

const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config) as Promise<T>;
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config) as Promise<T>;
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config) as Promise<T>;
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config) as Promise<T>;
  },
};

export default http;
