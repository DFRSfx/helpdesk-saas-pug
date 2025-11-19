require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  let connection;

  try {
    console.log('\n=== Create Admin User for Support Desk ===\n');

    const name = await question('Admin Name: ');
    const email = await question('Admin Email: ');
    const password = await question('Admin Password: ');

    if (!name || !email || !password) {
      console.error('❌ All fields are required!');
      process.exit(1);
    }

    console.log('\n🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'supportdesk',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Check if email already exists
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.error(`❌ User with email ${email} already exists!`);
      process.exit(1);
    }

    // Insert admin user
    const [result] = await connection.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'admin']
    );

    console.log('\n✅ Admin user created successfully!');
    console.log(`\nUser ID: ${result.insertId}`);
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Role: admin`);
    console.log('\n🚀 You can now login at http://localhost:3000/auth/login\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    rl.close();
  }
}

createAdmin();
