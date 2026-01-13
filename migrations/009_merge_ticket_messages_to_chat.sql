-- Migration: Merge ticket messages into chat system
-- Purpose: Remove ticket_messages table and link chat conversations to tickets via ticket_id

-- Add ticket_id column to chat_conversations
ALTER TABLE `chat_conversations` ADD COLUMN `ticket_id` INT UNSIGNED NULL AFTER `type`;
ALTER TABLE `chat_conversations` ADD CONSTRAINT `fk_chat_conversations_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;
ALTER TABLE `chat_conversations` ADD INDEX `idx_ticket_id` (`ticket_id`);

-- Create index for finding ticket's chat conversation
CREATE UNIQUE INDEX `idx_conversation_ticket` ON `chat_conversations` (`ticket_id`) WHERE `ticket_id` IS NOT NULL;

-- Migrate existing ticket_messages to chat_messages
-- First, create conversations for each ticket that has messages
INSERT INTO `chat_conversations` (`type`, `ticket_id`, `created_by`, `created_at`, `updated_at`, `last_message_at`)
SELECT 'ticket', t.id, t.customer_id, t.created_at, t.updated_at,
  (SELECT MAX(created_at) FROM ticket_messages WHERE ticket_id = t.id)
FROM `tickets` t
WHERE t.id IN (SELECT DISTINCT ticket_id FROM ticket_messages)
AND NOT EXISTS (
  SELECT 1 FROM chat_conversations cc WHERE cc.ticket_id = t.id
);

-- Migrate ticket_messages to chat_messages
INSERT INTO `chat_messages` (`conversation_id`, `sender_id`, `message`, `is_edited`, `edited_at`, `created_at`)
SELECT cc.id, tm.user_id, tm.message, tm.is_edited, tm.edited_at, tm.created_at
FROM `ticket_messages` tm
JOIN `chat_conversations` cc ON cc.ticket_id = tm.ticket_id
WHERE tm.is_deleted = 0
ORDER BY tm.created_at;

-- Add participants to migrated conversations (customer and agents who participated)
INSERT INTO `chat_participants` (`conversation_id`, `user_id`, `joined_at`)
SELECT DISTINCT cc.id, tm.user_id, tm.created_at
FROM `ticket_messages` tm
JOIN `chat_conversations` cc ON cc.ticket_id = tm.ticket_id
WHERE tm.is_deleted = 0
ON DUPLICATE KEY UPDATE joined_at = VALUES(joined_at);

-- Add ticket customer and agent as participants if they have messages
INSERT IGNORE INTO `chat_participants` (`conversation_id`, `user_id`, `joined_at`)
SELECT cc.id, t.customer_id, t.created_at
FROM `chat_conversations` cc
JOIN `tickets` t ON t.id = cc.ticket_id
WHERE cc.ticket_id IS NOT NULL;

INSERT IGNORE INTO `chat_participants` (`conversation_id`, `user_id`, `joined_at`)
SELECT cc.id, t.agent_id, t.created_at
FROM `chat_conversations` cc
JOIN `tickets` t ON t.id = cc.ticket_id
WHERE cc.ticket_id IS NOT NULL AND t.agent_id IS NOT NULL;

-- Drop the old ticket_messages table
DROP TABLE IF EXISTS `ticket_messages`;

-- Update views that referenced ticket_messages
DROP VIEW IF EXISTS `v_ticket_message_activity`;
