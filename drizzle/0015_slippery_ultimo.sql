CREATE TABLE `memberBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerId` int NOT NULL,
	`blockedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberBlocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_blocks_blocker_blocked_unique` UNIQUE(`blockerId`,`blockedId`)
);
--> statement-breakpoint
ALTER TABLE `memberBlocks` ADD CONSTRAINT `memberBlocks_blockerId_users_id_fk` FOREIGN KEY (`blockerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberBlocks` ADD CONSTRAINT `memberBlocks_blockedId_users_id_fk` FOREIGN KEY (`blockedId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `member_blocks_blocker_idx` ON `memberBlocks` (`blockerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `member_blocks_blocked_idx` ON `memberBlocks` (`blockedId`,`createdAt`);