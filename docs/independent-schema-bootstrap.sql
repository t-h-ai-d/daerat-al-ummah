CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `passwordHash` varchar(255),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `username` varchar(32),
  `avatarUrl` text,
  `bio` text,
  `country` varchar(96),
  `madhhabPreference` varchar(48),
  `accountStatus` enum('active','warned','banned') NOT NULL DEFAULT 'active',
  `profileVisibility` enum('public','friends') NOT NULL DEFAULT 'public',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_openId_unique` (`openId`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_username_unique` (`username`)
);

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `kind` enum('direct') NOT NULL DEFAULT 'direct',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `communities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(120) NOT NULL,
  `slug` varchar(96) NOT NULL,
  `description` text NOT NULL,
  `kind` enum('community','group','subcommunity') NOT NULL DEFAULT 'community',
  `parentId` int,
  `visibility` enum('public','members') NOT NULL DEFAULT 'public',
  `creatorId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `communities_slug_unique` (`slug`),
  KEY `communities_parent_created_idx` (`parentId`,`createdAt`),
  KEY `communities_creator_created_idx` (`creatorId`,`createdAt`),
  KEY `communities_visibility_created_idx` (`visibility`,`createdAt`),
  CONSTRAINT `communities_creatorId_users_id_fk` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `posts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `authorId` int NOT NULL,
  `communityId` int,
  `title` varchar(240),
  `content` text NOT NULL,
  `textStyle` enum('default','serif','emphasis') NOT NULL DEFAULT 'default',
  `imageUrl` text,
  `linkUrl` text,
  `hashtags` varchar(512),
  `visibility` enum('public','friends') NOT NULL DEFAULT 'public',
  `moderationStatus` enum('published','under_review','removed') NOT NULL DEFAULT 'published',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `posts_author_created_idx` (`authorId`,`createdAt`),
  KEY `posts_community_created_idx` (`communityId`,`createdAt`),
  KEY `posts_status_created_idx` (`moderationStatus`,`createdAt`),
  CONSTRAINT `posts_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `posts_communityId_communities_id_fk` FOREIGN KEY (`communityId`) REFERENCES `communities` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `comments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `authorId` int NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `comments_post_created_idx` (`postId`,`createdAt`),
  CONSTRAINT `comments_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `communityMembers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `communityId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('owner','member') NOT NULL DEFAULT 'member',
  `joinedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `community_member_unique` (`communityId`,`userId`),
  KEY `community_member_user_idx` (`userId`,`communityId`),
  CONSTRAINT `communityMembers_communityId_communities_id_fk` FOREIGN KEY (`communityId`) REFERENCES `communities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `communityMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `communityResources` (
  `id` int AUTO_INCREMENT NOT NULL,
  `communityId` int NOT NULL,
  `authorId` int NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` varchar(1000),
  `url` text NOT NULL,
  `kind` enum('link','document','video') NOT NULL DEFAULT 'link',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `community_resources_community_created_idx` (`communityId`,`createdAt`),
  CONSTRAINT `communityResources_communityId_communities_id_fk` FOREIGN KEY (`communityId`) REFERENCES `communities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `communityResources_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `savedCollections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `title` varchar(80) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `saved_collections_user_updated_idx` (`userId`,`updatedAt`),
  CONSTRAINT `savedCollections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `savedCollectionItems` (
  `id` int AUTO_INCREMENT NOT NULL,
  `collectionId` int NOT NULL,
  `postId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saved_collection_item_unique` (`collectionId`,`postId`),
  KEY `saved_collection_items_collection_created_idx` (`collectionId`,`createdAt`),
  CONSTRAINT `savedCollectionItems_collectionId_savedCollections_id_fk` FOREIGN KEY (`collectionId`) REFERENCES `savedCollections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `savedCollectionItems_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `conversationParticipants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `conversationId` int NOT NULL,
  `userId` int NOT NULL,
  `joinedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastReadAt` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conversation_participant_unique` (`conversationId`,`userId`),
  KEY `conversation_participant_user_idx` (`userId`,`conversationId`),
  CONSTRAINT `conversationParticipants_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversationParticipants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `directMessages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `conversationId` int NOT NULL,
  `senderId` int NOT NULL,
  `content` text NOT NULL,
  `attachmentUrl` text,
  `attachmentKind` enum('gif'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `messages_conversation_created_idx` (`conversationId`,`createdAt`),
  CONSTRAINT `directMessages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `directMessages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `follows` (
  `id` int AUTO_INCREMENT NOT NULL,
  `followerId` int NOT NULL,
  `followingId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `follows_pair_unique` (`followerId`,`followingId`),
  KEY `follows_following_idx` (`followingId`),
  CONSTRAINT `follows_followerId_users_id_fk` FOREIGN KEY (`followerId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `follows_followingId_users_id_fk` FOREIGN KEY (`followingId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `friendships` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requesterId` int NOT NULL,
  `recipientId` int NOT NULL,
  `status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `friendships_requester_recipient_unique` (`requesterId`,`recipientId`),
  KEY `friendships_recipient_status_idx` (`recipientId`,`status`),
  KEY `friendships_requester_status_idx` (`requesterId`,`status`),
  CONSTRAINT `friendships_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `friendships_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `likes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `postId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `likes_user_post_unique` (`userId`,`postId`),
  KEY `likes_post_idx` (`postId`),
  CONSTRAINT `likes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `likes_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `postAttachments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int,
  `uploaderId` int NOT NULL,
  `kind` enum('image','gif','video','file','link') NOT NULL,
  `storageKey` varchar(512),
  `url` text NOT NULL,
  `filename` varchar(255),
  `mimeType` varchar(128),
  `sizeBytes` int,
  `scanStatus` enum('pending','clean','blocked') NOT NULL DEFAULT 'clean',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `attachments_post_idx` (`postId`),
  KEY `attachments_uploader_idx` (`uploaderId`,`createdAt`),
  CONSTRAINT `postAttachments_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `postAttachments_uploaderId_users_id_fk` FOREIGN KEY (`uploaderId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `reports` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `reporterId` int NOT NULL,
  `category` enum('scam','lie','brainrot','haram imagery') NOT NULL,
  `details` text,
  `status` enum('open','reviewed','dismissed') NOT NULL DEFAULT 'open',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewedAt` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reports_reporter_post_unique` (`reporterId`,`postId`),
  KEY `reports_status_created_idx` (`status`,`createdAt`),
  CONSTRAINT `reports_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reports_reporterId_users_id_fk` FOREIGN KEY (`reporterId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `reposts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `postId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reposts_user_post_unique` (`userId`,`postId`),
  KEY `reposts_post_idx` (`postId`),
  CONSTRAINT `reposts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reposts_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `moderationActions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `reportId` int,
  `moderatorId` int NOT NULL,
  `targetUserId` int NOT NULL,
  `action` enum('warning','ban','remove_post','dismiss_report') NOT NULL,
  `note` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `moderation_target_user_idx` (`targetUserId`,`createdAt`),
  CONSTRAINT `moderationActions_reportId_reports_id_fk` FOREIGN KEY (`reportId`) REFERENCES `reports` (`id`) ON DELETE SET NULL,
  CONSTRAINT `moderationActions_moderatorId_users_id_fk` FOREIGN KEY (`moderatorId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `moderationActions_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `recipientId` int NOT NULL,
  `actorId` int,
  `postId` int,
  `commentId` int,
  `type` enum('follow','like','comment','repost','mention','moderation') NOT NULL,
  `message` varchar(280) NOT NULL,
  `readAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notifications_recipient_created_idx` (`recipientId`,`createdAt`),
  CONSTRAINT `notifications_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `notifications_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_commentId_comments_id_fk` FOREIGN KEY (`commentId`) REFERENCES `comments` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `aiModerationChecks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `source` enum('rules','ai','fallback') NOT NULL,
  `model` varchar(96),
  `action` enum('published','under_review') NOT NULL,
  `category` enum('none','spam','scam','deception','attention_harm','religious_disrespect','haram_imagery_claim','harassment') NOT NULL,
  `confidence` int NOT NULL,
  `rationale` text NOT NULL,
  `creatorMessage` varchar(500) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aiModerationChecks_postId_unique` (`postId`),
  KEY `ai_moderation_action_created_idx` (`action`,`createdAt`),
  CONSTRAINT `aiModerationChecks_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `browserPushSubscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `endpointHash` varchar(64) NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `userAgent` varchar(512),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_subscription_endpoint_unique` (`endpointHash`),
  KEY `push_subscription_user_idx` (`userId`,`createdAt`),
  CONSTRAINT `browserPushSubscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
