-- Migration: Add chat system tables
-- Purpose: Support standalone direct messaging between users

-- Chat Conversations Table
CREATE TABLE IF NOT EXISTS `chat_conversations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('direct','group') NOT NULL DEFAULT 'direct',
  `name` VARCHAR(255) COMMENT 'Group chat name',
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_message_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_updated` (`updated_at`),
  INDEX `idx_last_message` (`last_message_at`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Participants Table
CREATE TABLE IF NOT EXISTS `chat_participants` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_read_at` TIMESTAMP NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_participant` (`conversation_id`, `user_id`),
  INDEX `idx_user_conversations` (`user_id`, `is_active`),
  INDEX `idx_unread` (`user_id`, `last_read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` INT UNSIGNED NOT NULL,
  `sender_id` INT UNSIGNED NOT NULL,
  `message` TEXT NOT NULL,
  `is_edited` TINYINT(1) NOT NULL DEFAULT 0,
  `edited_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_conversation_created` (`conversation_id`, `created_at`),
  INDEX `idx_sender` (`sender_id`),
  FULLTEXT KEY `idx_message_search` (`message`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Typing Indicators Table (optional, for temporary tracking)
CREATE TABLE IF NOT EXISTS `chat_typing_indicators` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_typing` (`conversation_id`, `user_id`),
  INDEX `idx_conversation` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for performance
ALTER TABLE `chat_conversations` ADD INDEX `idx_created_by` (`created_by`);
ALTER TABLE `chat_messages` ADD INDEX `idx_created` (`created_at`);
ALTER TABLE `chat_participants` ADD INDEX `idx_conversation` (`conversation_id`);
