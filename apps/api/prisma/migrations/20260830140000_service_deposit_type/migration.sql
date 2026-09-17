ALTER TABLE `services`
  ADD COLUMN `deposit_type` TINYINT NOT NULL DEFAULT 1 COMMENT '0不收 1比例 2固定' AFTER `deposit_ratio`,
  ADD COLUMN `deposit_fixed` INT NOT NULL DEFAULT 0 COMMENT '固定订金（分）' AFTER `deposit_type`;

UPDATE `services` SET `deposit_type` = 0 WHERE `deposit_ratio` = 0;
