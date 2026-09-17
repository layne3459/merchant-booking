export const BookingStatus = {
  PENDING_PAY: 0,
  BOOKED: 1,
  ARRIVED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  NO_SHOW: 5,
} as const;

export const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING_PAY,
  BookingStatus.BOOKED,
  BookingStatus.ARRIVED,
];

export const CardType = {
  BALANCE: 1,
  TIMES: 2,
  PERIOD: 3,
} as const;

export const PaymentStatus = {
  PENDING: 0,
  PAID: 1,
  REFUNDED: 2,
} as const;

export const RefundStatus = {
  PROCESSING: 0,
  SUCCESS: 1,
  FAILED: 2,
} as const;

export const ShopStatus = {
  DISABLED: 0,
  ACTIVE: 1,
} as const;

export const SubscriptionStatus = {
  TRIAL: 1,
  ACTIVE: 2,
  EXPIRED: 3,
  FROZEN: 4,
} as const;
