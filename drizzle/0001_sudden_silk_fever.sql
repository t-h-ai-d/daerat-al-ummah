CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `follows_pair_unique` UNIQUE(`followerId`,`followingId`)
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `likes_user_post_unique` UNIQUE(`userId`,`postId`)
);
--> statement-breakpoint
CREATE TABLE `moderationActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int,
	`moderatorId` int NOT NULL,
	`targetUserId` int NOT NULL,
	`action` enum('warning','ban','remove_post','dismiss_report') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `moderationActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`actorId` int,
	`postId` int,
	`commentId` int,
	`type` enum('follow','like','comment','repost','mention','moderation') NOT NULL,
	`message` varchar(280) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`imageUrl` text,
	`linkUrl` text,
	`hashtags` varchar(512),
	`visibility` enum('public','followers') NOT NULL DEFAULT 'public',
	`moderationStatus` enum('published','under_review','removed') NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`reporterId` int NOT NULL,
	`category` enum('scam','lie','brainrot','haram imagery') NOT NULL,
	`details` text,
	`status` enum('open','reviewed','dismissed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `reports_reporter_post_unique` UNIQUE(`reporterId`,`postId`)
);
--> statement-breakpoint
CREATE TABLE `reposts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reposts_id` PRIMARY KEY(`id`),
	CONSTRAINT `reposts_user_post_unique` UNIQUE(`userId`,`postId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(96);--> statement-breakpoint
ALTER TABLE `users` ADD `madhhabPreference` varchar(48);--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','warned','banned') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_followerId_users_id_fk` FOREIGN KEY (`followerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_followingId_users_id_fk` FOREIGN KEY (`followingId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `likes` ADD CONSTRAINT `likes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `likes` ADD CONSTRAINT `likes_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moderationActions` ADD CONSTRAINT `moderationActions_reportId_reports_id_fk` FOREIGN KEY (`reportId`) REFERENCES `reports`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moderationActions` ADD CONSTRAINT `moderationActions_moderatorId_users_id_fk` FOREIGN KEY (`moderatorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moderationActions` ADD CONSTRAINT `moderationActions_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_commentId_comments_id_fk` FOREIGN KEY (`commentId`) REFERENCES `comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporterId_users_id_fk` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reposts` ADD CONSTRAINT `reposts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reposts` ADD CONSTRAINT `reposts_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `comments_post_created_idx` ON `comments` (`postId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `follows_following_idx` ON `follows` (`followingId`);--> statement-breakpoint
CREATE INDEX `likes_post_idx` ON `likes` (`postId`);--> statement-breakpoint
CREATE INDEX `moderation_target_user_idx` ON `moderationActions` (`targetUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_created_idx` ON `notifications` (`recipientId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `posts_author_created_idx` ON `posts` (`authorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `posts_status_created_idx` ON `posts` (`moderationStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reports_status_created_idx` ON `reports` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reposts_post_idx` ON `reposts` (`postId`);