<div align="center">

# Merchant Booking

**Booking · membership · verification** · Monorepo

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-monorepo-F69220?style=flat-square&logo=pnpm&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img alt="Vue" src="https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vue.js&logoColor=white" />
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="uni-app" src="https://img.shields.io/badge/uni--app-WeChat-07C160?style=flat-square&logo=wechat&logoColor=white" />
</p>

[中文](./README.md) · **English** · [GitHub](https://github.com/layne3459/merchant-booking) · [Gitee](https://gitee.com/layne3459/merchant-booking)

</div>

---

## Overview

One repo ships the **WeChat mini program** (customer + staff), **Vue admin**, and **NestJS API**: booking, membership cards, verification, WeChat Pay, and multi-shop SaaS. Dev mocks WeChat login and pay; configure AppID and merchant credentials for production.

| App | Path |
| --- | --- |
| API | `apps/api` — NestJS, Prisma, MySQL, Redis, cron jobs |
| Admin | `apps/admin` — Vue 3, Element Plus |
| Mini program | `apps/mini` — uni-app (WeChat) |
| Infra | `docker/` — MySQL 8, Redis 7 |

## Quick start

**Requires** Node.js ≥ 20, pnpm, Docker (optional), WeChat DevTools.

```bash
pnpm docker:up          # optional
cp .env.example .env
pnpm install && pnpm db:migrate && pnpm db:seed
pnpm dev:api            # http://localhost:3000/api
pnpm dev:admin          # http://localhost:5173
pnpm dev:mini           # open apps/mini/dist/dev/mp-weixin
```

Also: `pnpm db:generate`, `pnpm docker:down`, `pnpm kill:dev`. `dev:mini` syncs `WX_APPID` and LAN API URL.

## Demo accounts

After `pnpm db:seed`, demo shop ID **`10000000001`** (demo salon).

| Role | Login |
| --- | --- |
| Shop owner | `admin` / `admin123` (shop ID optional) |
| Platform | `platform` / `platform123` |
| Staff | `13800000001`, `13800000002` |
| Demo member | Simulated login (see `DEV_OPENID` in seed output) |

Placeholder `WX_APPID` or `WX_MCH_ID=1234567890` enables mocks; admin **Shop settings → WeChat & payment** overrides some env vars.

## Features

| Surface | Capabilities |
| --- | --- |
| Customer mini program | Services, staff slots, pay to book, reschedule/cancel, cards, verify code, subscribe messages, entry `scene=s{shopId}` |
| Staff mini program | Today’s bookings, scan/manual verify, members, arrived/no-show/done |
| Admin | Services & schedules, bookings & members, card templates, payments/refunds, reports, shop/WeChat settings, platform onboarding |
| API | `auth` `shop` `booking` `member` `card` `payment` `verify` `upload` `notify` `platform`, etc.; uploads under `uploads/` |

## Screenshots

Captured from a local `pnpm db:seed` run (customer UI via H5; same as the WeChat mini program).

**Customer app**

<table>
<tr>
<td align="center" width="25%"><img src="./docs/assets/screenshots/merchant-h5-home.png" width="168" alt="Shop home" /><br /><sub>Home</sub></td>
<td align="center" width="25%"><img src="./docs/assets/screenshots/merchant-h5-slots.png" width="168" alt="Pick a slot" /><br /><sub>Slots</sub></td>
<td align="center" width="25%"><img src="./docs/assets/screenshots/merchant-h5-bookings.png" width="168" alt="My bookings" /><br /><sub>Bookings</sub></td>
<td align="center" width="25%"><img src="./docs/assets/screenshots/merchant-h5-cards.png" width="168" alt="Membership cards" /><br /><sub>Cards</sub></td>
</tr>
</table>

**Admin**

<table>
<tr>
<td align="center" width="50%"><img src="./docs/assets/screenshots/merchant-admin-dashboard.png" width="400" alt="Dashboard" /><br /><sub>Dashboard</sub></td>
<td align="center" width="50%"><img src="./docs/assets/screenshots/merchant-admin-booking-list.png" width="400" alt="Bookings" /><br /><sub>Bookings</sub></td>
</tr>
<tr>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-members.png" width="400" alt="Members" /><br /><sub>Members</sub></td>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-services.png" width="400" alt="Services" /><br /><sub>Services</sub></td>
</tr>
<tr>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-staff.png" width="400" alt="Staff" /><br /><sub>Staff</sub></td>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-schedules.png" width="400" alt="Schedules" /><br /><sub>Schedules</sub></td>
</tr>
<tr>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-card-templates.png" width="400" alt="Card templates" /><br /><sub>Cards</sub></td>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-settings.png" width="400" alt="Shop settings" /><br /><sub>Settings</sub></td>
</tr>
</table>

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `REDIS_URL` | Database and cache |
| `JWT_SECRET` | Auth |
| `API_BASE_URL` | Public API (**HTTPS in production** for pay notify) |
| `WX_*` | Mini program and WeChat Pay |
| `ADMIN_ORIGIN` | Admin CORS |

## Documentation

| Doc | Description |
| --- | --- |
| [docs/DATA.en.md](./docs/DATA.en.md) · [中文](./docs/DATA.md) | Schema, migrations, Redis, cron |
| [docs/DEPLOY.en.md](./docs/DEPLOY.en.md) · [中文](./docs/DEPLOY.md) | Production deploy |
| `apps/api/prisma/schema.prisma` | Schema source of truth |

Push both remotes: `git push origin master` (GitHub + Gitee).
