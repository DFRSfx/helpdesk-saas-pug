-- Migration: Add user sessions table for Socket.io tracking
-- Purpose: Track online/offline status and user sessions

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `socket_id` VARCHAR(100) NOT NULL,
  `connected_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_online` TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_socket` (`user_id`, `socket_id`),
  INDEX `idx_online_status` (`is_online`, `last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clean up old sessions on startup
DELETE FROM `user_sessions` WHERE `is_online` = 1 AND `last_seen` < DATE_SUB(NOW(), INTERVAL 1 DAY);
