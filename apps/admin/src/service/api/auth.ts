import { request } from '../request';
import { localStg } from '@/utils/storage';

export function fetchLogin(userName: string, password: string, shopId?: string) {
  return request<Api.Auth.LoginToken>({
    url: '/api/admin/login',
    method: 'post',
    data: {
      username: userName,
      password,
      ...(shopId ? { shopId } : {})
    }
  });
}

export function fetchGetUserInfo() {
  const cached = localStg.get('adminInfo') as Api.Auth.StoredAdmin | null;
  if (!cached) {
    return Promise.resolve({ data: null, error: new Error('no admin info') });
  }

  return Promise.resolve({
    data: {
      userId: String(cached.id),
      userName: cached.username,
      roles: [cached.role || 'manager'],
      buttons: []
    } as Api.Auth.UserInfo,
    error: null
  });
}

export function fetchRefreshToken(_refreshToken: string) {
  return Promise.resolve({ data: null, error: new Error('refresh not supported') });
}

export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}
