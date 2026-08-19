CREATE TABLE `savedPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `savedPosts_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_posts_user_post_unique` UNIQUE(`userId`,`postId`)
);
--> statement-breakpoint
ALTER TABLE `savedPosts` ADD CONSTRAINT `savedPosts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savedPosts` ADD CONSTRAINT `savedPosts_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `saved_posts_user_created_idx` ON `savedPosts` (`userId`,`createdAt`);