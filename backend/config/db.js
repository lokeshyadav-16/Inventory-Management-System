const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
};

// Create a connection pool using mysql2/promise
const pool = mysql.createPool(dbConfig);

// Helper function to test database connectivity
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('[Database Connection Error]:', error.message);
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.warn(`[Database Hint] Database "${dbConfig.database}" does not exist yet. Run 'npm run init-db' in the backend directory or import database/schema.sql.`);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.warn(`[Database Hint] Access denied for user "${dbConfig.user}". Please verify DB_USER and DB_PASSWORD in backend/.env.`);
    } else if (error.code === 'ECONNREFUSED') {
      console.warn(`[Database Hint] MySQL server is not reachable at ${dbConfig.host}:${dbConfig.port}. Ensure the MySQL service (or XAMPP/WAMP) is running.`);
    }
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  dbConfig
};
