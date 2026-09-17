-- ============================================================
-- 演示店预约数据（shop_id = 10000000001）
-- 用法：在 MySQL 中执行本文件，或运行 pnpm db:seed（推荐）
-- 小程序开发登录 openid: dev_openid_dev_demo_user
-- ============================================================

SET NAMES utf8mb4;

-- 1. 店铺
INSERT INTO `shops` (`id`, `name`, `address`, `phone`, `business_hours`, `status`, `created_at`)
VALUES (
  10000000001,
  '演示美发店',
  '广州市天河区体育西路 100 号',
  '13800138000',
  '{"mon":["09:00","21:00"],"tue":["09:00","21:00"],"wed":["09:00","21:00"],"thu":["09:00","21:00"],"fri":["09:00","21:00"],"sat":["10:00","20:00"],"sun":["10:00","20:00"]}',
  1,
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `address` = VALUES(`address`),
  `phone` = VALUES(`phone`),
  `business_hours` = VALUES(`business_hours`),
  `status` = 1;

-- 2. 后台管理员（密码 admin123，bcrypt）
INSERT INTO `admin_users` (`shop_id`, `username`, `password_hash`, `role`, `status`, `created_at`)
VALUES (
  10000000001,
  'admin',
  '$2b$10$oXi6kT1493UsufzB8D1Hjuphe9YsFvykLfxtlYhu/DsBHsQYxpeE6',
  1,
  1,
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `status` = 1;

-- 3. 技师
INSERT INTO `staff` (`shop_id`, `name`, `phone`, `role`, `status`, `created_at`)
SELECT 10000000001, '阿美', '13800000001', 3, 1, NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `staff` WHERE `shop_id` = 10000000001 AND `phone` = '13800000001'
);

INSERT INTO `staff` (`shop_id`, `name`, `phone`, `role`, `status`, `created_at`)
SELECT 10000000001, '店长', '13800000002', 2, 1, NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `staff` WHERE `shop_id` = 10000000001 AND `phone` = '13800000002'
);

-- 4. 技师排班（周一~周六 09:00-21:00，周日 10:00-20:00）
DELETE FROM `staff_schedules`
WHERE `shop_id` = 10000000001 AND `exception_date` IS NULL;

INSERT INTO `staff_schedules` (`shop_id`, `staff_id`, `day_of_week`, `start_time`, `end_time`, `is_rest`, `created_at`)
SELECT 10000000001, s.id, d.day_of_week, d.start_time, d.end_time, 0, NOW(3)
FROM `staff` s
CROSS JOIN (
  SELECT 1 AS day_of_week, '09:00' AS start_time, '21:00' AS end_time UNION ALL
  SELECT 2, '09:00', '21:00' UNION ALL
  SELECT 3, '09:00', '21:00' UNION ALL
  SELECT 4, '09:00', '21:00' UNION ALL
  SELECT 5, '09:00', '21:00' UNION ALL
  SELECT 6, '09:00', '21:00' UNION ALL
  SELECT 0, '10:00', '20:00'
) d
WHERE s.shop_id = 10000000001 AND s.phone IN ('13800000001', '13800000002');

-- 5. 服务项目
INSERT INTO `services` (`shop_id`, `name`, `price`, `duration`, `status`, `created_at`)
SELECT 10000000001, '洗剪吹', 6800, 60, 1, NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `services` WHERE `shop_id` = 10000000001 AND `name` = '洗剪吹');

INSERT INTO `services` (`shop_id`, `name`, `price`, `duration`, `status`, `created_at`)
SELECT 10000000001, '染发', 29800, 120, 1, NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `services` WHERE `shop_id` = 10000000001 AND `name` = '染发');

INSERT INTO `services` (`shop_id`, `name`, `price`, `duration`, `status`, `created_at`)
SELECT 10000000001, '护理', 12800, 90, 1, NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `services` WHERE `shop_id` = 10000000001 AND `name` = '护理');

-- 6. 会员卡模板
INSERT INTO `card_templates` (`shop_id`, `name`, `type`, `price`, `value`, `valid_days`, `status`, `created_at`)
SELECT 10000000001, '储值卡 500', 1, 50000, 50000, 365, 1, NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `card_templates` WHERE `shop_id` = 10000000001 AND `name` = '储值卡 500');

INSERT INTO `card_templates` (`shop_id`, `name`, `type`, `price`, `value`, `valid_days`, `status`, `created_at`)
SELECT 10000000001, '洗剪吹 10 次卡', 2, 58000, 10, 180, 1, NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `card_templates` WHERE `shop_id` = 10000000001 AND `name` = '洗剪吹 10 次卡');

INSERT INTO `card_templates` (`shop_id`, `name`, `type`, `price`, `value`, `valid_days`, `status`, `created_at`)
SELECT 10000000001, '月卡无限洗', 3, 19900, 0, 30, 1, NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `card_templates` WHERE `shop_id` = 10000000001 AND `name` = '月卡无限洗');

-- 7. 演示会员
INSERT INTO `members` (`shop_id`, `openid`, `nickname`, `phone`, `status`, `created_at`)
SELECT 10000000001, 'seed_demo_member', '演示顾客', '13900000001', 1, NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `members` WHERE `shop_id` = 10000000001 AND `openid` = 'seed_demo_member'
);

-- 8. 演示预约（占用部分时段，其余仍可预约）
DELETE FROM `bookings` WHERE `shop_id` = 10000000001 AND `remark` = 'SEED_DEMO';

INSERT INTO `bookings` (
  `shop_id`, `member_id`, `service_id`, `staff_id`,
  `book_date`, `time_slot`, `status`, `deposit_amount`, `remark`, `created_at`
)
SELECT
  10000000001,
  m.id,
  svc.id,
  st.id,
  CURDATE(),
  '10:00',
  1,
  0,
  'SEED_DEMO',
  NOW(3)
FROM `members` m
JOIN `services` svc ON svc.shop_id = 10000000001 AND svc.name = '洗剪吹'
JOIN `staff` st ON st.shop_id = 10000000001 AND st.phone = '13800000001'
WHERE m.shop_id = 10000000001 AND m.openid = 'seed_demo_member';

INSERT INTO `bookings` (
  `shop_id`, `member_id`, `service_id`, `staff_id`,
  `book_date`, `time_slot`, `status`, `deposit_amount`, `remark`, `created_at`
)
SELECT
  10000000001,
  m.id,
  svc.id,
  st.id,
  CURDATE(),
  '11:00',
  1,
  0,
  'SEED_DEMO',
  NOW(3)
FROM `members` m
JOIN `services` svc ON svc.shop_id = 10000000001 AND svc.name = '洗剪吹'
JOIN `staff` st ON st.shop_id = 10000000001 AND st.phone = '13800000001'
WHERE m.shop_id = 10000000001 AND m.openid = 'seed_demo_member';

INSERT INTO `bookings` (
  `shop_id`, `member_id`, `service_id`, `staff_id`,
  `book_date`, `time_slot`, `status`, `deposit_amount`, `remark`, `created_at`
)
SELECT
  10000000001,
  m.id,
  svc.id,
  st.id,
  DATE_ADD(CURDATE(), INTERVAL 1 DAY),
  '14:00',
  1,
  0,
  'SEED_DEMO',
  NOW(3)
FROM `members` m
JOIN `services` svc ON svc.shop_id = 10000000001 AND svc.name = '洗剪吹'
JOIN `staff` st ON st.shop_id = 10000000001 AND st.phone = '13800000001'
WHERE m.shop_id = 10000000001 AND m.openid = 'seed_demo_member';

INSERT INTO `bookings` (
  `shop_id`, `member_id`, `service_id`, `staff_id`,
  `book_date`, `time_slot`, `status`, `deposit_amount`, `remark`, `created_at`
)
SELECT
  10000000001,
  m.id,
  svc.id,
  st.id,
  DATE_ADD(CURDATE(), INTERVAL 2 DAY),
  '15:00',
  1,
  0,
  'SEED_DEMO',
  NOW(3)
FROM `members` m
JOIN `services` svc ON svc.shop_id = 10000000001 AND svc.name = '洗剪吹'
JOIN `staff` st ON st.shop_id = 10000000001 AND st.phone = '13800000001'
WHERE m.shop_id = 10000000001 AND m.openid = 'seed_demo_member';
