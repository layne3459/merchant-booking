ALTER TABLE `services`
  ADD COLUMN `deposit_ratio` TINYINT NULL COMMENT '订金比例0-100，NULL沿用店铺默认' AFTER `staff_ids`;
