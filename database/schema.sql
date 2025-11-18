-- =====================================================
-- SupportDesk Pro (Enterprise-ready) — MySQL Schema
-- Local MySQL only. No Supabase / cloud DB.
-- Improvements:
--  - Lookup tables instead of ENUMs
--  - Soft deletes (deleted_at)
--  - Consistent UNSIGNED FKs
--  - Normalized tags (ticket_tags)
--  - Audit old/new as JSON
--  - Safe ticket_number generation using ticket_sequences + GET_LOCK
--  - Added updated_by fields and delivery_method for notifications
--  - Consistent FK ON DELETE behavior (prefer SET NULL; users should be soft-deleted)
-- =====================================================

DROP DATABASE IF EXISTS supportdesk_pro;
CREATE DATABASE supportdesk_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE supportdesk_pro;

-- =====================================================
-- Lookup tables: roles, ticket_status, priorities, notification_methods
-- Easier to extend than ENUMs.
-- =====================================================
CREATE TABLE roles (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ticket_status (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'open', 'in_progress', 'waiting', 'escalated', 'resolved', 'closed'
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ticket_priority (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'low','medium','high','critical'
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_methods (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'email','in_app','sms','push'
    label VARCHAR(100) NOT NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- USERS (soft-delete, consistent unsigned FKs)
-- =====================================================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id TINYINT UNSIGNED NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    avatar VARCHAR(255),
    department_id INT UNSIGNED DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active/inactive/suspended - simple string
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login DATETIME DEFAULT NULL,
    reset_password_token VARCHAR(255) DEFAULT NULL,
    reset_password_expires DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id),
    INDEX idx_users_department (department_id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- DEPARTMENTS
-- =====================================================
CREATE TABLE departments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    email VARCHAR(255),
    manager_user_id INT UNSIGNED DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auto_assign BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_dept_slug (slug),
    INDEX idx_dept_manager (manager_user_id),
    CONSTRAINT fk_dept_manager FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- Ticket sequences table (per year) to avoid race conditions
-- Use stored procedure sp_get_next_ticket_number which uses GET_LOCK
-- =====================================================
CREATE TABLE ticket_sequences (
    year INT UNSIGNED NOT NULL PRIMARY KEY,
    last_number INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- TICKETS
-- Use lookup ids for status & priority.
-- Keep customer_id but require soft-delete for users (deleted_at) so referential integrity is preserved.
-- =====================================================
CREATE TABLE tickets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE, -- generated via procedure
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status_id TINYINT UNSIGNED NOT NULL,
    priority_id TINYINT UNSIGNED NOT NULL,
    customer_user_id INT UNSIGNED DEFAULT NULL,
    assigned_agent_user_id INT UNSIGNED DEFAULT NULL,
    department_id INT UNSIGNED DEFAULT NULL,
    category VARCHAR(150) DEFAULT NULL,
    escalation_level TINYINT UNSIGNED DEFAULT 0,
    escalated_at DATETIME DEFAULT NULL,
    due_at DATETIME DEFAULT NULL,
    first_response_at DATETIME DEFAULT NULL,
    resolved_at DATETIME DEFAULT NULL,
    closed_at DATETIME DEFAULT NULL,
    closed_by_user_id INT UNSIGNED DEFAULT NULL,
    resolution_time_minutes INT DEFAULT NULL COMMENT 'minutes from created_at to resolved_at',
    satisfaction_rating TINYINT UNSIGNED DEFAULT NULL CHECK (satisfaction_rating BETWEEN 1 AND 5),
    satisfaction_comment TEXT,
    created_by_user_id INT UNSIGNED DEFAULT NULL,
    updated_by_user_id INT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_tickets_status (status_id),
    INDEX idx_tickets_priority (priority_id),
    INDEX idx_tickets_customer (customer_user_id),
    INDEX idx_tickets_assigned_agent (assigned_agent_user_id),
    INDEX idx_tickets_department (department_id),
    INDEX idx_tickets_created (created_at),
    CONSTRAINT fk_tickets_status FOREIGN KEY (status_id) REFERENCES ticket_status(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_priority FOREIGN KEY (priority_id) REFERENCES ticket_priority(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_assigned_agent FOREIGN KEY (assigned_agent_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_closed_by FOREIGN KEY (closed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- TAGS (normalized) and ticket_tags join table for indexing/filtering
-- =====================================================
CREATE TABLE tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ticket_tags (
    ticket_id INT UNSIGNED NOT NULL,
    tag_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (ticket_id, tag_id),
    CONSTRAINT fk_ticket_tags_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- TICKET_MESSAGES (threaded, internal flag)
-- =====================================================
CREATE TABLE ticket_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED DEFAULT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_tm_ticket_created (ticket_id, created_at),
    CONSTRAINT fk_tm_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- ATTACHMENTS (linked to ticket and optionally message)
-- =====================================================
CREATE TABLE ticket_attachments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    message_id INT UNSIGNED DEFAULT NULL,
    uploaded_by_user_id INT UNSIGNED DEFAULT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes INT UNSIGNED NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_ta_ticket (ticket_id),
    INDEX idx_ta_message (message_id),
    CONSTRAINT fk_ta_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_ta_message FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE SET NULL,
    CONSTRAINT fk_ta_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- AUDIT LOG (old_value/new_value as JSON for structured diffs)
-- =====================================================
CREATE TABLE audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED DEFAULT NULL,
    user_id INT UNSIGNED DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT UNSIGNED DEFAULT NULL,
    old_value JSON DEFAULT NULL,
    new_value JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_ticket (ticket_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    CONSTRAINT fk_audit_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- NOTIFICATIONS (delivery_method normalized)
-- =====================================================
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    ticket_id INT UNSIGNED DEFAULT NULL,
    method_id TINYINT UNSIGNED NOT NULL, -- FK to notification_methods
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME DEFAULT NULL,
    link VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_ticket (ticket_id),
    INDEX idx_notifications_read (user_id, is_read, created_at DESC),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_method FOREIGN KEY (method_id) REFERENCES notification_methods(id) ON DELETE RESTRICT
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- TICKET_WATCHERS
-- =====================================================
CREATE TABLE ticket_watchers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_watcher (ticket_id, user_id),
    INDEX idx_tw_ticket (ticket_id),
    INDEX idx_tw_user (user_id),
    CONSTRAINT fk_tw_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_tw_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- CANNED RESPONSES
-- =====================================================
CREATE TABLE canned_responses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    shortcut VARCHAR(100) DEFAULT NULL,
    category VARCHAR(150) DEFAULT NULL,
    department_id INT UNSIGNED DEFAULT NULL,
    created_by_user_id INT UNSIGNED DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cr_shortcut (shortcut),
    INDEX idx_cr_department (department_id),
    CONSTRAINT fk_cr_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_cr_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- SLA POLICIES (mapped by priority, dept, category optionally)
-- =====================================================
CREATE TABLE sla_policies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    priority_id TINYINT UNSIGNED DEFAULT NULL,
    department_id INT UNSIGNED DEFAULT NULL,
    category VARCHAR(150) DEFAULT NULL,
    first_response_minutes INT DEFAULT NULL,
    resolution_minutes INT DEFAULT NULL,
    business_hours_only BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sla_priority (priority_id),
    INDEX idx_sla_department (department_id),
    CONSTRAINT fk_sla_priority FOREIGN KEY (priority_id) REFERENCES ticket_priority(id) ON DELETE SET NULL,
    CONSTRAINT fk_sla_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- VIEWS for reporting (kept but updated to use lookup tables)
-- =====================================================
CREATE VIEW v_open_tickets_by_department AS
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    COUNT(t.id) AS open_tickets,
    SUM(CASE WHEN tp.code = 'critical' THEN 1 ELSE 0 END) AS critical_tickets,
    SUM(CASE WHEN tp.code = 'high' THEN 1 ELSE 0 END) AS high_tickets
FROM departments d
LEFT JOIN tickets t ON d.id = t.department_id AND t.deleted_at IS NULL
LEFT JOIN ticket_priority tp ON t.priority_id = tp.id
LEFT JOIN ticket_status ts ON t.status_id = ts.id AND ts.code NOT IN ('resolved','closed')
GROUP BY d.id, d.name;


CREATE VIEW v_agent_performance AS
SELECT 
    u.id AS agent_id,
    CONCAT(u.first_name, ' ', u.last_name) AS agent_name,
    d.name AS department_name,
    COUNT(DISTINCT t.id) AS total_tickets,
    SUM(CASE WHEN ts.code = 'resolved' THEN 1 ELSE 0 END) AS resolved_tickets,
    AVG(t.resolution_time_minutes) AS avg_resolution_minutes,
    AVG(CAST(t.satisfaction_rating AS DECIMAL(2,1))) AS avg_satisfaction
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN tickets t ON u.id = t.assigned_agent_user_id AND t.deleted_at IS NULL
LEFT JOIN ticket_status ts ON t.status_id = ts.id
WHERE u.role_id IS NOT NULL -- roles seeded later
  AND u.deleted_at IS NULL
GROUP BY u.id, u.first_name, u.last_name, d.name;


-- =====================================================
-- STORED PROCEDURE: safe ticket_number generator
-- Uses GET_LOCK to serialize per-year sequence updates
-- Call: SELECT sp_get_next_ticket_number();
-- Returns VARCHAR ticket_number like: TKT-2025-000001
-- =====================================================
DELIMITER $$
CREATE PROCEDURE sp_get_next_ticket_number(OUT out_ticket_number VARCHAR(50))
BEGIN
    DECLARE v_year INT;
    DECLARE v_seq INT;
    DECLARE v_lock_name VARCHAR(64);

    SET v_year = YEAR(CURDATE());
    SET v_lock_name = CONCAT('ticket_seq_', v_year);

    -- Acquire lock for this year (wait up to 5 seconds)
    IF GET_LOCK(v_lock_name, 5) = 1 THEN
        -- Insert row for year if not exists
        INSERT INTO ticket_sequences (year, last_number) VALUES (v_year, 0)
            ON DUPLICATE KEY UPDATE last_number = last_number;

        -- Increment and get value
        UPDATE ticket_sequences
        SET last_number = last_number + 1, updated_at = NOW()
        WHERE year = v_year;

        SELECT last_number INTO v_seq FROM ticket_sequences WHERE year = v_year;

        -- Release lock
        DO RELEASE_LOCK(v_lock_name);

        SET out_ticket_number = CONCAT('TKT-', v_year, '-', LPAD(v_seq, 6, '0'));
    ELSE
        -- If couldn't get lock, fallback to UUID-ish ticket (should be rare)
        SET out_ticket_number = CONCAT('TKT-', v_year, '-', UUID());
    END IF;
END$$
DELIMITER ;

-- =====================================================
-- TRIGGERS: update timestamps/resolution timestamps and audit for key ticket changes
-- Note: audit inserts structured JSON into audit_log.old_value/new_value
-- =====================================================

DELIMITER $$
CREATE TRIGGER trg_tickets_before_update
BEFORE UPDATE ON tickets
FOR EACH ROW
BEGIN
    -- set resolved_at when moving to resolved (if not already set)
    DECLARE v_status_resolved_id TINYINT UNSIGNED;
    DECLARE v_status_closed_id TINYINT UNSIGNED;
    SELECT id INTO v_status_resolved_id FROM ticket_status WHERE code = 'resolved' LIMIT 1;
    SELECT id INTO v_status_closed_id FROM ticket_status WHERE code = 'closed' LIMIT 1;

    IF NEW.status_id = v_status_resolved_id AND OLD.status_id != v_status_resolved_id THEN
        SET NEW.resolved_at = NOW();
    END IF;

    IF NEW.status_id = v_status_closed_id AND OLD.status_id != v_status_closed_id THEN
        SET NEW.closed_at = NOW();
    END IF;

    IF NEW.status_id != OLD.status_id THEN
        SET NEW.updated_at = NOW();
    END IF;

    -- update resolution_time_minutes if resolved_at changed (calculation can be done in app or via SP)
    IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
        SET NEW.resolution_time_minutes = TIMESTAMPDIFF(MINUTE, NEW.created_at, NEW.resolved_at);
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER trg_tickets_after_update
AFTER UPDATE ON tickets
FOR EACH ROW
BEGIN
    -- Insert audit entries for status change, priority change, assignment change
    IF OLD.status_id != NEW.status_id THEN
        INSERT INTO audit_log (ticket_id, user_id, action, entity_type, entity_id, old_value, new_value, description)
        VALUES (
            NEW.id,
            NEW.updated_by_user_id,
            'status_changed',
            'ticket',
            NEW.id,
            JSON_OBJECT('status_id', OLD.status_id),
            JSON_OBJECT('status_id', NEW.status_id),
            CONCAT('Status changed from ', OLD.status_id, ' to ', NEW.status_id)
        );
    END IF;

    IF OLD.priority_id != NEW.priority_id THEN
        INSERT INTO audit_log (ticket_id, user_id, action, entity_type, entity_id, old_value, new_value, description)
        VALUES (
            NEW.id,
            NEW.updated_by_user_id,
            'priority_changed',
            'ticket',
            NEW.id,
            JSON_OBJECT('priority_id', OLD.priority_id),
            JSON_OBJECT('priority_id', NEW.priority_id),
            CONCAT('Priority changed from ', OLD.priority_id, ' to ', NEW.priority_id)
        );
    END IF;

    IF (OLD.assigned_agent_user_id IS NULL AND NEW.assigned_agent_user_id IS NOT NULL)
       OR (OLD.assigned_agent_user_id IS NOT NULL AND OLD.assigned_agent_user_id != NEW.assigned_agent_user_id) THEN
        INSERT INTO audit_log (ticket_id, user_id, action, entity_type, entity_id, old_value, new_value, description)
        VALUES (
            NEW.id,
            NEW.updated_by_user_id,
            'assigned_changed',
            'ticket',
            NEW.id,
            JSON_OBJECT('assigned_agent_user_id', OLD.assigned_agent_user_id),
            JSON_OBJECT('assigned_agent_user_id', NEW.assigned_agent_user_id),
            CONCAT('Assigned agent changed from ', IFNULL(OLD.assigned_agent_user_id,'NULL'), ' to ', IFNULL(NEW.assigned_agent_user_id,'NULL'))
        );
    END IF;
END$$
DELIMITER ;

-- =====================================================
-- INDEXES: composite indexes for common queries (apply after tables created)
-- =====================================================
CREATE INDEX idx_tickets_status_created ON tickets(status_id, created_at DESC);
CREATE INDEX idx_tickets_agent_status ON tickets(assigned_agent_user_id, status_id);
CREATE INDEX idx_tickets_customer_status ON tickets(customer_user_id, status_id);
CREATE INDEX idx_messages_ticket_created ON ticket_messages(ticket_id, created_at);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Full-text search on tickets subject/description and messages (MySQL fulltext works on InnoDB from 5.6+)
ALTER TABLE tickets ADD FULLTEXT INDEX ft_subject_description (subject, description);
ALTER TABLE ticket_messages ADD FULLTEXT INDEX ft_message (message);

-- =====================================================
-- SEED: roles, statuses, priorities, notification methods
-- =====================================================
INSERT INTO roles (name, description) VALUES
('admin','Administrator with full access'),
('agent','Support agent'),
('customer','End customer');

INSERT INTO ticket_status (code, label) VALUES
('open','Open'),
('in_progress','In Progress'),
('waiting','Waiting for Customer'),
('escalated','Escalated'),
('resolved','Resolved'),
('closed','Closed');

INSERT INTO ticket_priority (code, label) VALUES
('low','Low'),
('medium','Medium'),
('high','High'),
('critical','Critical');

INSERT INTO notification_methods (code, label) VALUES
('email','Email'),
('in_app','In-App'),
('sms','SMS'),
('push','Push Notification');

-- =====================================================
-- SAMPLE DATA: departments, users, sequences etc.
-- =====================================================
INSERT INTO departments (name, slug, description, email, is_active, auto_assign) VALUES
('Technical Support','technical-support','Technical issues and troubleshooting','tech@support.com', TRUE, TRUE),
('Billing','billing','Payment and billing inquiries','billing@support.com', TRUE, TRUE),
('Sales','sales','Pre-sales and product inquiries','sales@support.com', TRUE, FALSE),
('General Support','general-support','General questions and assistance','support@support.com', TRUE, TRUE);

-- sample users (password: admin123, agent123, customer123)
INSERT INTO users (role_id, email, password_hash, first_name, last_name, department_id, email_verified)
VALUES
(1, 'admin@supportdesk.com', '$2b$10$wyQmzcB2eia6REK5bdio2.vgx8jJyheh6VtcEuaj5S2Li7.06b2VO', 'Admin','User', NULL, TRUE),
(2, 'agent1@supportdesk.com', '$2b$10$so/94mjoRdmEddTVKTTFsOCii8JQnkblPHCSx/dP9EdWb9xIuHBnu', 'John','Smith', 1, TRUE),
(2, 'agent2@supportdesk.com', '$2b$10$so/94mjoRdmEddTVKTTFsOCii8JQnkblPHCSx/dP9EdWb9xIuHBnu', 'Sarah','Johnson', 2, TRUE),
(3, 'customer@example.com', '$2b$10$HZhSCIVUv4rwuQZyhXTcbeOjplSs8cFiHFZKkB9tLO7jfXZTPN3cW', 'Jane','Doe', NULL, TRUE);

-- initialize ticket_sequences for current year
INSERT INTO ticket_sequences (year, last_number) VALUES (YEAR(CURDATE()), 0)
    ON DUPLICATE KEY UPDATE last_number = last_number;

-- =====================================================
-- USAGE NOTES / QUICK HINTS
-- - Generate ticket numbers by calling the stored procedure:
--     CALL sp_get_next_ticket_number(@tn); SELECT @tn;
-- - Insert tickets with status_id and priority_id set to the relevant lookup ids.
-- - For atomic auto-assign logic use stored procedures that leverage SELECT ... FOR UPDATE
--   or use application-level locking combined with sp_get_next_ticket_number if needed.
-- - Prefer soft-deleting users (set deleted_at) instead of hard-deleting; FKs generally use SET NULL.
-- =====================================================

-- =====================================================
-- END OF SCRIPT
-- =====================================================
