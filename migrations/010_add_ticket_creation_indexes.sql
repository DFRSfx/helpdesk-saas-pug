-- Migration: Add indexes for ticket creation performance
-- Purpose: Optimize agent workload queries and ticket filtering

-- Index for agent workload calculation
-- Used in: User.getAgentWithLowestWorkload() to quickly count open tickets per agent
ALTER TABLE `tickets` ADD INDEX `idx_agent_status` (`agent_id`, `status`);

-- Index for user filtering by role, department and active status
-- Used in: User.getAgentWithLowestWorkload() to filter agents by department
ALTER TABLE `users` ADD INDEX `idx_role_department_active` (`role`, `department_id`, `is_active`);

-- Index for ticket creation time ordering
-- Used in: Ticket.getAll() and other queries ordering by creation date
ALTER TABLE `tickets` ADD INDEX `idx_created_at` (`created_at`);

-- Index for ticket status filtering
-- Used in: Multiple queries filtering tickets by status
ALTER TABLE `tickets` ADD INDEX `idx_status` (`status`);
