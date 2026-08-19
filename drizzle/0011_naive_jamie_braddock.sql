ALTER TABLE `conversations` MODIFY COLUMN `kind` enum('direct','group') NOT NULL DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE `conversations` ADD `name` varchar(120);