ALTER TABLE `directMessages` MODIFY COLUMN `attachmentKind` enum('gif','image','video','file');--> statement-breakpoint
ALTER TABLE `directMessages` ADD `attachmentMimeType` varchar(128);