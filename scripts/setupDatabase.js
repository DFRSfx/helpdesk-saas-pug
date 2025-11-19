require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let connection;

  try {
    console.log('\n=== Support Desk Database Setup ===\n');

    // Connect to MySQL (without database)
    console.log('🔌 Connecting to MySQL server...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server');

    // Read and execute database.sql
    console.log('📖 Reading database.sql...');
    const sqlFile = path.join(__dirname, '..', 'database.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('⚙️  Creating database and tables...');
    await connection.query(sql);

    console.log('✅ Database created successfully!');
    console.log('\n📊 Database: supportdesk');
    console.log('📋 Tables created:');
    console.log('   - users');
    console.log('   - departments');
    console.log('   - tickets');
    console.log('   - ticket_messages');
    console.log('   - ticket_attachments');
    console.log('   - audit_log');
    console.log('\n📈 Views created:');
    console.log('   - v_ticket_overview_daily');
    console.log('   - v_tickets_by_department');
    console.log('   - v_agent_performance');
    console.log('   - v_ticket_message_activity');
    console.log('   - v_audit_summary');

    console.log('\n✅ Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: node scripts/createAdmin.js (to create your admin user)');
    console.log('   2. Run: npm run dev (to start the application)');
    console.log('   3. Visit: http://localhost:3000\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Tips:');
    console.error('   - Make sure MySQL is running');
    console.error('   - Check your .env file for correct credentials');
    console.error('   - Verify DB_HOST, DB_USER, and DB_PASSWORD\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
