import { createSign, createVerify, randomBytes, createDecipheriv } from 'crypto';
import { readFileSync } from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { EffectiveWxConfig } from '../../common/constants/wx-config';
import { WxConfigService } from '../wx-config/wx-config.service';

export interface WxPayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

export interface WxPayNotifyHeaders {
  timestamp: string;
  nonce: string;
  signature: string;
  serial: string;
}

export interface WxPayNotifyBody {
  id?: string;
  event_type?: string;
  resource?: {
    algorithm: string;
    ciphertext: string;
    associated_data: string;
    nonce: string;
  };
  outTradeNo?: string;
  outRefundNo?: string;
}

export interface WxRefundResult {
  ok: boolean;
  status: 'SUCCESS' | 'PROCESSING' | 'FAILED';
  refundId?: string;
  message?: string;
}

export interface ParsedWxNotify {
  kind: 'pay' | 'refund';
  outTradeNo?: string;
  outRefundNo?: string;
  refundId?: string;
  refundStatus?: string;
  tradeState?: string;
}

type ShopId = number | bigint | string;

type DecryptedNotify = {
  out_trade_no?: string;
  trade_state?: string;
  out_refund_no?: string;
  refund_id?: string;
  refund_status?: string;
};

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);

  constructor(private readonly wxConfig: WxConfigService) {}

  async isConfigured(shopId: ShopId): Promise<boolean> {
    const config = await this.wxConfig.getEffective(shopId);
    return this.wxConfig.isPayConfigured(config);
  }

  async createJsapiOrder(
    shopId: ShopId,
    params: {
      outTradeNo: string;
      amount: number;
      description: string;
      openid: string;
    },
  ): Promise<WxPayParams | null> {
    const config = await this.wxConfig.getEffective(shopId);
    if (!this.wxConfig.isPayConfigured(config)) {
      return null;
    }

    try {
      const body = {
        appid: config.appId,
        mchid: config.mchId,
        description: params.description.slice(0, 127),
        out_trade_no: params.outTradeNo,
        notify_url: config.notifyUrl,
        amount: { total: params.amount, currency: 'CNY' },
        payer: { openid: params.openid },
      };

      const data = await this.v3Post<{ prepay_id?: string; message?: string }>(
        config,
        '/v3/pay/transactions/jsapi',
        body,
      );
      if (!data?.prepay_id) {
        this.logger.error(`WeChat pay prepay failed: ${data?.message ?? JSON.stringify(data)}`);
        return null;
      }

      const privateKey = readFileSync(config.privateKeyPath, 'utf8');
      return this.buildMiniPayParams(config.appId, data.prepay_id, privateKey);
    } catch (e) {
      this.logger.error(`WeChat pay error: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async createRefund(
    shopId: ShopId,
    params: {
      outTradeNo: string;
      outRefundNo: string;
      amount: number;
      total: number;
      reason?: string;
    },
  ): Promise<WxRefundResult> {
    const config = await this.wxConfig.getEffective(shopId);
    if (!this.wxConfig.isPayConfigured(config)) {
      return { ok: false, status: 'FAILED', message: '未配置微信支付' };
    }

    try {
      const body: Record<string, unknown> = {
        out_trade_no: params.outTradeNo,
        out_refund_no: params.outRefundNo,
        reason: (params.reason || '商家退款').slice(0, 80),
        amount: {
          refund: params.amount,
          total: params.total,
          currency: 'CNY',
        },
      };
      if (config.notifyUrl) {
        body.notify_url = config.notifyUrl;
      }

      const data = await this.v3Post<{
        refund_id?: string;
        status?: string;
        message?: string;
        code?: string;
      }>(config, '/v3/refund/domestic/refunds', body);

      if (!data) {
        return { ok: false, status: 'FAILED', message: '微信退款无响应' };
      }

      const status = String(data.status || '').toUpperCase();
      if (status === 'SUCCESS' || status === 'PROCESSING') {
        return {
          ok: true,
          status: status === 'SUCCESS' ? 'SUCCESS' : 'PROCESSING',
          refundId: data.refund_id,
        };
      }

      const message = data.message || data.code || JSON.stringify(data);
      this.logger.error(`WeChat refund failed: ${message}`);
      return { ok: false, status: 'FAILED', message };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`WeChat refund error: ${message}`);
      return { ok: false, status: 'FAILED', message };
    }
  }

  private buildMiniPayParams(appId: string, prepayId: string, privateKey: string): WxPayParams {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;
    const message = `${appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    const paySign = createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
    return { timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign };
  }

  private async v3Post<T>(
    config: EffectiveWxConfig,
    path: string,
    body: unknown,
  ): Promise<T | null> {
    const privateKey = readFileSync(config.privateKeyPath, 'utf8');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = randomBytes(16).toString('hex');
    const bodyStr = JSON.stringify(body);
    const message = `POST\n${path}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
    const signature = createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
    const authorization =
      `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",` +
      `signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;

    const res = await fetch(`https://api.mch.weixin.qq.com${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authorization,
      },
      body: bodyStr,
    });

    const data = (await res.json()) as T & { message?: string; code?: string };
    if (!res.ok) {
      this.logger.error(`WeChat V3 ${path} ${res.status}: ${data?.message ?? JSON.stringify(data)}`);
      return data;
    }
    return data;
  }

  verifyNotifySignature(
    config: EffectiveWxConfig,
    headers: WxPayNotifyHeaders,
    rawBody: Buffer | string,
  ): boolean {
    if (!config.platformCertPath) {
      return true;
    }
    try {
      const publicKey = readFileSync(config.platformCertPath, 'utf8');
      const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const message = `${headers.timestamp}\n${headers.nonce}\n${body}\n`;
      return createVerify('RSA-SHA256')
        .update(message)
        .verify(publicKey, headers.signature, 'base64');
    } catch (e) {
      this.logger.error(`Verify notify signature failed: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }

  decryptNotifyResource(
    config: EffectiveWxConfig,
    resource: {
      ciphertext: string;
      associated_data: string;
      nonce: string;
    },
  ): DecryptedNotify | null {
    if (!config.apiV3Key || config.apiV3Key.length !== 32) {
      return null;
    }
    try {
      const key = Buffer.from(config.apiV3Key, 'utf8');
      const ciphertext = Buffer.from(resource.ciphertext, 'base64');
      const authTag = ciphertext.subarray(ciphertext.length - 16);
      const data = ciphertext.subarray(0, ciphertext.length - 16);
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(resource.nonce, 'utf8'));
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
      const decoded = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
      return JSON.parse(decoded) as DecryptedNotify;
    } catch (e) {
      this.logger.error(`Decrypt notify failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async parseNotify(
    shopId: ShopId,
    body: WxPayNotifyBody,
    headers?: WxPayNotifyHeaders,
    rawBody?: Buffer | string,
  ): Promise<ParsedWxNotify | null> {
    const eventType = String(body.event_type || '').toUpperCase();
    const isRefund = eventType.startsWith('REFUND') || Boolean(body.outRefundNo);

    if (body.outRefundNo || (body.outTradeNo && !body.resource && isRefund)) {
      return {
        kind: 'refund',
        outTradeNo: body.outTradeNo,
        outRefundNo: body.outRefundNo,
        refundStatus: 'SUCCESS',
      };
    }

    if (body.outTradeNo && !body.resource) {
      return { kind: 'pay', outTradeNo: body.outTradeNo, tradeState: 'SUCCESS' };
    }

    if (!body.resource) {
      return null;
    }

    const config = await this.wxConfig.getEffective(shopId);
    if (headers && rawBody && !this.verifyNotifySignature(config, headers, rawBody)) {
      this.logger.warn('WeChat pay notify signature verification failed');
      return null;
    }

    const decrypted = this.decryptNotifyResource(config, body.resource);
    if (!decrypted) {
      return null;
    }

    if (isRefund || decrypted.out_refund_no) {
      return {
        kind: 'refund',
        outTradeNo: decrypted.out_trade_no,
        outRefundNo: decrypted.out_refund_no,
        refundId: decrypted.refund_id,
        refundStatus: decrypted.refund_status || (eventType.includes('SUCCESS') ? 'SUCCESS' : eventType),
      };
    }

    if (!decrypted.out_trade_no) {
      return null;
    }
    if (decrypted.trade_state && decrypted.trade_state !== 'SUCCESS') {
      return null;
    }
    return {
      kind: 'pay',
      outTradeNo: decrypted.out_trade_no,
      tradeState: decrypted.trade_state || 'SUCCESS',
    };
  }

  async parseNotifyOutTradeNo(
    shopId: ShopId,
    body: WxPayNotifyBody,
    headers?: WxPayNotifyHeaders,
    rawBody?: Buffer | string,
  ): Promise<string | null> {
    const parsed = await this.parseNotify(shopId, body, headers, rawBody);
    return parsed?.kind === 'pay' ? parsed.outTradeNo ?? null : null;
  }
}
