CREATE TABLE `browserPushSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpointHash` varchar(64) NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `browserPushSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscription_endpoint_unique` UNIQUE(`endpointHash`)
);
--> statement-breakpoint
ALTER TABLE `browserPushSubscriptions` ADD CONSTRAINT `browserPushSubscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `push_subscription_user_idx` ON `browserPushSubscriptions` (`userId`,`createdAt`);