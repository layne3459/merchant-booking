import { request } from '@/utils/request';
import { getShopId } from '@/utils/shop';

function buildQuery(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

export const api = {  wxLogin: (code: string) =>
    request<{ token: string; member: object }>('/auth/wx-login', {
      method: 'POST',
      data: { code, shopId: String(getShopId()) },
      auth: false,
    }),
  bindPhone: (phone: string) => request('/auth/bind-phone', { method: 'POST', data: { phone } }),
  bindWxPhone: (phoneCode: string) =>
    request('/auth/wx-phone', { method: 'POST', data: { phoneCode } }),
  getProfile: () => request<Record<string, unknown>>('/auth/profile'),
  staffEnter: () =>
    request<{ token: string; staff: object }>('/auth/staff-enter', { method: 'POST' }),
  staffLogin: (phone: string) =>
    request<{ token: string; staff: object }>('/auth/staff-login', {
      method: 'POST',
      data: { phone, shopId: String(getShopId()) },
      auth: false,
    }),
  getShop: (opts?: { silent?: boolean }) =>
    request(`/shops/${getShopId()}`, { auth: false, silent: opts?.silent }),
  getServices: (opts?: { silent?: boolean }) =>
    request(`/shops/${getShopId()}/services`, { auth: false, silent: opts?.silent }),
  getCardTemplates: () => request(`/shops/${getShopId()}/card-templates`, { auth: false }),
  getSlots: (
    params: { serviceId: number; date: string; staffId?: number },
    opts?: { silent?: boolean },
  ) => {
    const shopId = getShopId();
    const query = buildQuery({ date: params.date, staffId: params.staffId });
    return request(`/shops/${shopId}/services/${params.serviceId}/slots?${query}`, {
      auth: false,
      silent: opts?.silent,
    });
  },
  getAvailability: (params: {
    serviceId: number;
    from: string;
    days?: number;
    staffId?: number;
  }) => {
    const shopId = getShopId();
    const query = buildQuery({
      from: params.from,
      days: params.days ?? 14,
      staffId: params.staffId,
    });
    return request(
      `/shops/${shopId}/services/${params.serviceId}/availability?${query}`,
      { auth: false },
    );
  },  createBooking: (data: object) => request('/bookings', { method: 'POST', data }),
  myBookings: () => request('/bookings/my'),
  getBooking: (id: number) => request(`/bookings/${id}`),
  cancelBooking: (id: number) => request(`/bookings/${id}/cancel`, { method: 'PUT' }),
  rescheduleBooking: (id: number, data: object) =>
    request(`/bookings/${id}/reschedule`, { method: 'PUT', data }),
  completeBooking: (id: number) => request(`/bookings/${id}/complete`, { method: 'PUT' }),
  myCards: () => request('/cards/my'),
  purchaseCard: (templateId: number) =>
    request('/cards/purchase', { method: 'POST', data: { templateId } }),
  getPaymentStatus: (outTradeNo: string) => request(`/pay/status/${outTradeNo}`),
  verifyCode: (cardId: number) => request(`/verify/code?cardId=${cardId}`),
  todayBookings: () => request('/bookings/today'),
  arriveBooking: (id: number) => request(`/bookings/${id}/arrive`, { method: 'PUT' }),
  noShowBooking: (id: number) => request(`/bookings/${id}/no-show`, { method: 'PUT' }),
  consumeVerify: (code: string, serviceId: number) =>
    request('/verify/consume', { method: 'POST', data: { code, serviceId } }),
  manualVerify: (phone: string, serviceId: number, cardId: number) =>
    request('/verify/manual', { method: 'POST', data: { phone, serviceId, cardId } }),
  verifyRecords: (params?: { page?: number; pageSize?: number; today?: boolean }) =>
    request<{ list: any[]; total: number; page: number; pageSize: number }>('/verify/records', {
      data: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 20,
        today: params?.today ? '1' : undefined,
      },
    }),
  searchMember: (phone: string) => request<any[]>('/members/search', { data: { phone } }),
  getMember: (id: number) => request(`/members/${id}`),
  openCard: (memberId: number, templateId: number, remark?: string) =>
    request('/cards/open', {
      method: 'POST',
      data: { memberId, templateId, remark },
    }),
};
