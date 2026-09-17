import { api } from '@/api';

export interface WxPayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

export async function requestWxPay(payParams: WxPayParams) {
  return new Promise<void>((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      orderInfo: {},
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType,
      paySign: payParams.paySign,
      success: () => resolve(),
      fail: (err) => reject(err),
    });
  });
}

export async function handlePaymentResult(payment: {
  devAutoPaid?: boolean;
  payParams?: WxPayParams;
  outTradeNo?: string;
}) {
  if (payment.devAutoPaid) return;
  if (!payment.payParams) return;

  await requestWxPay(payment.payParams);

  if (payment.outTradeNo) {
    for (let i = 0; i < 5; i++) {
      const status: any = await api.getPaymentStatus(payment.outTradeNo);
      if (status.status === 1) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
