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
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.audit_log: ~2 rows (aproximadamente)
DELETE FROM `audit_log`;
INSERT INTO `audit_log` (`id`, `ticket_id`, `user_id`, `action`, `old_value`, `new_value`, `created_at`, `entity_type`, `entity_id`) VALUES
	(40, NULL, 10, 'Department Updated', 'Name: Billing & Payments, Active: Yes', 'Agents: Assigned', '2026-01-03 06:49:27', 'department', 2),
	(41, NULL, 10, 'Department Updated', 'Name: Billing & Payments, Active: Yes', 'Agents: Assigned', '2026-01-03 06:51:54', 'department', 2);

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

-- A despejar estrutura para tabela zolentra_db.tickets
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned NOT NULL,
  `agent_id` int(10) unsigned DEFAULT NULL,
  `department_id` int(10) unsigned NOT NULL,
  `priority` enum('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  `status` enum('Open','In Progress','Waiting','Escalated','Resolved','Closed') NOT NULL DEFAULT 'Open',
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tickets_customer` (`customer_id`),
  KEY `idx_tickets_agent` (`agent_id`),
  KEY `idx_tickets_department` (`department_id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_priority` (`priority`),
  KEY `idx_tickets_created` (`created_at`),
  KEY `idx_tickets_status_priority` (`status`,`priority`),
  KEY `idx_tickets_agent_status` (`agent_id`,`status`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.tickets: ~5 rows (aproximadamente)
DELETE FROM `tickets`;
INSERT INTO `tickets` (`id`, `customer_id`, `agent_id`, `department_id`, `priority`, `status`, `title`, `description`, `created_at`, `updated_at`) VALUES
	(1, 5, 2, 1, 'High', 'In Progress', 'Cannot login to my account', 'I am unable to login to my account. I keep getting "Invalid credentials" error even though I am sure my password is correct. Please help!', '2025-11-20 00:43:04', '2026-01-02 23:18:06'),
	(2, 6, 2, 1, 'Medium', 'Open', 'Slow loading times', 'The application takes forever to load. Is this a known issue?', '2025-11-20 00:43:04', '2025-12-18 15:50:28'),
	(3, 7, 3, 2, 'Critical', 'Escalated', 'Payment failed but amount deducted', 'My payment of $99 was deducted from my account but the order shows as failed. I need immediate help!', '2025-11-20 00:43:04', '2025-11-20 00:43:04'),
	(4, 5, NULL, 3, 'Low', 'Resolved', 'Product inquiry', 'I would like to know more about the enterprise plan features.', '2025-11-20 00:43:04', '2025-11-20 16:24:05'),
	(5, 6, NULL, 1, 'Medium', 'Open', 'Feature request: Dark mode', 'It would be great to have a dark mode option for the application.', '2025-11-20 00:43:04', '2026-01-03 03:50:18');

-- A despejar estrutura para tabela zolentra_db.ticket_attachments
CREATE TABLE IF NOT EXISTS `ticket_attachments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `uploaded_by` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_attachments_ticket` (`ticket_id`),
  KEY `idx_attachments_uploaded_by` (`uploaded_by`),
  CONSTRAINT `ticket_attachments_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.ticket_attachments: ~0 rows (aproximadamente)
DELETE FROM `ticket_attachments`;

-- A despejar estrutura para tabela zolentra_db.ticket_messages
CREATE TABLE IF NOT EXISTS `ticket_messages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `message` text NOT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_messages_ticket` (`ticket_id`),
  KEY `idx_messages_user` (`user_id`),
  KEY `idx_messages_created` (`created_at`),
  CONSTRAINT `ticket_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.ticket_messages: ~9 rows (aproximadamente)
DELETE FROM `ticket_messages`;
INSERT INTO `ticket_messages` (`id`, `ticket_id`, `user_id`, `message`, `is_internal`, `created_at`) VALUES
	(1, 1, 5, 'I have tried resetting my password but still facing the same issue.', 0, '2025-11-20 00:43:04'),
	(2, 1, 2, 'Thank you for reporting this. I am looking into your account now.', 0, '2025-11-20 00:43:04'),
	(3, 1, 2, 'User account was locked due to multiple failed login attempts. Unlocking now.', 1, '2025-11-20 00:43:04'),
	(4, 1, 2, 'I have unlocked your account. Please try logging in again and let me know if you still face issues.', 0, '2025-11-20 00:43:04'),
	(5, 2, 2, 'Could you please share what browser you are using and if you are on mobile or desktop?', 0, '2025-11-20 00:43:04'),
	(6, 2, 6, 'I am using Chrome on desktop. Version 120.', 0, '2025-11-20 00:43:04'),
	(7, 3, 7, 'This is urgent! I need a refund or confirmation that my order went through!', 0, '2025-11-20 00:43:04'),
	(8, 3, 3, 'I sincerely apologize for the inconvenience. I am escalating this to our billing team immediately.', 0, '2025-11-20 00:43:04'),
	(9, 3, 3, 'Escalated to billing manager. Transaction ID: TXN-2024-12345', 1, '2025-11-20 00:43:04');

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
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A despejar dados para tabela zolentra_db.users: ~8 rows (aproximadamente)
DELETE FROM `users`;
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`, `department_id`, `created_at`, `updated_at`) VALUES
	(1, 'Admin User', 'admin@zolentra.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'admin', 1, 1, '2025-11-20 00:43:04', '2026-01-03 03:51:29'),
	(2, 'Agent 1', 'agent1@zolentra.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'agent', 1, 1, '2025-11-20 00:43:04', '2026-01-03 06:22:15'),
	(3, 'Agent 2', 'agent2@zolentra.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'agent', 1, 2, '2025-11-20 00:43:04', '2026-01-03 06:51:54'),
	(5, 'Agent 3', 'agent3@zolentra.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'agent', 1, 3, '2025-11-20 00:43:04', '2026-01-03 06:22:17'),
	(6, 'Costumer 1', 'costumer1@gmail.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'customer', 0, NULL, '2025-11-20 00:43:04', '2026-01-03 06:23:51'),
	(7, 'Costumer 2', 'costumer2@gmail.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'customer', 0, NULL, '2025-11-20 00:43:04', '2026-01-03 06:23:56'),
	(8, 'Costumer 3', 'costumer3@gmail.com', '$2b$10$BPUdDT8I0v1hNT3TSInE9us1mMoDC.X1TSK11gTCQN3hR7AHDpQL6', 'customer', 1, NULL, '2025-11-20 00:43:04', '2026-01-03 06:24:00'),
	(10, 'Conta Teste', 'dariosoares2005@gmail.com', '$2b$10$p2VMq3zFM2Kape4N/dEqGu4jEfOCbCTWjV4ug5b4YyDb0UT0dz6ka', 'admin', 1, NULL, '2026-01-03 05:05:30', '2026-01-03 06:24:04');

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
