-- Migration: Add notification system tables
-- Purpose: Support in-app notifications and preferences

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `type` ENUM('ticket_assigned','ticket_status_change','new_message','mention','chat_message','escalation','system') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `related_entity_type` VARCHAR(50) COMMENT 'ticket, chat, user, etc.',
  `related_entity_id` INT UNSIGNED COMMENT 'ID of related entity',
  `action_url` VARCHAR(500) COMMENT 'URL to navigate when clicked',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_unread` (`user_id`, `is_read`),
  INDEX `idx_created` (`created_at`),
  INDEX `idx_entity` (`related_entity_type`, `related_entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `email_ticket_assigned` TINYINT(1) NOT NULL DEFAULT 1,
  `email_new_message` TINYINT(1) NOT NULL DEFAULT 1,
  `email_status_change` TINYINT(1) NOT NULL DEFAULT 1,
  `email_mention` TINYINT(1) NOT NULL DEFAULT 1,
  `email_chat_message` TINYINT(1) NOT NULL DEFAULT 0,
  `email_escalation` TINYINT(1) NOT NULL DEFAULT 1,
  `push_ticket_assigned` TINYINT(1) NOT NULL DEFAULT 1,
  `push_new_message` TINYINT(1) NOT NULL DEFAULT 1,
  `push_status_change` TINYINT(1) NOT NULL DEFAULT 1,
  `push_mention` TINYINT(1) NOT NULL DEFAULT 1,
  `push_chat_message` TINYINT(1) NOT NULL DEFAULT 1,
  `push_escalation` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create initial notification preferences for existing users
INSERT INTO `notification_preferences` (`user_id`)
SELECT `id` FROM `users`
ON DUPLICATE KEY UPDATE `notification_preferences`.`id` = `notification_preferences`.`id`;
