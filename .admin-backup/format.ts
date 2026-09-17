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
