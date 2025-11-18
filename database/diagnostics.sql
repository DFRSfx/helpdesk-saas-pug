-- =====================================================
-- DIAGNOSTIC SCRIPT: Check Foreign Key Issues
-- =====================================================

-- Check if ticket_messages table exists
SELECT TABLE_NAME, TABLE_TYPE 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'supportdesk_pro' 
AND TABLE_NAME = 'ticket_messages';

-- Check ticket_messages structure
DESCRIBE ticket_messages;

-- Check if id column is indexed
SHOW INDEX FROM ticket_messages WHERE Key_name = 'PRIMARY';

-- Check ticket_attachments foreign keys
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'supportdesk_pro'
AND TABLE_NAME = 'ticket_attachments'
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Check data types match
SELECT 
    'ticket_messages' as table_name,
    'id' as column_name,
    COLUMN_TYPE,
    IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'supportdesk_pro'
AND TABLE_NAME = 'ticket_messages'
AND COLUMN_NAME = 'id'
UNION ALL
SELECT 
    'ticket_attachments' as table_name,
    'message_id' as column_name,
    COLUMN_TYPE,
    IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'supportdesk_pro'
AND TABLE_NAME = 'ticket_attachments'
AND COLUMN_NAME = 'message_id';
