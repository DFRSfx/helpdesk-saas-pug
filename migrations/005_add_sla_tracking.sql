-- Migration: Add SLA tracking system
-- Purpose: Implement Service Level Agreement tracking with response and resolution times

-- SLA Policies Table
CREATE TABLE IF NOT EXISTS `sla_policies` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `priority` ENUM('Low','Medium','High','Critical') NOT NULL UNIQUE,
  `response_time_hours` INT NOT NULL COMMENT 'Time to first response in hours',
  `resolution_time_hours` INT NOT NULL COMMENT 'Time to resolve in hours',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_priority` (`priority`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add SLA tracking columns to tickets
ALTER TABLE `tickets` ADD COLUMN `sla_policy_id` INT UNSIGNED AFTER `priority`;
ALTER TABLE `tickets` ADD COLUMN `sla_response_due` TIMESTAMP NULL AFTER `sla_policy_id`;
ALTER TABLE `tickets` ADD COLUMN `sla_resolution_due` TIMESTAMP NULL AFTER `sla_response_due`;
ALTER TABLE `tickets` ADD COLUMN `sla_first_response_at` TIMESTAMP NULL AFTER `sla_resolution_due`;
ALTER TABLE `tickets` ADD COLUMN `sla_response_breached` TINYINT(1) NOT NULL DEFAULT 0 AFTER `sla_first_response_at`;
ALTER TABLE `tickets` ADD COLUMN `sla_resolution_breached` TINYINT(1) NOT NULL DEFAULT 0 AFTER `sla_response_breached`;

-- Add foreign key constraint
ALTER TABLE `tickets` ADD CONSTRAINT `fk_ticket_sla_policy`
  FOREIGN KEY (`sla_policy_id`) REFERENCES `sla_policies`(`id`) ON DELETE SET NULL;

-- Add indexes for SLA performance
ALTER TABLE `tickets` ADD INDEX `idx_sla_response_due` (`sla_response_due`);
ALTER TABLE `tickets` ADD INDEX `idx_sla_resolution_due` (`sla_resolution_due`);
ALTER TABLE `tickets` ADD INDEX `idx_sla_response_breached` (`sla_response_breached`);
ALTER TABLE `tickets` ADD INDEX `idx_sla_resolution_breached` (`sla_resolution_breached`);

-- Insert default SLA policies based on priority
INSERT INTO `sla_policies` (`name`, `priority`, `response_time_hours`, `resolution_time_hours`, `is_active`) VALUES
  ('Low Priority SLA', 'Low', 24, 120, 1),
  ('Medium Priority SLA', 'Medium', 8, 48, 1),
  ('High Priority SLA', 'High', 2, 24, 1),
  ('Critical Priority SLA', 'Critical', 1, 8, 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;
