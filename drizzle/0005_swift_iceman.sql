ALTER TABLE `posts` ADD `title` varchar(240);--> statement-breakpoint
ALTER TABLE `posts` ADD `textStyle` enum('default','serif','emphasis') DEFAULT 'default' NOT NULL;