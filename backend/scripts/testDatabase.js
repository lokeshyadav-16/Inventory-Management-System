const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runDatabaseTest() {
  console.log('====================================================');
  console.log('Starting Database & CRUD Operations Verification');
  console.log('Target Database:', process.env.DB_NAME || 'inventory_management');
  console.log('====================================================');

  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inventory_management'
  };

  let conn;
  try {
    // 1. Connection Test
    conn = await mysql.createConnection(connectionConfig);
    console.log(`[PASS] 1. Connected successfully to database "${connectionConfig.database}" at ${connectionConfig.host}:${connectionConfig.port}`);

    // 2. Table Existence Verification
    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`[PASS] 2. Verified tables exist in "${connectionConfig.database}":`, tableNames);

    const requiredTables = ['categories', 'suppliers', 'products'];
    const lowerTableNames = tableNames.map(t => t.toLowerCase());
    for (const t of requiredTables) {
      if (!lowerTableNames.includes(t)) {
        throw new Error(`Required table "${t}" is missing from database!`);
      }
    }

    // 3. Count Sample Data
    const [[catCount]] = await conn.query('SELECT COUNT(*) as count FROM Categories');
    const [[supCount]] = await conn.query('SELECT COUNT(*) as count FROM Suppliers');
    const [[prodCount]] = await conn.query('SELECT COUNT(*) as count FROM Products');
    console.log(`[PASS] 3. Sample records count: Categories: ${catCount.count}, Suppliers: ${supCount.count}, Products: ${prodCount.count}`);

    // 4. Test CREATE (INSERT)
    const [catRes] = await conn.query(
      'INSERT INTO Categories (category_name, description) VALUES (?, ?)',
      ['Test Category Lab Verification', 'Temporary category to test INSERT']
    );
    const newCatId = catRes.insertId;
    console.log(`[PASS] 4a. [CREATE] Category inserted with primary key category_id: ${newCatId}`);

    const [supRes] = await conn.query(
      'INSERT INTO Suppliers (supplier_name, email, phone, address) VALUES (?, ?, ?, ?)',
      ['Test Logistics Partner', 'logistics@testpartner.com', '+1 (555) 012-3456', '99 Test Highway, Chicago, IL']
    );
    const newSupId = supRes.insertId;
    console.log(`[PASS] 4b. [CREATE] Supplier inserted with primary key supplier_id: ${newSupId}`);

    const [prodRes] = await conn.query(
      'INSERT INTO Products (product_name, category_id, supplier_id, price, quantity, description) VALUES (?, ?, ?, ?, ?, ?)',
      ['Industrial Temperature Sensor', newCatId, newSupId, 45.99, 25, 'Digital thermal sensor for equipment monitoring']
    );
    const newProdId = prodRes.insertId;
    console.log(`[PASS] 4c. [CREATE] Product inserted with primary key product_id: ${newProdId}`);

    // 5. Test READ (SELECT with Foreign Key JOINs)
    const [readRows] = await conn.query(`
      SELECT 
        p.product_id,
        p.product_name,
        p.price,
        p.quantity,
        c.category_name,
        s.supplier_name,
        s.email AS supplier_email
      FROM Products p
      JOIN Categories c ON p.category_id = c.category_id
      JOIN Suppliers s ON p.supplier_id = s.supplier_id
      WHERE p.product_id = ?
    `, [newProdId]);

    if (readRows.length === 0) {
      throw new Error(`Failed to read inserted product ID ${newProdId}`);
    }
    console.log('[PASS] 5. [READ] Successfully retrieved joined product record:');
    console.log('       -> Product Name:', readRows[0].product_name);
    console.log('       -> Category Name:', readRows[0].category_name);
    console.log('       -> Supplier Name:', readRows[0].supplier_name);
    console.log('       -> Unit Price:   $', readRows[0].price);
    console.log('       -> Stock Qty:    ', readRows[0].quantity);

    // 6. Test UPDATE (Price & Stock Quantity)
    await conn.query(
      'UPDATE Products SET price = ?, quantity = ?, description = ? WHERE product_id = ?',
      [59.99, 30, 'Updated sensor with calibrated firmware', newProdId]
    );

    const [[updatedRow]] = await conn.query(
      'SELECT price, quantity, description FROM Products WHERE product_id = ?',
      [newProdId]
    );
    console.log(`[PASS] 6. [UPDATE] Product updated: Price=$${updatedRow.price}, Quantity=${updatedRow.quantity}`);

    // 7. Test DELETE
    await conn.query('DELETE FROM Products WHERE product_id = ?', [newProdId]);
    const [checkDeleted] = await conn.query('SELECT product_id FROM Products WHERE product_id = ?', [newProdId]);
    if (checkDeleted.length !== 0) {
      throw new Error(`Product ${newProdId} was not deleted!`);
    }
    console.log(`[PASS] 7. [DELETE] Product ID ${newProdId} deleted successfully.`);

    // 8. Test Clean Up
    await conn.query('DELETE FROM Categories WHERE category_id = ?', [newCatId]);
    await conn.query('DELETE FROM Suppliers WHERE supplier_id = ?', [newSupId]);
    console.log('[PASS] 8. Cleaned up temporary test category and supplier.');

    console.log('====================================================');
    console.log('✓ ALL DATABASE & CRUD TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================');
  } catch (error) {
    console.error('[FAIL] Error during database test:', error.message);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

runDatabaseTest();
