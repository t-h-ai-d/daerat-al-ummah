CREATE TABLE `aiModerationChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`source` enum('rules','ai','fallback') NOT NULL,
	`model` varchar(96),
	`action` enum('published','under_review') NOT NULL,
	`category` enum('none','spam','scam','deception','attention_harm','religious_disrespect','haram_imagery_claim','harassment') NOT NULL,
	`confidence` int NOT NULL,
	`rationale` text NOT NULL,
	`creatorMessage` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiModerationChecks_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiModerationChecks_postId_unique` UNIQUE(`postId`)
);
--> statement-breakpoint
ALTER TABLE `aiModerationChecks` ADD CONSTRAINT `aiModerationChecks_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_moderation_action_created_idx` ON `aiModerationChecks` (`action`,`createdAt`);