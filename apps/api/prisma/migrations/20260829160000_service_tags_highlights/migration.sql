-- Per-service tags and highlights for mini program detail page
ALTER TABLE `services` ADD COLUMN `tags` JSON NULL;
ALTER TABLE `services` ADD COLUMN `highlights` JSON NULL;
