UPDATE `services` SET `deposit_ratio` = 20 WHERE `deposit_ratio` IS NULL;

ALTER TABLE `services`
  MODIFY COLUMN `deposit_ratio` TINYINT NOT NULL DEFAULT 20 COMMENT '订金比例0-100';
