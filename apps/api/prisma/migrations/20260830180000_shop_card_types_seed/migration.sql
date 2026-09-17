UPDATE `shops`
SET `card_types` = JSON_ARRAY(
  JSON_OBJECT('id', 1, 'name', '储值卡', 'deductMode', 'balance', 'theme', 'balance', 'enabled', true),
  JSON_OBJECT('id', 2, 'name', '次卡', 'deductMode', 'times', 'theme', 'times', 'enabled', true),
  JSON_OBJECT('id', 3, 'name', '周期卡', 'deductMode', 'period', 'theme', 'period', 'enabled', true),
  JSON_OBJECT('id', 4, 'name', '疗程卡', 'deductMode', 'times', 'theme', 'times', 'enabled', true),
  JSON_OBJECT('id', 5, 'name', '体验卡', 'deductMode', 'times', 'theme', 'times', 'enabled', true),
  JSON_OBJECT('id', 6, 'name', '套餐储值卡', 'deductMode', 'balance', 'theme', 'balance', 'enabled', true)
)
WHERE `card_types` IS NULL;

UPDATE `card_templates` SET `type` = 4 WHERE `name` = '洗剪吹 10 次卡' AND `type` = 2;
UPDATE `card_templates` SET `type` = 5 WHERE `name` LIKE '%体验%' AND `type` = 2;
