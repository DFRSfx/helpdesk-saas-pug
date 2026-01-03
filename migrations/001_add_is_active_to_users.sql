-- Migration: Add is_active column to users table
-- Description: Adds user activation status for login control

ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1 AFTER role;

-- Create index for active users queries
CREATE INDEX idx_users_active ON users(is_active);
