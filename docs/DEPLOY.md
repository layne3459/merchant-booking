# 生产部署指南

**中文** | [English](./DEPLOY.en.md)

## 1. 服务器与域名

1. 购买云服务器（推荐 2核4G+）并安装 Docker / Nginx
2. 备案域名，例如：
   - API：`https://api.yourdomain.com`
   - 后台：`https://admin.yourdomain.com`
3. 申请 SSL 证书（Let's Encrypt 或云厂商免费证书）

## 2. 微信小程序配置

在微信公众平台 → 开发管理：

| 配置项 | 值 |
|--------|-----|
| request 合法域名 | `https://api.yourdomain.com` |
| uploadFile 合法域名 | 同上（如需上传图片） |
| 服务器域名 | 必须 HTTPS，不支持 IP |

填写真实 `WX_APPID` / `WX_SECRET` 到 `.env`。

## 3. 微信支付配置

1. 开通微信支付商户号，绑定小程序 AppID
2. 下载 API 证书，放到 `apps/api/certs/apiclient_key.pem`
3. 配置 `.env`：

```env
WX_MCH_ID=你的商户号
WX_API_V3_KEY=32位APIv3密钥
WX_SERIAL_NO=证书序列号
WX_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
WX_NOTIFY_URL=https://api.yourdomain.com/api/pay/notify
```

4. 在微信商户平台配置支付回调 URL（与 `WX_NOTIFY_URL` 一致）

开发环境（`NODE_ENV=development` 或未配置商户号）会自动模拟支付成功。

## 4. Nginx 反向代理示例

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/api.crt;
    ssl_certificate_key /etc/nginx/ssl/api.key;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name admin.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/admin.crt;
    ssl_certificate_key /etc/nginx/ssl/admin.key;

    root /var/www/merchant-booking/admin;
    try_files $uri $uri/ /index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
    }
}
```

## 5. 构建与启动

```bash
# 构建
pnpm --filter @merchant-booking/api build
pnpm --filter @merchant-booking/admin build
pnpm --filter @merchant-booking/mini build:mp-weixin

# 数据库迁移（生产）
cd apps/api && pnpm prisma migrate deploy

# 启动 API（建议 pm2）
NODE_ENV=production node dist/main.js
```

小程序：微信开发者工具上传 `apps/mini/dist/build/mp-weixin`，提交审核。

## 6. 小程序 API 地址

生产环境修改 `apps/mini/src/config.ts` 中 `API_BASE` 为：

```ts
export const API_BASE = 'https://api.yourdomain.com/api';
```

或通过构建环境变量注入（推荐上线前改一次）。

## 7. 上线检查清单

- [ ] MySQL / Redis 已启动且可连接
- [ ] `.env` 中 JWT_SECRET 已改为随机强密码
- [ ] 微信登录、手机号、支付在真机测试通过
- [ ] 支付回调 URL 公网可访问
- [ ] 店员扫码核销在真机测试通过
- [ ] 后台 HTTPS 可访问且登录正常
