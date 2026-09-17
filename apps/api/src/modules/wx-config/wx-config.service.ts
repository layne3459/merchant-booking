import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EffectiveWxConfig,
  EMPTY_WX_CONFIG_PUBLIC,
  getWxConfigStatus,
  maskSecret,
  ShopWxConfigInput,
  ShopWxConfigPublic,
  shouldKeepSecret,
  StoredShopWxConfig,
  WxConfigStatus,
} from '../../common/constants/wx-config';
import { decryptSecret, encryptSecret } from '../../common/utils/secret-crypto';

type ShopId = number | bigint | string;

function toShopId(shopId: ShopId): bigint {
  return BigInt(shopId);
}

@Injectable()
export class WxConfigService {
  private readonly certRoot = join(process.cwd(), 'uploads', 'wx-certs');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private cryptoKey(): string {
    return this.config.get<string>('JWT_SECRET', 'dev-secret');
  }

  private certDir(shopId: ShopId): string {
    return join(this.certRoot, String(shopId));
  }

  private privateKeyPath(shopId: ShopId): string {
    return join(this.certDir(shopId), 'apiclient_key.pem');
  }

  private platformCertPath(shopId: ShopId): string {
    return join(this.certDir(shopId), 'wechatpay_platform.pem');
  }

  private notifyUrl(shopId: ShopId): string {
    const base = (this.config.get<string>('API_BASE_URL', '') || '').replace(/\/$/, '');
    if (!base) return '';
    return `${base}/api/pay/notify?shop=${shopId}`;
  }

  /** 始终带 shop 参数；优先 API_BASE_URL 自动生成，兼容旧版 WX_NOTIFY_URL */
  private resolveNotifyUrl(shopId: ShopId): string {
    const auto = this.notifyUrl(shopId);
    if (auto) return auto;

    const legacy = (this.config.get<string>('WX_NOTIFY_URL', '') || '').trim();
    if (!legacy) return '';

    if (/[?&]shop=/.test(legacy)) return legacy;
    const sep = legacy.includes('?') ? '&' : '?';
    return `${legacy}${sep}shop=${shopId}`;
  }

  private fromEnv(): Partial<EffectiveWxConfig> {
    return {
      appId: this.config.get<string>('WX_APPID', ''),
      appSecret: this.config.get<string>('WX_SECRET', ''),
      mchId: this.config.get<string>('WX_MCH_ID', ''),
      apiV3Key: this.config.get<string>('WX_API_V3_KEY', ''),
      serialNo: this.config.get<string>('WX_SERIAL_NO', ''),
      privateKeyPath: this.config.get<string>('WX_PRIVATE_KEY_PATH', ''),
      platformCertPath: this.config.get<string>('WX_PLATFORM_CERT_PATH', ''),
      tplBookingSuccess: this.config.get<string>('WX_TPL_BOOKING_SUCCESS', ''),
      tplBookingRemind: this.config.get<string>('WX_TPL_BOOKING_REMIND', ''),
      tplNewBooking: this.config.get<string>('WX_TPL_NEW_BOOKING', ''),
    };
  }

  private hasStoredConfig(stored: StoredShopWxConfig): boolean {
    return Boolean(
      stored.appId ||
        stored.appSecretEnc ||
        stored.mchId ||
        stored.apiV3KeyEnc ||
        stored.serialNo ||
        stored.hasPrivateKey ||
        stored.tplBookingSuccess ||
        stored.tplBookingRemind ||
        stored.tplNewBooking,
    );
  }

  private decryptField(enc?: string): string {
    if (!enc) return '';
    return decryptSecret(enc, this.cryptoKey());
  }

  async getStored(shopId: ShopId): Promise<StoredShopWxConfig> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: toShopId(shopId) },
      select: { wxConfig: true },
    });
    return (shop?.wxConfig as StoredShopWxConfig | null) ?? {};
  }

  async getEffective(shopId: ShopId): Promise<EffectiveWxConfig & { hasPrivateKey: boolean; hasPlatformCert: boolean }> {
    const stored = await this.getStored(shopId);
    const env = this.fromEnv();
    const useShop = this.hasStoredConfig(stored);

    const appId = (useShop ? stored.appId : env.appId) ?? '';
    const appSecret = useShop ? this.decryptField(stored.appSecretEnc) : (env.appSecret ?? '');
    const mchId = (useShop ? stored.mchId : env.mchId) ?? '';
    const apiV3Key = useShop ? this.decryptField(stored.apiV3KeyEnc) : (env.apiV3Key ?? '');
    const serialNo = (useShop ? stored.serialNo : env.serialNo) ?? '';

    let privateKeyPath = '';
    let platformCertPath = '';
    let hasPrivateKey = false;
    let hasPlatformCert = false;

    if (useShop) {
      privateKeyPath = stored.hasPrivateKey ? this.privateKeyPath(shopId) : '';
      platformCertPath = stored.hasPlatformCert ? this.platformCertPath(shopId) : '';
      hasPrivateKey = Boolean(stored.hasPrivateKey && existsSync(privateKeyPath));
      hasPlatformCert = Boolean(stored.hasPlatformCert && existsSync(platformCertPath));
    } else {
      privateKeyPath = env.privateKeyPath ?? '';
      platformCertPath = env.platformCertPath ?? '';
      hasPrivateKey = Boolean(privateKeyPath && existsSync(privateKeyPath));
      hasPlatformCert = Boolean(platformCertPath && existsSync(platformCertPath));
    }

    const notifyUrl = this.resolveNotifyUrl(shopId);

    return {
      appId,
      appSecret,
      mchId,
      apiV3Key,
      serialNo,
      privateKeyPath,
      platformCertPath,
      notifyUrl,
      tplBookingSuccess: (useShop ? stored.tplBookingSuccess : env.tplBookingSuccess) ?? '',
      tplBookingRemind: (useShop ? stored.tplBookingRemind : env.tplBookingRemind) ?? '',
      tplNewBooking: (useShop ? stored.tplNewBooking : env.tplNewBooking) ?? '',
      hasPrivateKey,
      hasPlatformCert,
    };
  }

  async getStatus(shopId: ShopId): Promise<WxConfigStatus> {
    const stored = await this.getStored(shopId);
    const effective = await this.getEffective(shopId);
    const source = this.hasStoredConfig(stored) ? 'shop' : effective.appId || effective.mchId ? 'env' : 'none';
    return getWxConfigStatus(effective, source);
  }

  async toPublic(shopId: ShopId): Promise<ShopWxConfigPublic> {
    const stored = await this.getStored(shopId);
    if (!this.hasStoredConfig(stored)) {
      const env = this.fromEnv();
      const hasPrivateKey = Boolean(env.privateKeyPath && existsSync(env.privateKeyPath));
      const hasPlatformCert = Boolean(env.platformCertPath && existsSync(env.platformCertPath));
      return {
        appId: env.appId ?? '',
        appSecret: env.appSecret ? maskSecret(env.appSecret) : '',
        mchId: env.mchId ?? '',
        apiV3Key: env.apiV3Key ? maskSecret(env.apiV3Key) : '',
        serialNo: env.serialNo ?? '',
        tplBookingSuccess: env.tplBookingSuccess ?? '',
        tplBookingRemind: env.tplBookingRemind ?? '',
        tplNewBooking: env.tplNewBooking ?? '',
        hasPrivateKey,
        hasPlatformCert,
      };
    }

    const appSecret = this.decryptField(stored.appSecretEnc);
    const apiV3Key = this.decryptField(stored.apiV3KeyEnc);
    const privateKeyPath = this.privateKeyPath(shopId);
    const platformCertPath = this.platformCertPath(shopId);

    return {
      appId: stored.appId ?? '',
      appSecret: appSecret ? maskSecret(appSecret) : '',
      mchId: stored.mchId ?? '',
      apiV3Key: apiV3Key ? maskSecret(apiV3Key) : '',
      serialNo: stored.serialNo ?? '',
      tplBookingSuccess: stored.tplBookingSuccess ?? '',
      tplBookingRemind: stored.tplBookingRemind ?? '',
      tplNewBooking: stored.tplNewBooking ?? '',
      hasPrivateKey: Boolean(stored.hasPrivateKey && existsSync(privateKeyPath)),
      hasPlatformCert: Boolean(stored.hasPlatformCert && existsSync(platformCertPath)),
    };
  }

  async mergeAndSave(shopId: ShopId, input: ShopWxConfigInput): Promise<ShopWxConfigPublic> {
    const stored = await this.getStored(shopId);
    const next: StoredShopWxConfig = { ...stored };

    if (input.appId !== undefined) next.appId = String(input.appId).trim();
    if (input.mchId !== undefined) next.mchId = String(input.mchId).trim();
    if (input.serialNo !== undefined) next.serialNo = String(input.serialNo).trim();
    if (input.tplBookingSuccess !== undefined) next.tplBookingSuccess = String(input.tplBookingSuccess).trim();
    if (input.tplBookingRemind !== undefined) next.tplBookingRemind = String(input.tplBookingRemind).trim();
    if (input.tplNewBooking !== undefined) next.tplNewBooking = String(input.tplNewBooking).trim();

    if (input.appSecret !== undefined && !shouldKeepSecret(input.appSecret)) {
      const secret = String(input.appSecret).trim();
      if (secret) next.appSecretEnc = encryptSecret(secret, this.cryptoKey());
    }

    if (input.apiV3Key !== undefined && !shouldKeepSecret(input.apiV3Key)) {
      const key = String(input.apiV3Key).trim();
      if (key) next.apiV3KeyEnc = encryptSecret(key, this.cryptoKey());
    }

    await this.prisma.shop.update({
      where: { id: toShopId(shopId) },
      data: { wxConfig: next as Prisma.InputJsonValue },
    });

    return this.toPublic(shopId);
  }

  async saveCert(shopId: ShopId, type: 'privateKey' | 'platformCert', content: Buffer): Promise<void> {
    const dir = this.certDir(shopId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const filename = type === 'privateKey' ? 'apiclient_key.pem' : 'wechatpay_platform.pem';
    writeFileSync(join(dir, filename), content);

    const stored = await this.getStored(shopId);
    const next: StoredShopWxConfig = { ...stored };
    if (type === 'privateKey') next.hasPrivateKey = true;
    else next.hasPlatformCert = true;

    await this.prisma.shop.update({
      where: { id: toShopId(shopId) },
      data: { wxConfig: next as Prisma.InputJsonValue },
    });
  }

  isDevMode(config: EffectiveWxConfig): boolean {
    if (!config.appId || config.appId.includes('xxxx')) return true;
    if (!config.appSecret || config.appSecret.includes('xxxx')) return true;
    return false;
  }

  isPayConfigured(config: EffectiveWxConfig & { hasPrivateKey?: boolean }): boolean {
    if (!config.mchId || /^1234567890$/.test(config.mchId)) return false;
    if (!config.apiV3Key || config.apiV3Key.length !== 32) return false;
    if (!config.serialNo) return false;
    if (!config.privateKeyPath || !config.hasPrivateKey) return false;
    return true;
  }

  emptyPublic(): ShopWxConfigPublic {
    return { ...EMPTY_WX_CONFIG_PUBLIC };
  }
}
