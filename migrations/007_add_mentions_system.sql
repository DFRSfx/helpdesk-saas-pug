-- Migration: Add mentions system for @mentions in messages
-- Purpose: Track mentions and notify mentioned users

-- Message mentions table
CREATE TABLE IF NOT EXISTS `message_mentions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT UNSIGNED NOT NULL,
  `mentioned_user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`message_id`) REFERENCES `ticket_messages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`mentioned_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_mention` (`message_id`, `mentioned_user_id`),
  INDEX `idx_mentioned_user` (`mentioned_user_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
