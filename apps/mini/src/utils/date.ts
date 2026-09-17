const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return formatLocalDate(new Date(y, m - 1, d + days));
}

export function dateWeekLabel(dateStr: string, today = formatLocalDate(new Date())) {
  if (dateStr === today) return '今天';
  if (dateStr === addDays(today, 1)) return '明天';
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEK_LABELS[new Date(y, m - 1, d).getDay()];
}

export function dateDayNum(dateStr: string) {
  return dateStr.slice(8, 10);
}

export type DateAvailabilityStatus = 'available' | 'full' | 'rest';

export interface DateAvailability {
  date: string;
  availableCount: number;
  status: DateAvailabilityStatus;
}

export interface DateOption extends DateAvailability {
  weekLabel: string;
  dayNum: string;
}

export function availabilityStatusText(status: DateAvailabilityStatus) {
  if (status === 'available') return '可约';
  if (status === 'full') return '约满';
  return '休息';
}
