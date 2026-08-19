CREATE TABLE `communityResources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`communityId` int NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` varchar(1000),
	`url` text NOT NULL,
	`kind` enum('link','document','video') NOT NULL DEFAULT 'link',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communityResources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `communityResources` ADD CONSTRAINT `communityResources_communityId_communities_id_fk` FOREIGN KEY (`communityId`) REFERENCES `communities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communityResources` ADD CONSTRAINT `communityResources_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_resources_community_created_idx` ON `communityResources` (`communityId`,`createdAt`);