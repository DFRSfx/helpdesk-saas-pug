-- Update password hashes with real bcrypt hashes
-- Passwords: admin123, agent123, customer123

USE supportdesk_pro;

UPDATE users SET password_hash = '$2b$10$wyQmzcB2eia6REK5bdio2.vgx8jJyheh6VtcEuaj5S2Li7.06b2VO' WHERE email = 'admin@supportdesk.com';
UPDATE users SET password_hash = '$2b$10$so/94mjoRdmEddTVKTTFsOCii8JQnkblPHCSx/dP9EdWb9xIuHBnu' WHERE email = 'agent1@supportdesk.com';
UPDATE users SET password_hash = '$2b$10$so/94mjoRdmEddTVKTTFsOCii8JQnkblPHCSx/dP9EdWb9xIuHBnu' WHERE email = 'agent2@supportdesk.com';
UPDATE users SET password_hash = '$2b$10$HZhSCIVUv4rwuQZyhXTcbeOjplSs8cFiHFZKkB9tLO7jfXZTPN3cW' WHERE email = 'customer@example.com';

SELECT email, LEFT(password_hash, 20) as password_hash_preview FROM users;
