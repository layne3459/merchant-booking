import { Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { WxConfigService } from '../wx-config/wx-config.service';

interface WxSessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WxTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WxPhoneResponse {
  errcode?: number;
  errmsg?: string;
  phone_info?: { phoneNumber?: string; purePhoneNumber?: string };
}

type ShopId = number | bigint | string;

/** 与 mini devWxLoginCode / prisma seed 一致，开发环境固定同一会员 */
const DEV_DEMO_LOGIN_CODE = 'dev_demo_user';
const DEV_DEMO_OPENID = `dev_openid_${DEV_DEMO_LOGIN_CODE}`;

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly accessTokens = new Map<string, { token: string; expiresAt: number }>();

  constructor(private readonly wxConfig: WxConfigService) {}

  async isDevMode(shopId: ShopId): Promise<boolean> {
    const config = await this.wxConfig.getEffective(shopId);
    return this.wxConfig.isDevMode(config);
  }

  async code2Session(
    shopId: ShopId,
    code: string,
  ): Promise<{ openid: string; unionid?: string }> {
    const config = await this.wxConfig.getEffective(shopId);
    if (this.wxConfig.isDevMode(config)) {
      // 开发环境固定 openid，避免每次 uni.login 的 code 不同而创建新会员、丢失手机号
      return { openid: DEV_DEMO_OPENID, unionid: undefined };
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', config.appId);
    url.searchParams.set('secret', config.appSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const res = await fetch(url);
    const data = (await res.json()) as WxSessionResponse;
    if (data.errcode || !data.openid) {
      throw new BusinessException(ErrorCodes.UNAUTHORIZED, data.errmsg ?? '微信登录失败');
    }
    return { openid: data.openid, unionid: data.unionid };
  }

  async getPhoneNumber(shopId: ShopId, phoneCode: string): Promise<string> {
    const config = await this.wxConfig.getEffective(shopId);
    if (this.wxConfig.isDevMode(config)) {
      return `138${phoneCode.replace(/\D/g, '').slice(-8).padStart(8, '0')}`;
    }

    const token = await this.getAccessToken(shopId);
    const res = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: phoneCode }),
      },
    );
    const data = (await res.json()) as WxPhoneResponse;
    if (data.errcode || !data.phone_info?.phoneNumber) {
      this.logger.error(`getPhoneNumber failed: ${data.errmsg ?? JSON.stringify(data)}`);
      const wxMsg = data.errmsg ?? '';
      if (wxMsg.includes('短信验证') || wxMsg.includes('需要进行验证')) {
        throw new BusinessException(
          ErrorCodes.BAD_REQUEST,
          '微信账号手机号未验证，请在微信「我-设置-账号与安全-手机号」完成验证，或改用手动绑定',
        );
      }
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '获取手机号失败，请改用手动绑定');
    }
    return data.phone_info.purePhoneNumber ?? data.phone_info.phoneNumber;
  }

  private async getAccessToken(shopId: ShopId): Promise<string> {
    const cacheKey = String(shopId);
    const cached = this.accessTokens.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const config = await this.wxConfig.getEffective(shopId);
    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', config.appId);
    url.searchParams.set('secret', config.appSecret);

    const res = await fetch(url);
    const data = (await res.json()) as WxTokenResponse;
    if (!data.access_token) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, data.errmsg ?? '获取 access_token 失败');
    }

    this.accessTokens.set(cacheKey, {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000 - 60_000,
    });
    return data.access_token;
  }

  async sendSubscribeMessage(
    shopId: ShopId,
    params: {
      openid: string;
      templateId: string;
      page?: string;
      data: Record<string, { value: string }>;
    },
  ): Promise<boolean> {
    const config = await this.wxConfig.getEffective(shopId);
    if (this.wxConfig.isDevMode(config)) {
      this.logger.log(`[dev] subscribe ${params.templateId} → ${params.openid}`);
      return true;
    }

    const token = await this.getAccessToken(shopId);
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: params.openid,
          template_id: params.templateId,
          page: params.page ?? 'pages/booking/list',
          data: params.data,
          miniprogram_state: 'formal',
        }),
      },
    );
    const body = (await res.json()) as { errcode?: number; errmsg?: string };
    if (body.errcode !== 0) {
      this.logger.warn(`subscribe send failed: ${body.errmsg}`);
      return false;
    }
    return true;
  }

  async getUnlimitedQrCode(
    shopId: ShopId,
    scene: string,
    page = 'pages/index/index',
  ): Promise<Buffer | null> {
    const config = await this.wxConfig.getEffective(shopId);
    if (this.wxConfig.isDevMode(config)) return null;

    const token = await this.getAccessToken(shopId);
    const res = await fetch(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene, page, width: 280 }),
      },
    );
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('image')) {
      const err = await res.text();
      this.logger.warn(`qrcode failed: ${err}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
