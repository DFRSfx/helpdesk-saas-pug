-- Migration: Add message edit and delete functionality
-- Purpose: Enable message editing and soft deletion with audit trails

-- Add columns to ticket_messages for edit/delete tracking
ALTER TABLE `ticket_messages` ADD COLUMN `is_edited` TINYINT(1) NOT NULL DEFAULT 0 AFTER `message`;
ALTER TABLE `ticket_messages` ADD COLUMN `edited_at` TIMESTAMP NULL AFTER `is_edited`;
ALTER TABLE `ticket_messages` ADD COLUMN `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `edited_at`;
ALTER TABLE `ticket_messages` ADD COLUMN `deleted_at` TIMESTAMP NULL AFTER `is_deleted`;

-- Add indexes for performance
ALTER TABLE `ticket_messages` ADD INDEX `idx_is_edited` (`is_edited`);
ALTER TABLE `ticket_messages` ADD INDEX `idx_is_deleted` (`is_deleted`);
