<div align="center">

# Merchant Booking

本地商家 **预约 · 会员 · 核销** · Monorepo

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-monorepo-F69220?style=flat-square&logo=pnpm&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img alt="Vue" src="https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vue.js&logoColor=white" />
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="uni-app" src="https://img.shields.io/badge/uni--app-WeChat-07C160?style=flat-square&logo=wechat&logoColor=white" />
</p>

**中文** · [English](./README.en.md) · [GitHub](https://github.com/layne3459/merchant-booking) · [Gitee](https://gitee.com/layne3459/merchant-booking)

</div>

---

## 简介

一套仓库交付 **微信小程序**（顾客 + 店员）、**Vue 管理后台** 与 **NestJS API**，覆盖预约、会员卡、核销、微信支付与平台多店铺 SaaS。开发环境可模拟微信登录与支付；生产配置 AppID / 商户号即可上线。

| 应用 | 路径 |
| --- | --- |
| API | `apps/api` — NestJS、Prisma、MySQL、Redis、定时任务 |
| 后台 | `apps/admin` — Vue 3、Element Plus |
| 小程序 | `apps/mini` — uni-app（微信） |
| 依赖 | `docker/` — MySQL 8、Redis 7 |

## 快速开始

**环境**：Node.js ≥ 20、pnpm、Docker（可选）、微信开发者工具。

```bash
pnpm docker:up          # 可选
cp .env.example .env
pnpm install && pnpm db:migrate && pnpm db:seed
pnpm dev:api            # http://localhost:3000/api
pnpm dev:admin          # http://localhost:5173
pnpm dev:mini           # 打开 apps/mini/dist/dev/mp-weixin
```

其它：`pnpm db:generate`、`pnpm docker:down`、`pnpm kill:dev`。`dev:mini` 会同步 `WX_APPID` 与局域网 API 地址。

## 演示账号

`pnpm db:seed` 后默认店铺 ID **`10000000001`**（悦己美发沙龙）。

| 角色 | 登录 |
| --- | --- |
| 店老板 | `admin` / `admin123`（可不填店铺 ID） |
| 平台 | `platform` / `platform123` |
| 店员 | `13800000001`、`13800000002` |
| 演示会员 | 开发模拟登录（见 seed 输出的 `DEV_OPENID`） |

占位 `WX_APPID` 或 `WX_MCH_ID=1234567890` 时走模拟逻辑；亦可在后台 **店铺设置 → 微信与支付** 配置（优先于部分 `.env`）。

## 功能概览

| 端 | 能力 |
| --- | --- |
| 顾客小程序 | 浏览服务、选技师时段、预约支付、改期取消、购卡、核销码、订阅消息、扫码进店 `scene=s{shopId}` |
| 店员小程序 | 今日预约、扫码/手动核销、会员查询、到店/爽约/完成 |
| 管理后台 | 项目与排班、预约与会员、卡模板、流水退款、报表、店铺与微信支付、平台开店 |
| API | `auth` `shop` `booking` `member` `card` `payment` `verify` `upload` `notify` `platform` 等；上传目录 `uploads/` |

## 界面预览

本地 `pnpm db:seed` 后截取的真实界面（顾客端为 H5，与微信小程序同源 UI）。

**顾客端**

<table>
<tr>
<td align="center" width="25%"><img src="./docs/assets/screenshots/merchant-h5-home.png" width="168" alt="店铺首页" /><br /><sub>首页</sub></td>
<td align="center" width="25%"><img src="./docs/assets/screenshots/merchant-h5-slots.png" width="168" alt="选择时段" /><br /><sub>选时段</sub></td>
<td align="center" width="25%"><img src="./docs/assets/screenshots/merchant-h5-bookings.png" width="168" alt="我的预约" /><br /><sub>我的预约</sub></td>
<td align="center" width="25%"><img src="./docs/assets/screenshots/merchant-h5-cards.png" width="168" alt="我的会员卡" /><br /><sub>会员卡</sub></td>
</tr>
</table>

**管理后台**

<table>
<tr>
<td align="center" width="50%"><img src="./docs/assets/screenshots/merchant-admin-dashboard.png" width="400" alt="仪表盘" /><br /><sub>仪表盘</sub></td>
<td align="center" width="50%"><img src="./docs/assets/screenshots/merchant-admin-booking-list.png" width="400" alt="预约管理" /><br /><sub>预约管理</sub></td>
</tr>
<tr>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-members.png" width="400" alt="会员管理" /><br /><sub>会员管理</sub></td>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-services.png" width="400" alt="项目管理" /><br /><sub>项目管理</sub></td>
</tr>
<tr>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-staff.png" width="400" alt="员工管理" /><br /><sub>员工管理</sub></td>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-schedules.png" width="400" alt="排班管理" /><br /><sub>排班管理</sub></td>
</tr>
<tr>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-card-templates.png" width="400" alt="卡种管理" /><br /><sub>卡种管理</sub></td>
<td align="center"><img src="./docs/assets/screenshots/merchant-admin-settings.png" width="400" alt="店铺设置" /><br /><sub>店铺设置</sub></td>
</tr>
</table>

## 配置

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` / `REDIS_URL` | 数据库与缓存 |
| `JWT_SECRET` | 鉴权 |
| `API_BASE_URL` | 对外 API（**生产须 HTTPS**，支付回调依赖） |
| `WX_*` | 小程序与微信支付 |
| `ADMIN_ORIGIN` | 后台 CORS |

## 文档

| 文档 | 说明 |
| --- | --- |
| [docs/DATA.md](./docs/DATA.md) · [EN](./docs/DATA.en.md) | 表结构、迁移、Redis、定时任务 |
| [docs/DEPLOY.md](./docs/DEPLOY.md) · [EN](./docs/DEPLOY.en.md) | 生产部署 |
| `apps/api/prisma/schema.prisma` | 表结构定义 |

双远端推送：`git push origin master`（GitHub + Gitee）。
