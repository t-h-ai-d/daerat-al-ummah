CREATE TABLE `savedCollectionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`postId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `savedCollectionItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_collection_item_unique` UNIQUE(`collectionId`,`postId`)
);
--> statement-breakpoint
CREATE TABLE `savedCollections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savedCollections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `savedCollectionItems` ADD CONSTRAINT `savedCollectionItems_collectionId_savedCollections_id_fk` FOREIGN KEY (`collectionId`) REFERENCES `savedCollections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savedCollectionItems` ADD CONSTRAINT `savedCollectionItems_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savedCollections` ADD CONSTRAINT `savedCollections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `saved_collection_items_collection_created_idx` ON `savedCollectionItems` (`collectionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `saved_collections_user_updated_idx` ON `savedCollections` (`userId`,`updatedAt`);