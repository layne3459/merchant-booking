import http from './http';
import axios from 'axios';
import { localStg } from '@/utils/storage';

export const authApi = {
  login: (data: { username: string; password: string; shopId?: string }) =>
    http.post<{ token: string; admin: object }>('/admin/login', data),
};

export const platformApi = {
  listPlans: () =>
    http.get<Array<{ id: number; code: string; name: string; priceMonth: number; trialDays: number }>>('/platform/plans'),
  listShops: (params?: object) =>
    http.get<{ list: any[]; total: number; page: number; pageSize: number }>('/platform/shops', { params }),
  createShop: (data: object) => http.post('/platform/shops', data),
  freezeShop: (id: number) => http.post(`/platform/shops/${id}/freeze`),
  unfreezeShop: (id: number) => http.post(`/platform/shops/${id}/unfreeze`),
  renewShop: (id: number, data?: { months?: number; planCode?: string }) =>
    http.post(`/platform/shops/${id}/renew`, data || {}),
  resetPassword: (id: number, password: string) =>
    http.post(`/platform/shops/${id}/reset-password`, { password }),
};

export const adminApi = {
  dailyReport: () => http.get<Record<string, number | string>>('/admin/reports/daily'),
  monthlyReport: () => http.get<Record<string, number | string>>('/admin/reports/monthly'),
  trendReport: (days = 7) =>
    http.get<Array<{ date: string; label: string; bookingCount: number; revenue: number; verifyCount: number }>>(
      '/admin/reports/trend',
      { params: { days } },
    ),
  listServices: () => http.get<any[]>('/admin/services'),
  createService: (data: object) => http.post('/admin/services', data),
  updateService: (id: number, data: object) => http.put(`/admin/services/${id}`, data),
  deleteService: (id: number) => http.delete(`/admin/services/${id}`),
  listStaff: () => http.get<any[]>('/admin/staff'),
  createStaff: (data: object) => http.post('/admin/staff', data),
  updateStaff: (id: number, data: object) => http.put(`/admin/staff/${id}`, data),
  listSchedules: (staffId?: number) =>
    http.get<any[]>('/admin/schedules', { params: staffId ? { staffId } : {} }),
  createSchedule: (data: object) => http.post('/admin/schedules', data),
  updateSchedule: (id: number, data: object) => http.put(`/admin/schedules/${id}`, data),
  deleteSchedule: (id: number) => http.delete(`/admin/schedules/${id}`),
  listCardTemplates: () => http.get<any[]>('/admin/card-templates'),
  createCardTemplate: (data: object) => http.post('/admin/card-templates', data),
  updateCardTemplate: (id: number, data: object) => http.put(`/admin/card-templates/${id}`, data),
  listBookings: (params?: object) =>
    http.get<{ list: any[]; total: number; page: number; pageSize: number }>('/admin/bookings', { params }),
  cancelBooking: (id: number) => http.put(`/admin/bookings/${id}/cancel`),
  arriveBooking: (id: number) => http.put(`/admin/bookings/${id}/arrive`),
  noShowBooking: (id: number) => http.put(`/admin/bookings/${id}/no-show`),
  completeBooking: (id: number) => http.put(`/admin/bookings/${id}/complete`),
  rescheduleBooking: (id: number, data: object) => http.put(`/admin/bookings/${id}/reschedule`, data),
  getSlots: (params: { shopId: number; serviceId: number; date: string; staffId?: number }) =>
    http.get<any[]>('/bookings/slots', { params }),
  listMembers: (params?: object) =>
    http.get<{ list: any[]; total: number; page: number; pageSize: number }>('/admin/members', { params }),
  getMember: (id: number) => http.get<any>(`/admin/members/${id}`),
  openCard: (memberId: number, data: { templateId: number; remark?: string }) =>
    http.post(`/admin/members/${memberId}/open-card`, data),
  rechargeCard: (cardId: number, data: { amount: number; remark?: string }) =>
    http.post(`/admin/cards/${cardId}/recharge`, data),
  listPayments: (params?: object) =>
    http.get<{ list: any[]; total: number; page: number; pageSize: number }>('/admin/payments', { params }),
  refundPayment: (id: number) => http.post(`/admin/payments/${id}/refund`),
  listTransactions: (params?: object) =>
    http.get<{ list: any[]; total: number; page: number; pageSize: number }>('/admin/transactions', { params }),
  listVerifyRecords: (params?: object) =>
    http.get<{ list: any[]; total: number; page: number; pageSize: number }>('/admin/verify-records', { params }),
  reverseVerify: (verifyRecordId: number) =>
    http.post('/admin/verify/reverse', { verifyRecordId }),
  getShop: () => http.get<Record<string, unknown>>('/admin/shop'),
  updateShop: (data: object) => http.put('/admin/shop', data),
  getShopQrcode: () => http.get<{ qrcodeBase64?: string; dev?: boolean; tip?: string; scene?: string }>('/admin/shop/qrcode'),
  uploadWxCert: async (type: 'privateKey' | 'platformCert', file: File) => {
    const form = new FormData();
    form.append('type', type);
    form.append('file', file);
    const token = localStg.get('token');
    const res = await axios.post('/api/admin/shop/wx-cert', form, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (res.data?.code !== 0) throw new Error(res.data?.message || '上传失败');
    return res.data.data;
  },
  uploadImage: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const token = localStg.get('token');
    const res = await axios.post('/api/admin/upload', form, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (res.data?.code !== 0) throw new Error(res.data?.message || '上传失败');
    return res.data.data as { url: string };
  },
  exportTransactionsCsv: async () => {
    const token = localStg.get('token');
    const res = await axios.get('/api/admin/transactions/export', {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
