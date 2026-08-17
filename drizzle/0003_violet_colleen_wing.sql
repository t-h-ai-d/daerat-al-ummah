CREATE TABLE `conversationParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastReadAt` timestamp,
	CONSTRAINT `conversationParticipants_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversation_participant_unique` UNIQUE(`conversationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('direct') NOT NULL DEFAULT 'direct',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `directMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `directMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `conversationParticipants` ADD CONSTRAINT `conversationParticipants_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversationParticipants` ADD CONSTRAINT `conversationParticipants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessages` ADD CONSTRAINT `directMessages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directMessages` ADD CONSTRAINT `directMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `conversation_participant_user_idx` ON `conversationParticipants` (`userId`,`conversationId`);--> statement-breakpoint
CREATE INDEX `messages_conversation_created_idx` ON `directMessages` (`conversationId`,`createdAt`);