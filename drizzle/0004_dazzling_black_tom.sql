CREATE TABLE `friendships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`recipientId` int NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendships_id` PRIMARY KEY(`id`),
	CONSTRAINT `friendships_requester_recipient_unique` UNIQUE(`requesterId`,`recipientId`)
);
--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `visibility` enum('public','friends') NOT NULL DEFAULT 'public';--> statement-breakpoint
ALTER TABLE `users` ADD `profileVisibility` enum('public','friends') DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `friendships_recipient_status_idx` ON `friendships` (`recipientId`,`status`);--> statement-breakpoint
CREATE INDEX `friendships_requester_status_idx` ON `friendships` (`requesterId`,`status`);