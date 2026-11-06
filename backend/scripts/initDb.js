const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
  console.log('--- Initializing Inventory Management Database ---');

  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;
  try {
    console.log(`Connecting to MySQL server at ${connectionConfig.host}:${connectionConfig.port} as user "${connectionConfig.user}"...`);
    connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to MySQL server.');

    let sqlPath = path.join(__dirname, '../../database/inventory.sql');
    if (!fs.existsSync(sqlPath)) {
      sqlPath = path.join(__dirname, '../../database/schema.sql');
    }
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found at ${sqlPath}`);
    }

    const schemaSql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Executing SQL script from ${path.basename(sqlPath)}...`);
    await connection.query(schemaSql);

    console.log('✓ Database "inventory_management" created/verified.');
    console.log('✓ Tables (Categories, Suppliers, Products) created.');
    console.log('✓ Initial seed data populated successfully.');
    console.log('--- Database Initialization Complete! ---');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Please check your DB_USER and DB_PASSWORD in backend/.env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`Cannot connect to MySQL server at ${connectionConfig.host}:${connectionConfig.port}. Make sure MySQL is running.`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
