# Production deployment

[中文](./DEPLOY.md) | **English**

## 1. Server and domains

1. Cloud server (2 vCPU / 4 GB RAM or more) with Docker and Nginx
2. Registered domains, for example:
   - API: `https://api.yourdomain.com`
   - Admin: `https://admin.yourdomain.com`
3. TLS certificates (Let's Encrypt or your cloud provider)

## 2. WeChat mini program

WeChat Official Platform → Development:

| Setting | Value |
| --- | --- |
| request合法域名 | `https://api.yourdomain.com` |
| uploadFile合法域名 | Same (if uploading images) |
| Server domain | HTTPS required; IP not allowed |

Set real `WX_APPID` / `WX_SECRET` in `.env`.

## 3. WeChat Pay

1. Enable merchant account and bind mini program AppID
2. Download API cert to `apps/api/certs/apiclient_key.pem`
3. Configure `.env`:

```env
WX_MCH_ID=your_merchant_id
WX_API_V3_KEY=32_char_apiv3_key
WX_SERIAL_NO=certificate_serial
WX_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
WX_NOTIFY_URL=https://api.yourdomain.com/api/pay/notify
```

4. Set the same notify URL in the merchant platform

In development (`NODE_ENV=development` or placeholder merchant id), payments are simulated.

## 4. Nginx example

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

## 5. Build and run

```bash
# Build
pnpm --filter @merchant-booking/api build
pnpm --filter @merchant-booking/admin build
pnpm --filter @merchant-booking/mini build:mp-weixin

# Database (production)
cd apps/api && pnpm prisma migrate deploy

# Start API (pm2 recommended)
NODE_ENV=production node dist/main.js
```

Mini program: upload `apps/mini/dist/build/mp-weixin` via WeChat DevTools and submit for review.

## 6. Mini program API base URL

Set production `API_BASE` in `apps/mini/src/config.ts`:

```ts
export const API_BASE = 'https://api.yourdomain.com/api';
```

Or inject via build-time env (recommended before release).

## 7. Pre-launch checklist

- [ ] MySQL and Redis reachable
- [ ] `JWT_SECRET` is a strong random value
- [ ] WeChat login, phone, and payment tested on real devices
- [ ] Payment notify URL reachable from the public internet
- [ ] Staff scan verification tested on real devices
- [ ] Admin over HTTPS and login works
