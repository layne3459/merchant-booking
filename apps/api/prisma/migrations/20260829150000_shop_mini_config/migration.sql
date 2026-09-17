-- Add mini program display config and service description
ALTER TABLE `shops` ADD COLUMN `mini_config` LONGTEXT NULL;
ALTER TABLE `services` ADD COLUMN `description` TEXT NULL;
