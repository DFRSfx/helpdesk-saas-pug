-- Sample data for testing the Zolentra Helpdesk Platform
-- Run this AFTER running database.sql
USE zolentra_db;

-- ==========================
-- SAMPLE DEPARTMENTS
-- ==========================
INSERT INTO departments (name) VALUES
('Technical Support'),
('Billing & Payments'),
('Sales & Pre-Sales'),
('General Inquiries');

-- ==========================
-- SAMPLE USERS
-- ==========================
-- Password for all users: password123
-- Generated using bcrypt with 10 rounds
-- To generate your own: https://bcrypt-generator.com/

-- Admin User
INSERT INTO users (name, email, password_hash, role, department_id) VALUES
('Admin User', 'admin@zolentra.com', '$2b$10$rQZ8YnV5Z5Z5Z5Z5Z5Z5ZuXKq7hN0h0h0h0h0h0h0h0h0h0h0h0h0', 'admin', NULL);

-- Note: Replace the password_hash above with a real bcrypt hash
-- Generate one at https://bcrypt-generator.com/ using "password123" or your chosen password

-- Agent Users (assigned to departments)
INSERT INTO users (name, email, password_hash, role, department_id) VALUES
('John Smith', 'john.agent@zolentra.com', '$2b$10$rQZ8YnV5Z5Z5Z5Z5Z5Z5ZuXKq7hN0h0h0h0h0h0h0h0h0h0h0h0h0', 'agent', 1),
('Sarah Johnson', 'sarah.agent@zolentra.com', '$2b$10$rQZ8YnV5Z5Z5Z5Z5Z5Z5ZuXKq7hN0h0h0h0h0h0h0h0h0h0h0h0h0', 'agent', 1),
('Mike Davis', 'mike.agent@zolentra.com', '$2b$10$rQZ8YnV5Z5Z5Z5Z5Z5Z5ZuXKq7hN0h0h0h0h0h0h0h0h0h0h0h0h0', 'agent', 2),
('Emily Wilson', 'emily.agent@zolentra.com', '$2b$10$rQZ8YnV5Z5Z5Z5Z5Z5Z5ZuXKq7hN0h0h0h0h0h0h0h0h0h0h0h0h0', 'agent', 3);

-- Customer Users
INSERT INTO users (name, email, password_hash, role, department_id) VALUES
('Alice Brown', 'alice@example.com', '$2b$10$rQZ8YnV5Z5Z5Z5Z5Z5Z5ZuXKq7hN0h0h0h0h0h0h0h0h0h0h0h0h0', 'customer', NULL),
('Bob Taylor', 'bob@example.com', '$2b$10$rQZ8YnV5Z5Z5Z5Z5Z5Z5ZuXKq7hN0h0h0h0h0h0h0h0h0h0h0h0h0', 'customer', NULL),
('Carol White', 'carol@example.com', '$2b$10$rQZ8YnV5Z5Z5Z5Z5Z5Z5ZuXKq7hN0h0h0h0h0h0h0h0h0h0h0h0h0', 'customer', NULL);

-- ==========================
-- SAMPLE TICKETS
-- ==========================
INSERT INTO tickets (customer_id, agent_id, department_id, priority, status, title, description) VALUES
(5, 2, 1, 'High', 'In Progress', 'Cannot login to my account', 'I am unable to login to my account. I keep getting "Invalid credentials" error even though I am sure my password is correct. Please help!'),
(6, 2, 1, 'Medium', 'Open', 'Slow loading times', 'The application takes forever to load. Is this a known issue?'),
(7, 3, 2, 'Critical', 'Escalated', 'Payment failed but amount deducted', 'My payment of $99 was deducted from my account but the order shows as failed. I need immediate help!'),
(5, 4, 3, 'Low', 'Resolved', 'Product inquiry', 'I would like to know more about the enterprise plan features.'),
(6, NULL, 1, 'Medium', 'Open', 'Feature request: Dark mode', 'It would be great to have a dark mode option for the application.');

-- ==========================
-- SAMPLE TICKET MESSAGES
-- ==========================
-- Message for ticket 1
INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal) VALUES
(1, 5, 'I have tried resetting my password but still facing the same issue.', FALSE),
(1, 2, 'Thank you for reporting this. I am looking into your account now.', FALSE),
(1, 2, 'User account was locked due to multiple failed login attempts. Unlocking now.', TRUE),
(1, 2, 'I have unlocked your account. Please try logging in again and let me know if you still face issues.', FALSE);

-- Messages for ticket 2
INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal) VALUES
(2, 2, 'Could you please share what browser you are using and if you are on mobile or desktop?', FALSE),
(2, 6, 'I am using Chrome on desktop. Version 120.', FALSE);

-- Messages for ticket 3
INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal) VALUES
(3, 7, 'This is urgent! I need a refund or confirmation that my order went through!', FALSE),
(3, 3, 'I sincerely apologize for the inconvenience. I am escalating this to our billing team immediately.', FALSE),
(3, 3, 'Escalated to billing manager. Transaction ID: TXN-2024-12345', TRUE);

-- ==========================
-- SAMPLE AUDIT LOG
-- ==========================
INSERT INTO audit_log (ticket_id, user_id, action, old_value, new_value) VALUES
(1, 5, 'Ticket created', NULL, 'Status: Open, Priority: High'),
(1, 2, 'Agent assigned', 'None', 'Agent ID: 2 (John Smith)'),
(1, 2, 'Status changed', 'Open', 'In Progress'),
(2, 6, 'Ticket created', NULL, 'Status: Open, Priority: Medium'),
(2, 2, 'Agent assigned', 'None', 'Agent ID: 2 (John Smith)'),
(3, 7, 'Ticket created', NULL, 'Status: Open, Priority: Critical'),
(3, 3, 'Agent assigned', 'None', 'Agent ID: 3 (Mike Davis)'),
(3, 3, 'Status changed', 'Open', 'Escalated'),
(3, 3, 'Priority changed', 'High', 'Critical'),
(4, 5, 'Ticket created', NULL, 'Status: Open, Priority: Low'),
(4, 4, 'Agent assigned', 'None', 'Agent ID: 4 (Emily Wilson)'),
(4, 4, 'Status changed', 'Open', 'In Progress'),
(4, 4, 'Status changed', 'In Progress', 'Resolved'),
(5, 6, 'Ticket created', NULL, 'Status: Open, Priority: Medium');

-- ==========================
-- IMPORTANT NOTES
-- ==========================
-- All users have the password: password123
-- You must replace the password_hash values above with real bcrypt hashes
-- To generate bcrypt hashes:
--   1. Visit https://bcrypt-generator.com/
--   2. Enter your desired password
--   3. Select 10 rounds
--   4. Copy the generated hash
--   5. Replace the dummy hash in the SQL above

-- Or use Node.js:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('password123', 10);
-- console.log(hash);
