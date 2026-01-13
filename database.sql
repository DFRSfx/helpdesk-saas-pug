-- --------------------------------------------------------
-- Anfitrião:                    127.0.0.1
-- Versão do servidor:           10.4.32-MariaDB - mariadb.org binary distribution
-- SO do servidor:               Win64
-- HeidiSQL Versão:              12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- A despejar estrutura da base de dados para zolentra_db
CREATE DATABASE IF NOT EXISTS `zolentra_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `zolentra_db`;

-- A despejar estrutura para tabela zolentra_db.audit_log
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned DEFAULT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `entity_type` varchar(50) DEFAULT NULL COMMENT 'Type of entity (ticket, user, department, etc)',
  `entity_id` int(10) unsigned DEFAULT NULL COMMENT 'ID of the entity being modified',
  PRIMARY KEY (`id`),
  KEY `idx_audit_ticket` (`ticket_id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `audit_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.audit_log: ~11 rows (aproximadamente)
DELETE FROM `audit_log`;
INSERT INTO `audit_log` (`id`, `ticket_id`, `user_id`, `action`, `old_value`, `new_value`, `created_at`, `entity_type`, `entity_id`) VALUES
	(51, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:20:38', NULL, NULL),
	(52, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:25:13', NULL, NULL),
	(53, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:29:48', NULL, NULL),
	(54, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:33:43', NULL, NULL),
	(55, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:35:02', NULL, NULL),
	(56, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:36:03', NULL, NULL),
	(57, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:39:53', NULL, NULL),
	(58, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:43:03', NULL, NULL),
	(59, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 17:48:47', NULL, NULL),
	(60, NULL, 1, 'login', NULL, 'Logged in from ::1', '2026-01-13 18:12:42', NULL, NULL),
	(61, NULL, 1, 'logout', NULL, 'Logged out from ::1', '2026-01-13 18:20:26', NULL, NULL);

-- A despejar estrutura para tabela zolentra_db.chat_conversations
CREATE TABLE IF NOT EXISTS `chat_conversations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` enum('direct','group') NOT NULL DEFAULT 'direct',
  `ticket_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL COMMENT 'Group chat name',
  `created_by` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_message_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_updated` (`updated_at`),
  KEY `idx_last_message` (`last_message_at`),
  KEY `idx_type` (`type`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_ticket_id` (`ticket_id`),
  CONSTRAINT `chat_conversations_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_conversations_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.chat_conversations: ~0 rows (aproximadamente)
DELETE FROM `chat_conversations`;

-- A despejar estrutura para tabela zolentra_db.chat_messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` int(10) unsigned NOT NULL,
  `sender_id` int(10) unsigned NOT NULL,
  `message` text NOT NULL,
  `is_edited` tinyint(1) NOT NULL DEFAULT 0,
  `edited_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_conversation_created` (`conversation_id`,`created_at`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_created` (`created_at`),
  FULLTEXT KEY `idx_message_search` (`message`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.chat_messages: ~0 rows (aproximadamente)
DELETE FROM `chat_messages`;

-- A despejar estrutura para tabela zolentra_db.chat_participants
CREATE TABLE IF NOT EXISTS `chat_participants` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_read_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_participant` (`conversation_id`,`user_id`),
  KEY `idx_user_conversations` (`user_id`,`is_active`),
  KEY `idx_unread` (`user_id`,`last_read_at`),
  KEY `idx_conversation` (`conversation_id`),
  CONSTRAINT `chat_participants_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.chat_participants: ~0 rows (aproximadamente)
DELETE FROM `chat_participants`;


-- A despejar estrutura para tabela zolentra_db.departments
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_departments_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.departments: ~4 rows (aproximadamente)
DELETE FROM `departments`;
INSERT INTO `departments` (`id`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'Technical Support', NULL, 1, '2025-11-20 00:43:04', '2025-11-20 00:43:04'),
	(2, 'Billing & Payments', NULL, 1, '2025-11-20 00:43:04', '2026-01-03 06:51:54'),
	(3, 'Sales & Pre-Sales', NULL, 1, '2025-11-20 00:43:04', '2025-11-20 00:43:04'),
	(4, 'General Inquiries', NULL, 1, '2025-11-20 00:43:04', '2025-11-20 00:43:04');

-- A despejar estrutura para tabela zolentra_db.notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `type` enum('ticket_assigned','ticket_status_change','new_message','mention','chat_message','escalation','system') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `related_entity_type` varchar(50) DEFAULT NULL COMMENT 'ticket, chat, user, etc.',
  `related_entity_id` int(10) unsigned DEFAULT NULL COMMENT 'ID of related entity',
  `action_url` varchar(500) DEFAULT NULL COMMENT 'URL to navigate when clicked',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_unread` (`user_id`,`is_read`),
  KEY `idx_created` (`created_at`),
  KEY `idx_entity` (`related_entity_type`,`related_entity_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.notifications: ~0 rows (aproximadamente)
DELETE FROM `notifications`;

-- A despejar estrutura para tabela zolentra_db.notification_preferences
CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `email_ticket_assigned` tinyint(1) NOT NULL DEFAULT 1,
  `email_new_message` tinyint(1) NOT NULL DEFAULT 1,
  `email_status_change` tinyint(1) NOT NULL DEFAULT 1,
  `email_mention` tinyint(1) NOT NULL DEFAULT 1,
  `email_chat_message` tinyint(1) NOT NULL DEFAULT 0,
  `email_escalation` tinyint(1) NOT NULL DEFAULT 1,
  `push_ticket_assigned` tinyint(1) NOT NULL DEFAULT 1,
  `push_new_message` tinyint(1) NOT NULL DEFAULT 1,
  `push_status_change` tinyint(1) NOT NULL DEFAULT 1,
  `push_mention` tinyint(1) NOT NULL DEFAULT 1,
  `push_chat_message` tinyint(1) NOT NULL DEFAULT 1,
  `push_escalation` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.notification_preferences: ~7 rows (aproximadamente)
DELETE FROM `notification_preferences`;
INSERT INTO `notification_preferences` (`id`, `user_id`, `email_ticket_assigned`, `email_new_message`, `email_status_change`, `email_mention`, `email_chat_message`, `email_escalation`, `push_ticket_assigned`, `push_new_message`, `push_status_change`, `push_mention`, `push_chat_message`, `push_escalation`, `created_at`, `updated_at`) VALUES
	(1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, '2026-01-13 13:55:58', '2026-01-13 13:55:58'),
	(3, 2, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, '2026-01-13 13:55:58', '2026-01-13 13:55:58'),
	(4, 3, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, '2026-01-13 13:55:58', '2026-01-13 13:55:58'),
	(5, 5, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, '2026-01-13 13:55:58', '2026-01-13 13:55:58'),
	(6, 6, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, '2026-01-13 13:55:58', '2026-01-13 13:55:58'),
	(7, 7, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, '2026-01-13 13:55:58', '2026-01-13 13:55:58'),
	(8, 8, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, '2026-01-13 13:55:58', '2026-01-13 13:55:58');

-- A despejar estrutura para tabela zolentra_db.sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.sessions: ~1 rows (aproximadamente)
DELETE FROM `sessions`;
INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
	('VpkzGW9Nm0mdfKvI2FDRDc79R4Yo6I39', 1768414950, '{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-14T18:20:27.094Z","secure":false,"httpOnly":true,"path":"/"},"flash":{}}');

-- A despejar estrutura para tabela zolentra_db.sla_policies
CREATE TABLE IF NOT EXISTS `sla_policies` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `priority` enum('Low','Medium','High','Critical') NOT NULL,
  `response_time_hours` int(11) NOT NULL COMMENT 'Time to first response in hours',
  `resolution_time_hours` int(11) NOT NULL COMMENT 'Time to resolve in hours',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `priority` (`priority`),
  KEY `idx_priority` (`priority`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.sla_policies: ~4 rows (aproximadamente)
DELETE FROM `sla_policies`;
INSERT INTO `sla_policies` (`id`, `name`, `priority`, `response_time_hours`, `resolution_time_hours`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'Low Priority SLA', 'Low', 24, 120, 1, '2026-01-13 13:56:51', '2026-01-13 13:56:51'),
	(2, 'Medium Priority SLA', 'Medium', 8, 48, 1, '2026-01-13 13:56:51', '2026-01-13 13:56:51'),
	(3, 'High Priority SLA', 'High', 2, 24, 1, '2026-01-13 13:56:51', '2026-01-13 13:56:51'),
	(4, 'Critical Priority SLA', 'Critical', 1, 8, 1, '2026-01-13 13:56:51', '2026-01-13 13:56:51');

-- A despejar estrutura para tabela zolentra_db.tickets
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned NOT NULL,
  `agent_id` int(10) unsigned DEFAULT NULL,
  `department_id` int(10) unsigned NOT NULL,
  `priority` enum('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  `sla_policy_id` int(10) unsigned DEFAULT NULL,
  `sla_response_due` timestamp NULL DEFAULT NULL,
  `sla_resolution_due` timestamp NULL DEFAULT NULL,
  `sla_first_response_at` timestamp NULL DEFAULT NULL,
  `sla_response_breached` tinyint(1) NOT NULL DEFAULT 0,
  `sla_resolution_breached` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('Open','In Progress','Waiting','Escalated','Resolved','Closed') NOT NULL DEFAULT 'Open',
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `feedback_requested_at` timestamp NULL DEFAULT NULL,
  `has_feedback` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_tickets_customer` (`customer_id`),
  KEY `idx_tickets_agent` (`agent_id`),
  KEY `idx_tickets_department` (`department_id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_priority` (`priority`),
  KEY `idx_tickets_created` (`created_at`),
  KEY `idx_tickets_status_priority` (`status`,`priority`),
  KEY `idx_tickets_agent_status` (`agent_id`,`status`),
  KEY `fk_ticket_sla_policy` (`sla_policy_id`),
  KEY `idx_sla_response_due` (`sla_response_due`),
  KEY `idx_sla_resolution_due` (`sla_resolution_due`),
  KEY `idx_sla_response_breached` (`sla_response_breached`),
  KEY `idx_sla_resolution_breached` (`sla_resolution_breached`),
  KEY `idx_has_feedback` (`has_feedback`),
  KEY `idx_agent_status` (`agent_id`,`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ticket_sla_policy` FOREIGN KEY (`sla_policy_id`) REFERENCES `sla_policies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.tickets: ~0 rows (aproximadamente)
DELETE FROM `tickets`;

-- A despejar estrutura para tabela zolentra_db.ticket_attachments
CREATE TABLE IF NOT EXISTS `ticket_attachments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `original_name` varchar(255),
  `file_size` int(10) unsigned,
  `uploaded_by` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_attachments_ticket` (`ticket_id`),
  KEY `idx_attachments_uploaded_by` (`uploaded_by`),
  CONSTRAINT `ticket_attachments_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.ticket_attachments: ~0 rows (aproximadamente)
DELETE FROM `ticket_attachments`;

-- A despejar estrutura para tabela zolentra_db.ticket_feedback
CREATE TABLE IF NOT EXISTS `ticket_feedback` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `feedback_text` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_id` (`ticket_id`),
  KEY `idx_rating` (`rating`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `ticket_feedback_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.ticket_feedback: ~0 rows (aproximadamente)
DELETE FROM `ticket_feedback`;

-- A despejar estrutura para tabela zolentra_db.ticket_messages
CREATE TABLE IF NOT EXISTS `ticket_messages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `message` text NOT NULL,
  `is_edited` tinyint(1) NOT NULL DEFAULT 0,
  `edited_at` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_messages_ticket` (`ticket_id`),
  KEY `idx_messages_user` (`user_id`),
  KEY `idx_messages_created` (`created_at`),
  KEY `idx_is_edited` (`is_edited`),
  KEY `idx_is_deleted` (`is_deleted`),
  CONSTRAINT `ticket_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.ticket_messages: ~0 rows (aproximadamente)
DELETE FROM `ticket_messages`;

-- A despejar estrutura para tabela zolentra_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','agent','customer') NOT NULL DEFAULT 'customer',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `department_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `idx_users_department` (`department_id`),
  KEY `idx_users_active` (`is_active`),
  KEY `idx_role_department_active` (`role`,`department_id`,`is_active`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.users: ~7 rows (aproximadamente)
DELETE FROM `users`;
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`, `department_id`, `created_at`, `updated_at`) VALUES
	(1, 'Admin User', 'admin@zolentra.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'admin', 1, 1, '2025-11-20 00:43:04', '2026-01-03 03:51:29'),
	(2, 'Agent 1', 'agent1@zolentra.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'agent', 1, 1, '2025-11-20 00:43:04', '2026-01-03 06:22:15'),
	(3, 'Agent 2', 'agent2@zolentra.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'agent', 1, 2, '2025-11-20 00:43:04', '2026-01-03 06:51:54'),
	(5, 'Agent 3', 'agent3@zolentra.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'agent', 1, 3, '2025-11-20 00:43:04', '2026-01-03 06:22:17'),
	(6, 'Costumer 1', 'costumer1@gmail.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'customer', 0, NULL, '2025-11-20 00:43:04', '2026-01-03 06:23:51'),
	(7, 'Costumer 2', 'costumer2@gmail.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'customer', 0, NULL, '2025-11-20 00:43:04', '2026-01-03 06:23:56'),
	(8, 'Costumer 3', 'costumer3@gmail.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'customer', 1, NULL, '2025-11-20 00:43:04', '2026-01-03 06:24:00');

-- A despejar estrutura para tabela zolentra_db.user_sessions
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `socket_id` varchar(100) NOT NULL,
  `connected_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_seen` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_online` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_user_socket` (`user_id`,`socket_id`),
  KEY `idx_online_status` (`is_online`,`last_seen`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.user_sessions: ~0 rows (aproximadamente)
DELETE FROM `user_sessions`;

-- A despejar estrutura para vista zolentra_db.v_agent_performance
-- A criar tabela temporária para vencer erros de dependências VIEW
CREATE TABLE `v_agent_performance` (
	`agent_id` INT(10) UNSIGNED NOT NULL,
	`agent_name` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`department_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`total_assigned` BIGINT(21) NOT NULL,
	`resolved_tickets` DECIMAL(23,0) NULL,
	`closed_tickets` DECIMAL(23,0) NULL,
	`escalated_tickets` DECIMAL(23,0) NULL,
	`avg_update_time` DECIMAL(24,4) NULL
) ENGINE=MyISAM;

-- A despejar estrutura para vista zolentra_db.v_audit_summary
-- A criar tabela temporária para vencer erros de dependências VIEW
CREATE TABLE `v_audit_summary` (
	`ticket_id` INT(10) UNSIGNED NULL,
	`total_actions` BIGINT(21) NOT NULL,
	`status_changes` DECIMAL(23,0) NULL,
	`assignments` DECIMAL(23,0) NULL,
	`first_action` TIMESTAMP NULL,
	`last_action` TIMESTAMP NULL
) ENGINE=MyISAM;

-- A despejar estrutura para vista zolentra_db.v_tickets_by_department
-- A criar tabela temporária para vencer erros de dependências VIEW
CREATE TABLE `v_tickets_by_department` (
	`department_id` INT(10) UNSIGNED NOT NULL,
	`department_name` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`total_tickets` BIGINT(21) NOT NULL,
	`open_tickets` DECIMAL(23,0) NULL,
	`in_progress_tickets` DECIMAL(23,0) NULL,
	`resolved_tickets` DECIMAL(23,0) NULL,
	`closed_tickets` DECIMAL(23,0) NULL,
	`critical_tickets` DECIMAL(23,0) NULL
) ENGINE=MyISAM;

-- A despejar estrutura para vista zolentra_db.v_ticket_message_activity
-- A criar tabela temporária para vencer erros de dependências VIEW
CREATE TABLE `v_ticket_message_activity` (
	`ticket_id` INT(10) UNSIGNED NOT NULL,
	`title` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`message_count` BIGINT(21) NOT NULL,
	`last_message_at` TIMESTAMP NULL
) ENGINE=MyISAM;

-- A despejar estrutura para vista zolentra_db.v_ticket_overview_daily
-- A criar tabela temporária para vencer erros de dependências VIEW
CREATE TABLE `v_ticket_overview_daily` (
	`date` DATE NULL,
	`total_tickets` BIGINT(21) NOT NULL,
	`open_tickets` DECIMAL(23,0) NULL,
	`in_progress_tickets` DECIMAL(23,0) NULL,
	`waiting_tickets` DECIMAL(23,0) NULL,
	`escalated_tickets` DECIMAL(23,0) NULL,
	`resolved_tickets` DECIMAL(23,0) NULL,
	`closed_tickets` DECIMAL(23,0) NULL,
	`critical_tickets` DECIMAL(23,0) NULL,
	`high_tickets` DECIMAL(23,0) NULL,
	`medium_tickets` DECIMAL(23,0) NULL,
	`low_tickets` DECIMAL(23,0) NULL
) ENGINE=MyISAM;

-- A remover tabela temporária e a criar estrutura VIEW final
DROP TABLE IF EXISTS `v_agent_performance`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_agent_performance` AS SELECT 
    u.id AS agent_id,
    u.name AS agent_name,
    d.name AS department_name,
    COUNT(t.id) AS total_assigned,
    SUM(t.status = 'Resolved') AS resolved_tickets,
    SUM(t.status = 'Closed') AS closed_tickets,
    SUM(t.status = 'Escalated') AS escalated_tickets,
    AVG(TIMESTAMPDIFF(MINUTE, t.created_at, t.updated_at)) AS avg_update_time
FROM users u
LEFT JOIN tickets t ON u.id = t.agent_id
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.role = 'agent'
GROUP BY u.id, u.name, d.name 
;

-- A remover tabela temporária e a criar estrutura VIEW final
DROP TABLE IF EXISTS `v_audit_summary`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_audit_summary` AS SELECT 
    ticket_id,
    COUNT(*) AS total_actions,
    SUM(action LIKE '%status%') AS status_changes,
    SUM(action LIKE '%Assigned%') AS assignments,
    MIN(created_at) AS first_action,
    MAX(created_at) AS last_action
FROM audit_log
GROUP BY ticket_id 
;

-- A remover tabela temporária e a criar estrutura VIEW final
DROP TABLE IF EXISTS `v_tickets_by_department`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_tickets_by_department` AS SELECT 
    d.id AS department_id,
    d.name AS department_name,
    COUNT(t.id) AS total_tickets,
    SUM(t.status = 'Open') AS open_tickets,
    SUM(t.status = 'In Progress') AS in_progress_tickets,
    SUM(t.status = 'Resolved') AS resolved_tickets,
    SUM(t.status = 'Closed') AS closed_tickets,
    SUM(t.priority = 'Critical') AS critical_tickets
FROM departments d
LEFT JOIN tickets t ON t.department_id = d.id
GROUP BY d.id, d.name 
;

-- A remover tabela temporária e a criar estrutura VIEW final
DROP TABLE IF EXISTS `v_ticket_message_activity`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_ticket_message_activity` AS SELECT 
    t.id AS ticket_id,
    t.title,
    COUNT(m.id) AS message_count,
    MAX(m.created_at) AS last_message_at
FROM tickets t
LEFT JOIN ticket_messages m ON m.ticket_id = t.id
GROUP BY t.id, t.title
ORDER BY last_message_at DESC 
;

-- A remover tabela temporária e a criar estrutura VIEW final
DROP TABLE IF EXISTS `v_ticket_overview_daily`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_ticket_overview_daily` AS SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_tickets,
    SUM(status = 'Open') AS open_tickets,
    SUM(status = 'In Progress') AS in_progress_tickets,
    SUM(status = 'Waiting') AS waiting_tickets,
    SUM(status = 'Escalated') AS escalated_tickets,
    SUM(status = 'Resolved') AS resolved_tickets,
    SUM(status = 'Closed') AS closed_tickets,
    SUM(priority = 'Critical') AS critical_tickets,
    SUM(priority = 'High') AS high_tickets,
    SUM(priority = 'Medium') AS medium_tickets,
    SUM(priority = 'Low') AS low_tickets
FROM tickets
GROUP BY DATE(created_at)
ORDER BY date DESC 
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
