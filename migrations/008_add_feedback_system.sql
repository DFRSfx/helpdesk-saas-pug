-- Migration: Add feedback/survey system
-- Purpose: Collect customer satisfaction ratings and feedback

-- Ticket feedback table
CREATE TABLE IF NOT EXISTS `ticket_feedback` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT UNSIGNED NOT NULL UNIQUE,
  `rating` INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  `feedback_text` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  INDEX `idx_rating` (`rating`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add feedback tracking to tickets
ALTER TABLE `tickets` ADD COLUMN `feedback_requested_at` TIMESTAMP NULL AFTER `updated_at`;
ALTER TABLE `tickets` ADD COLUMN `has_feedback` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feedback_requested_at`;

-- Indexes
ALTER TABLE `tickets` ADD INDEX `idx_has_feedback` (`has_feedback`);
