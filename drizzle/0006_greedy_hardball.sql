CREATE TABLE `communities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(96) NOT NULL,
	`description` text NOT NULL,
	`kind` enum('community','group','subcommunity') NOT NULL DEFAULT 'community',
	`parentId` int,
	`visibility` enum('public','members') NOT NULL DEFAULT 'public',
	`creatorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communities_id` PRIMARY KEY(`id`),
	CONSTRAINT `communities_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `communityMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`communityId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communityMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_member_unique` UNIQUE(`communityId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `postAttachments` MODIFY COLUMN `kind` enum('image','gif','video','file','link') NOT NULL;--> statement-breakpoint
ALTER TABLE `directMessages` ADD `attachmentUrl` text;--> statement-breakpoint
ALTER TABLE `directMessages` ADD `attachmentKind` enum('gif');--> statement-breakpoint
ALTER TABLE `posts` ADD `communityId` int;--> statement-breakpoint
ALTER TABLE `communities` ADD CONSTRAINT `communities_creatorId_users_id_fk` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communityMembers` ADD CONSTRAINT `communityMembers_communityId_communities_id_fk` FOREIGN KEY (`communityId`) REFERENCES `communities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communityMembers` ADD CONSTRAINT `communityMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `communities_parent_created_idx` ON `communities` (`parentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `communities_creator_created_idx` ON `communities` (`creatorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `communities_visibility_created_idx` ON `communities` (`visibility`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_member_user_idx` ON `communityMembers` (`userId`,`communityId`);--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_communityId_communities_id_fk` FOREIGN KEY (`communityId`) REFERENCES `communities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `posts_community_created_idx` ON `posts` (`communityId`,`createdAt`);