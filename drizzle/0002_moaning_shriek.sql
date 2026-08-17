CREATE TABLE `postAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int,
	`uploaderId` int NOT NULL,
	`kind` enum('image','video','file','link') NOT NULL,
	`storageKey` varchar(512),
	`url` text NOT NULL,
	`filename` varchar(255),
	`mimeType` varchar(128),
	`sizeBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `postAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `postAttachments` ADD CONSTRAINT `postAttachments_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `postAttachments` ADD CONSTRAINT `postAttachments_uploaderId_users_id_fk` FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attachments_post_idx` ON `postAttachments` (`postId`);--> statement-breakpoint
CREATE INDEX `attachments_uploader_idx` ON `postAttachments` (`uploaderId`,`createdAt`);