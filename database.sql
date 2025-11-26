DROP DATABASE IF EXISTS zolentra_db;
CREATE DATABASE zolentra_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zolentra_db;

-- ==========================
-- USERS
-- ==========================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','agent','customer') NOT NULL DEFAULT 'customer',
    department_id INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================
-- DEPARTMENTS
-- ==========================
CREATE TABLE departments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================
-- TICKETS
-- ==========================
CREATE TABLE tickets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    agent_id INT UNSIGNED NULL,
    department_id INT UNSIGNED NOT NULL,
    priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
    status ENUM('Open','In Progress','Waiting','Escalated','Resolved','Closed') NOT NULL DEFAULT 'Open',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================
-- TICKET MESSAGES
-- ==========================
CREATE TABLE ticket_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================
-- ATTACHMENTS
-- ==========================
CREATE TABLE ticket_attachments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================
-- AUDIT LOG
-- ==========================
CREATE TABLE audit_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NULL,
    action VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- ==========================
-- USERS INDEXES AND FOREIGN KEYS
-- ==========================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_department ON users(department_id);

-- Add foreign key for department_id (must be added after departments table exists)
ALTER TABLE users
ADD CONSTRAINT fk_users_department
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- ==========================
-- DEPARTMENTS INDEXES
-- ==========================
CREATE INDEX idx_departments_name ON departments(name);

-- ==========================
-- TICKETS INDEXES
-- ==========================
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_agent ON tickets(agent_id);
CREATE INDEX idx_tickets_department ON tickets(department_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX idx_tickets_agent_status ON tickets(agent_id, status);

-- ==========================
-- TICKET_MESSAGES INDEXES
-- ==========================
CREATE INDEX idx_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_messages_user ON ticket_messages(user_id);
CREATE INDEX idx_messages_created ON ticket_messages(created_at);

-- ==========================
-- ATTACHMENTS INDEXES
-- ==========================
CREATE INDEX idx_attachments_ticket ON ticket_attachments(ticket_id);
CREATE INDEX idx_attachments_uploaded_by ON ticket_attachments(uploaded_by);

-- ==========================
-- AUDIT LOG INDEXES
-- ==========================
CREATE INDEX idx_audit_ticket ON audit_log(ticket_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);
-- ==========================

-- VIEWS
-- ==========================
-- Daily ticket counts + priority breakdown.
CREATE VIEW v_ticket_overview_daily AS
SELECT 
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
ORDER BY date DESC;
-- ==========================
-- How each department is performing.
CREATE VIEW v_tickets_by_department AS
SELECT 
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
GROUP BY d.id, d.name;
-- ==========================
-- Which agents are carrying the team and who’s dead weight.
CREATE VIEW v_agent_performance AS
SELECT 
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
GROUP BY u.id, u.name, d.name;
-- ==========================
-- Shows which tickets are blowing up with replies.
CREATE VIEW v_ticket_message_activity AS
SELECT 
    t.id AS ticket_id,
    t.title,
    COUNT(m.id) AS message_count,
    MAX(m.created_at) AS last_message_at
FROM tickets t
LEFT JOIN ticket_messages m ON m.ticket_id = t.id
GROUP BY t.id, t.title
ORDER BY last_message_at DESC;
-- ==========================
-- Quick snapshot of ticket changes.
CREATE VIEW v_audit_summary AS
SELECT 
    ticket_id,
    COUNT(*) AS total_actions,
    SUM(action LIKE '%status%') AS status_changes,
    SUM(action LIKE '%Assigned%') AS assignments,
    MIN(created_at) AS first_action,
    MAX(created_at) AS last_action
FROM audit_log
GROUP BY ticket_id;
