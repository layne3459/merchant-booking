import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_MINI_DISPLAY } from '../src/common/constants/mini-display';
import { SubscriptionStatus } from '../src/common/constants/business';

const prisma = new PrismaClient();

/** 与 mini config devWxLoginCode() 一致 → openid = dev_openid_dev_demo_user */
const DEV_LOGIN_CODE = 'dev_demo_user';
const DEV_OPENID = `dev_openid_${DEV_LOGIN_CODE}`;

const SHOP_ID = 10000000001n;

/** 演示数据不使用外链图片，避免微信开发者工具无法加载 unsplash/alicdn */
const DEMO_COVER = '';

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function toBookDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

async function ensureWeeklySchedules(shopId: bigint, staffId: bigint) {
  await prisma.staffSchedule.deleteMany({
    where: { shopId, staffId, exceptionDate: null },
  });

  for (let day = 1; day <= 6; day++) {
    await prisma.staffSchedule.create({
      data: { shopId, staffId, dayOfWeek: day, startTime: '09:00', endTime: '21:00', isRest: 0 },
    });
  }
  await prisma.staffSchedule.create({
    data: { shopId, staffId, dayOfWeek: 0, startTime: '10:00', endTime: '20:00', isRest: 0 },
  });
}

async function upsertStaff(
  shopId: bigint,
  data: { name: string; phone: string; role: number; avatar?: string },
) {
  let staff = await prisma.staff.findFirst({ where: { shopId, phone: data.phone } });
  if (!staff) {
    staff = await prisma.staff.create({ data: { shopId, ...data, status: 1 } });
  } else {
    staff = await prisma.staff.update({ where: { id: staff.id }, data: { ...data, status: 1 } });
  }
  await ensureWeeklySchedules(shopId, staff.id);
  return staff;
}

async function upsertService(
  shopId: bigint,
  data: {
    name: string;
    price: number;
    duration: number;
    cover: string;
    staffIds: number[];
    description?: string;
    tags?: string[];
    highlights?: Array<{ icon: string; title: string; desc: string }>;
  },
) {
  let service = await prisma.service.findFirst({ where: { shopId, name: data.name } });
  const payload = {
    price: data.price,
    duration: data.duration,
    cover: data.cover,
    staffIds: data.staffIds,
    description: data.description ?? null,
    tags: data.tags ?? null,
    highlights: data.highlights ?? null,
    depositRatio: 20,
    depositType: 1,
    depositFixed: 0,
    status: 1,
  };
  if (!service) {
    service = await prisma.service.create({ data: { shopId, name: data.name, ...payload } });
  } else {
    service = await prisma.service.update({ where: { id: service.id }, data: payload });
  }
  return service;
}

async function upsertCardTemplate(
  shopId: bigint,
  data: {
    name: string;
    type: number;
    price: number;
    value: number;
    validDays: number;
    serviceIds?: number[];
  },
) {
  const existing = await prisma.cardTemplate.findFirst({ where: { shopId, name: data.name } });
  const payload = { ...data, status: 1 };
  if (!existing) {
    return prisma.cardTemplate.create({ data: { shopId, ...payload } });
  }
  return prisma.cardTemplate.update({ where: { id: existing.id }, data: payload });
}

async function seedDemoMemberData(
  shopId: bigint,
  memberId: bigint,
  services: Array<{ id: bigint; name: string; price: number }>,
  staff: Array<{ id: bigint; name: string }>,
) {
  const svc = (name: string) => services.find((s) => s.name === name)!;
  const st = (idx: number) => staff[idx];

  await prisma.booking.deleteMany({ where: { shopId, memberId } });
  await prisma.cardTransaction.deleteMany({ where: { shopId, memberId } });
  await prisma.memberCard.deleteMany({ where: { shopId, memberId } });

  const today = new Date();
  const bookings = [
  // 待服务
    { offset: 1, time: '15:00', service: '染发', staffIdx: 1, status: 1 },
    { offset: 2, time: '10:30', service: '洗剪吹', staffIdx: 0, status: 1 },
    { offset: 4, time: '16:00', service: '护理', staffIdx: 2, status: 1 },
    { offset: 6, time: '11:00', service: '烫发', staffIdx: 1, status: 1 },
    { offset: 0, time: '14:00', service: '精致造型', staffIdx: 3, status: 1 },
  // 已到店
    { offset: 0, time: '09:00', service: '头皮护理', staffIdx: 2, status: 2 },
  // 已完成
    { offset: -3, time: '14:00', service: '洗剪吹', staffIdx: 0, status: 3 },
    { offset: -7, time: '11:00', service: '护理', staffIdx: 2, status: 3 },
    { offset: -14, time: '16:30', service: '染发', staffIdx: 1, status: 3 },
    { offset: -21, time: '10:00', service: '洗剪吹', staffIdx: 0, status: 3 },
  // 已取消
    { offset: -5, time: '13:00', service: '烫发', staffIdx: 1, status: 4 },
  ];

  for (const b of bookings) {
    const s = svc(b.service);
    const staffMember = st(b.staffIdx);
    await prisma.booking.create({
      data: {
        shopId,
        memberId,
        serviceId: s.id,
        staffId: staffMember.id,
        bookDate: toBookDate(addDays(today, b.offset)),
        timeSlot: b.time,
        status: b.status,
        depositAmount: Math.round(Number(s.price) * 0.2),
        remark: 'SEED_DEMO',
      },
    });
  }

  // 占用部分公共时段（其他顾客）
  const otherMember = await prisma.member.upsert({
    where: { shopId_openid: { shopId, openid: 'seed_other_member' } },
    update: { nickname: '张女士', phone: '13900000002', status: 1 },
    create: {
      shopId,
      openid: 'seed_other_member',
      nickname: '张女士',
      phone: '13900000002',
      status: 1,
    },
  });
  await prisma.booking.deleteMany({ where: { shopId, memberId: otherMember.id } });
  const wash = svc('洗剪吹');
  for (const slot of [
    { offset: 0, time: '10:00' },
    { offset: 0, time: '11:00' },
    { offset: 1, time: '14:00' },
  ]) {
    await prisma.booking.create({
      data: {
        shopId,
        memberId: otherMember.id,
        serviceId: wash.id,
        staffId: st(0).id,
        bookDate: toBookDate(addDays(today, slot.offset)),
        timeSlot: slot.time,
        status: 1,
        depositAmount: 0,
        remark: 'SEED_SLOT',
      },
    });
  }

  const templates = await prisma.cardTemplate.findMany({ where: { shopId } });
  const tpl = (name: string) => templates.find((t) => t.name === name)!;

  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 25);

  const balanceCard = await prisma.memberCard.create({
    data: {
      shopId,
      memberId,
      templateId: tpl('储值卡 500').id,
      type: 1,
      balance: 36800,
      remainTimes: 0,
      expireAt: null,
      status: 1,
    },
  });

  const timesCard = await prisma.memberCard.create({
    data: {
      shopId,
      memberId,
      templateId: tpl('洗剪吹 10 次卡').id,
      type: 2,
      balance: 0,
      remainTimes: 7,
      expireAt: new Date(expireAt),
      status: 1,
    },
  });

  const periodCard = await prisma.memberCard.create({
    data: {
      shopId,
      memberId,
      templateId: tpl('月卡无限洗').id,
      type: 3,
      balance: 0,
      remainTimes: 0,
      expireAt: new Date(expireAt),
      status: 1,
    },
  });

  await prisma.cardTransaction.createMany({
    data: [
      {
        shopId,
        cardId: balanceCard.id,
        memberId,
        type: 1,
        amount: 50000,
        beforeValue: 0,
        afterValue: 50000,
        remark: '开卡充值',
      },
      {
        shopId,
        cardId: balanceCard.id,
        memberId,
        type: 2,
        amount: -13200,
        beforeValue: 50000,
        afterValue: 36800,
        remark: '消费扣款',
      },
      {
        shopId,
        cardId: timesCard.id,
        memberId,
        type: 1,
        amount: 10,
        beforeValue: 0,
        afterValue: 10,
        remark: '开卡',
      },
      {
        shopId,
        cardId: timesCard.id,
        memberId,
        type: 2,
        amount: -3,
        beforeValue: 10,
        afterValue: 7,
        remark: '核销 3 次',
      },
    ],
  });

  return { balanceCard, timesCard, periodCard };
}

async function main() {
  const plans = [
    { code: 'trial', name: '体验版', priceMonth: 0, trialDays: 14, maxStaff: 3, allowPay: 1, allowCards: 1 },
    { code: 'basic', name: '基础版', priceMonth: 9900, trialDays: 14, maxStaff: 5, allowPay: 1, allowCards: 1 },
    { code: 'pro', name: '专业版', priceMonth: 19900, trialDays: 14, maxStaff: 20, allowPay: 1, allowCards: 1 },
  ];
  const planRecords = [];
  for (const p of plans) {
    planRecords.push(
      await prisma.plan.upsert({
        where: { code: p.code },
        update: p,
        create: p,
      }),
    );
  }
  const proPlan = planRecords.find((p) => p.code === 'pro')!;

  const platformHash = await bcrypt.hash('platform123', 10);
  await prisma.platformUser.upsert({
    where: { username: 'platform' },
    update: { passwordHash: platformHash, status: 1 },
    create: { username: 'platform', passwordHash: platformHash, status: 1 },
  });

  const shop = await prisma.shop.upsert({
    where: { id: SHOP_ID },
    update: {
      name: '悦己美发沙龙',
      address: '广州市天河区体育西路 100 号 2 楼',
      phone: '13800138000',
      logo: DEMO_COVER,
      businessHours: {
        mon: ['09:00', '21:00'],
        tue: ['09:00', '21:00'],
        wed: ['09:00', '21:00'],
        thu: ['09:00', '21:00'],
        fri: ['09:00', '21:00'],
        sat: ['10:00', '20:00'],
        sun: ['10:00', '20:00'],
      },
      miniConfig: { ...DEFAULT_MINI_DISPLAY, allowManualPhoneBind: true } as unknown as Prisma.InputJsonValue,
      planId: proPlan.id,
      status: 1,
    },
    create: {
      id: SHOP_ID,
      name: '悦己美发沙龙',
      address: '广州市天河区体育西路 100 号 2 楼',
      phone: '13800138000',
      logo: DEMO_COVER,
      businessHours: {
        mon: ['09:00', '21:00'],
        tue: ['09:00', '21:00'],
        wed: ['09:00', '21:00'],
        thu: ['09:00', '21:00'],
        fri: ['09:00', '21:00'],
        sat: ['10:00', '20:00'],
        sun: ['10:00', '20:00'],
      },
      miniConfig: { ...DEFAULT_MINI_DISPLAY, allowManualPhoneBind: true } as unknown as Prisma.InputJsonValue,
      planId: proPlan.id,
      status: 1,
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.adminUser.upsert({
    where: { shopId_username: { shopId: shop.id, username: 'admin' } },
    update: { passwordHash },
    create: { shopId: shop.id, username: 'admin', passwordHash, role: 1, status: 1 },
  });

  const subExpire = new Date();
  subExpire.setFullYear(subExpire.getFullYear() + 1);
  await prisma.subscription.upsert({
    where: { shopId: shop.id },
    update: {
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      expireAt: subExpire,
    },
    create: {
      shopId: shop.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startAt: new Date(),
      expireAt: subExpire,
    },
  });

  const staffRecords = [];
  for (const s of [
    { name: '阿美', phone: '13800000001', role: 3 },
    { name: '店长 Lily', phone: '13800000002', role: 2 },
    { name: '阿强', phone: '13800000003', role: 3 },
    { name: '小丽', phone: '13800000004', role: 3 },
  ]) {
    staffRecords.push(await upsertStaff(shop.id, s));
  }

  const staffIds = staffRecords.map((s) => Number(s.id));

  const serviceDefs = [
    {
      name: '洗剪吹',
      price: 6800,
      duration: 60,
      cover: DEMO_COVER,
      staffIds,
      description: '经典洗剪吹造型，资深发型师为您打造清爽利落的发型。',
      tags: ['专业剪发', '造型建议'],
      highlights: [
        { icon: '✂️', title: '精剪造型', desc: '根据脸型定制发型' },
        { icon: '💆', title: '舒适洗护', desc: '温和洗护，放松头皮' },
        { icon: '✨', title: '快速出街', desc: '约 60 分钟完成' },
        { icon: '👨‍🎨', title: '资深技师', desc: '经验丰富，沟通细致' },
      ],
    },
    {
      name: '染发',
      price: 29800,
      duration: 120,
      cover: DEMO_COVER,
      staffIds: staffIds.slice(0, 3),
      description: '精选进口染膏，专业调色，打造自然持久发色。',
      tags: ['进口染膏', '专业调色'],
      highlights: [
        { icon: '🎨', title: '个性配色', desc: '根据肤色与风格推荐色号' },
        { icon: '🌿', title: '温和配方', desc: '降低损伤，呵护发质' },
        { icon: '⏱️', title: '持久显色', desc: '色彩饱满，不易褪色' },
        { icon: '💇', title: '染后护理', desc: '附赠基础护理建议' },
      ],
    },
    { name: '护理', price: 12800, duration: 90, cover: DEMO_COVER, staffIds },
    { name: '烫发', price: 35800, duration: 150, cover: DEMO_COVER, staffIds: staffIds.slice(0, 3) },
    { name: '头皮护理', price: 16800, duration: 60, cover: DEMO_COVER, staffIds: staffIds.slice(2) },
    { name: '精致造型', price: 9800, duration: 45, cover: DEMO_COVER, staffIds },
    { name: '儿童剪发', price: 5800, duration: 30, cover: DEMO_COVER, staffIds: staffIds.slice(0, 2) },
    { name: '深层修护', price: 19800, duration: 90, cover: DEMO_COVER, staffIds: staffIds.slice(1, 4) },
  ];

  const serviceRecords = [];
  for (const svc of serviceDefs) {
    serviceRecords.push(await upsertService(shop.id, svc));
  }

  const washServiceId = Number(serviceRecords.find((s) => s.name === '洗剪吹')!.id);

  await upsertCardTemplate(shop.id, {
    name: '储值卡 500',
    type: 1,
    price: 50000,
    value: 50000,
    validDays: 365,
  });
  await upsertCardTemplate(shop.id, {
    name: '洗剪吹 10 次卡',
    type: 4,
    price: 58000,
    value: 10,
    validDays: 180,
    serviceIds: [washServiceId],
  });
  await upsertCardTemplate(shop.id, {
    name: '月卡无限洗',
    type: 3,
    price: 19900,
    value: 0,
    validDays: 30,
    serviceIds: [washServiceId],
  });

  const demoMember = await prisma.member.upsert({
    where: { shopId_openid: { shopId: shop.id, openid: DEV_OPENID } },
    update: {
      nickname: '小美',
      phone: '13900000001',
      avatar: DEMO_COVER,
      status: 1,
    },
    create: {
      shopId: shop.id,
      openid: DEV_OPENID,
      nickname: '小美',
      phone: '13900000001',
      avatar: DEMO_COVER,
      status: 1,
    },
  });

  await seedDemoMemberData(
    shop.id,
    demoMember.id,
    serviceRecords.map((s) => ({ id: s.id, name: s.name, price: Number(s.price) })),
    staffRecords.map((s) => ({ id: s.id, name: s.name })),
  );

  console.log('========================================');
  console.log('Seed OK — 演示数据已填充');
  console.log('========================================');
  console.log(`店铺 ID: ${SHOP_ID}  后台: admin / admin123（可不填店铺 ID）`);
  console.log('平台后台: platform / platform123');
  console.log(`技师: ${staffRecords.length} 人  服务: ${serviceRecords.length} 项  会员卡模板: 3 种`);
  console.log(`演示会员: ${demoMember.nickname} (${DEV_OPENID})`);
  console.log('  - 预约 11 条（待服务/已完成/已取消）');
  console.log('  - 会员卡 3 张（储值/次卡/月卡）');
  console.log('  - 部分时段已被占用，仍可预约');
  console.log('');
  console.log('小程序请：我的 → 退出登录 → 重新进入，以加载演示数据');
  console.log(`开发登录 openid: ${DEV_OPENID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
