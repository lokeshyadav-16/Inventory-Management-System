const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5000';

function httpRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Accept': 'application/json, text/html, */*',
        ...(postData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runFullVerification() {
  console.log('================================================================');
  console.log('🚀 INVENTORY MANAGEMENT SYSTEM - FULL-STACK VERIFICATION');
  console.log('================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS ✓] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL ✗] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // ----------------------------------------------------------------
    // 1. Check frontend-to-backend API connectivity & static files
    // ----------------------------------------------------------------
    console.log('\n--- 1. Testing Frontend Delivery & API Connectivity ---');
    
    const indexRes = await httpRequest('GET', '/');
    assert(indexRes.statusCode === 200, 'Frontend index.html served with HTTP 200');
    assert(typeof indexRes.data === 'string' && indexRes.data.includes('StockFlow'), 'Frontend HTML contains StockFlow brand');

    const cssRes = await httpRequest('GET', '/css/style.css');
    assert(cssRes.statusCode === 200, 'Custom CSS style.css served with HTTP 200');

    const appJsRes = await httpRequest('GET', '/js/app.js');
    assert(appJsRes.statusCode === 200, 'Frontend application JS (app.js) served with HTTP 200');

    const apiJsRes = await httpRequest('GET', '/js/api.js');
    assert(apiJsRes.statusCode === 200, 'Frontend API client (api.js) served with HTTP 200');

    const healthRes = await httpRequest('GET', '/api/health');
    assert(healthRes.statusCode === 200 && healthRes.data.status === 'healthy', 'Backend health API /api/health is healthy');

    // ----------------------------------------------------------------
    // 2. Ensure all frontend pages use real MySQL data
    // ----------------------------------------------------------------
    console.log('\n--- 2. Verifying Real MySQL Data Loading ---');

    const statsRes = await httpRequest('GET', '/api/dashboard/stats');
    assert(statsRes.statusCode === 200 && statsRes.data.success, 'Dashboard stats API returns success');
    const summary = statsRes.data.data.summary;
    assert(summary.total_products > 0, `Real MySQL products loaded: ${summary.total_products} products`);
    assert(summary.total_categories > 0, `Real MySQL categories loaded: ${summary.total_categories} categories`);
    assert(summary.total_suppliers > 0, `Real MySQL suppliers loaded: ${summary.total_suppliers} suppliers`);
    assert(summary.total_stock > 0, `Real MySQL total stock units calculated: ${summary.total_stock} units`);
    assert(summary.total_inventory_value > 0, `Real MySQL inventory valuation: $${summary.total_inventory_value}`);

    const productsRes = await httpRequest('GET', '/api/products');
    assert(productsRes.statusCode === 200 && productsRes.data.count > 0, `Products API returned ${productsRes.data.count} items with category and supplier joins`);

    const categoriesRes = await httpRequest('GET', '/api/categories');
    assert(categoriesRes.statusCode === 200 && categoriesRes.data.count > 0, `Categories API returned ${categoriesRes.data.count} items with aggregated product counts`);

    const suppliersRes = await httpRequest('GET', '/api/suppliers');
    assert(suppliersRes.statusCode === 200 && suppliersRes.data.count > 0, `Suppliers API returned ${suppliersRes.data.count} items with aggregated supply counts`);

    // ----------------------------------------------------------------
    // 3. Test Add, View, Edit, and Delete for Categories, Suppliers, Products
    // ----------------------------------------------------------------
    console.log('\n--- 3. Testing Complete CRUD Workflow ---');

    // 3a. Category CRUD
    console.log('Testing Category CRUD...');
    const createCat = await httpRequest('POST', '/api/categories', {
      category_name: 'Robotics & Automation',
      description: 'Sensors, microcontrollers, and actuators'
    });
    assert(createCat.statusCode === 201 && createCat.data.success, 'Created category "Robotics & Automation"');
    const testCatId = createCat.data.data.category_id;

    const viewCat = await httpRequest('GET', `/api/categories/${testCatId}`);
    assert(viewCat.statusCode === 200 && viewCat.data.data.category_name === 'Robotics & Automation', `Viewed category details for ID ${testCatId}`);

    const editCat = await httpRequest('PUT', `/api/categories/${testCatId}`, {
      category_name: 'Robotics & Smart Automation',
      description: 'Sensors, IoT microcontrollers, and actuators'
    });
    assert(editCat.statusCode === 200 && editCat.data.data.category_name === 'Robotics & Smart Automation', `Edited category ID ${testCatId} successfully`);

    // 3b. Supplier CRUD
    console.log('Testing Supplier CRUD...');
    const createSup = await httpRequest('POST', '/api/suppliers', {
      supplier_name: 'Apex Robotics International',
      email: 'contact@apexrobotics.io',
      phone: '+1 (555) 321-7654',
      address: '500 Robotics Way, Boston, MA'
    });
    assert(createSup.statusCode === 201 && createSup.data.success, 'Created supplier "Apex Robotics International"');
    const testSupId = createSup.data.data.supplier_id;

    const viewSup = await httpRequest('GET', `/api/suppliers/${testSupId}`);
    assert(viewSup.statusCode === 200 && viewSup.data.data.supplier_name === 'Apex Robotics International', `Viewed supplier details for ID ${testSupId}`);

    const editSup = await httpRequest('PUT', `/api/suppliers/${testSupId}`, {
      supplier_name: 'Apex Robotics Global',
      email: 'support@apexrobotics.io',
      phone: '+1 (555) 321-7654',
      address: '500 Robotics Way, Suite 10, Boston, MA'
    });
    assert(editSup.statusCode === 200 && editSup.data.data.supplier_name === 'Apex Robotics Global', `Edited supplier ID ${testSupId} successfully`);

    // 3c. Product CRUD
    console.log('Testing Product CRUD...');
    const createProd = await httpRequest('POST', '/api/products', {
      product_name: 'LiDAR Sensor Module V2',
      category_id: testCatId,
      supplier_id: testSupId,
      price: 189.50,
      quantity: 20,
      description: 'High-precision 360-degree laser rangefinder'
    });
    assert(createProd.statusCode === 201 && createProd.data.success, 'Created product "LiDAR Sensor Module V2" with quantity=20');
    const testProdId = createProd.data.data.product_id;

    const viewProd = await httpRequest('GET', `/api/products/${testProdId}`);
    assert(viewProd.statusCode === 200 && viewProd.data.data.product_name === 'LiDAR Sensor Module V2', `Viewed product details for ID ${testProdId}`);
    assert(viewProd.data.data.category_name === 'Robotics & Smart Automation', 'Product view correctly joined category name');
    assert(viewProd.data.data.supplier_name === 'Apex Robotics Global', 'Product view correctly joined supplier name');

    const editProd = await httpRequest('PUT', `/api/products/${testProdId}`, {
      product_name: 'LiDAR Sensor Module V2 (Calibrated)',
      category_id: testCatId,
      supplier_id: testSupId,
      price: 199.99,
      quantity: 20,
      description: 'Factory-calibrated 360-degree laser rangefinder'
    });
    assert(editProd.statusCode === 200 && editProd.data.data.price === 199.99, `Edited product ID ${testProdId} (updated price to $199.99)`);

    // ----------------------------------------------------------------
    // 4. Test Stock Updates & Low-Stock Alerts
    // ----------------------------------------------------------------
    console.log('\n--- 4. Testing Stock Updates & Low-Stock Alerts ---');

    // 4a. Verify it is initially healthy stock (quantity 20 > 5)
    const initialAlerts = await httpRequest('GET', '/api/dashboard/low-stock');
    const foundInAlerts1 = initialAlerts.data.data.some(p => p.product_id === testProdId);
    assert(!foundInAlerts1, 'Product with quantity 20 is not in low-stock alerts');

    // 4b. Adjust stock down to 3 (triggers Low Stock alert <= 5)
    const deductStock = await httpRequest('PATCH', `/api/products/${testProdId}/stock`, {
      adjustment_type: 'subtract',
      amount: 17,
      reason: 'Dispatched 17 units for lab deployment'
    });
    assert(deductStock.statusCode === 200 && deductStock.data.data.quantity === 3, 'Deducted 17 units, new quantity is 3');

    // 4c. Verify it now appears in low-stock alerts!
    const updatedAlerts = await httpRequest('GET', '/api/dashboard/low-stock');
    const foundInAlerts2 = updatedAlerts.data.data.some(p => p.product_id === testProdId);
    assert(foundInAlerts2, 'Product with quantity 3 successfully triggered Low-Stock alert!');

    // 4d. Add stock (+15)
    const addStock = await httpRequest('PATCH', `/api/products/${testProdId}/stock`, {
      adjustment_type: 'add',
      amount: 15,
      reason: 'Shipment received from vendor'
    });
    assert(addStock.statusCode === 200 && addStock.data.data.quantity === 18, 'Added 15 units, new quantity is 18');

    // ----------------------------------------------------------------
    // 5. Verify Dashboard Statistics Update Dynamically
    // ----------------------------------------------------------------
    console.log('\n--- 5. Verifying Dynamic Dashboard Metrics ---');

    const dynamicStats = await httpRequest('GET', '/api/dashboard/stats');
    const dynSummary = dynamicStats.data.data.summary;
    assert(dynSummary.total_products === summary.total_products + 1, 'Total products metric dynamically incremented by 1');
    assert(dynSummary.total_categories === summary.total_categories + 1, 'Total categories metric dynamically incremented by 1');
    assert(dynSummary.total_suppliers === summary.total_suppliers + 1, 'Total suppliers metric dynamically incremented by 1');

    // Cleanup: Delete Product, Supplier, Category
    const delProd = await httpRequest('DELETE', `/api/products/${testProdId}`);
    assert(delProd.statusCode === 200 && delProd.data.success, `Deleted product ID ${testProdId}`);

    const delSup = await httpRequest('DELETE', `/api/suppliers/${testSupId}`);
    assert(delSup.statusCode === 200 && delSup.data.success, `Deleted supplier ID ${testSupId}`);

    const delCat = await httpRequest('DELETE', `/api/categories/${testCatId}`);
    assert(delCat.statusCode === 200 && delCat.data.success, `Deleted category ID ${testCatId}`);

    // Verify metrics returned to baseline
    const finalStats = await httpRequest('GET', '/api/dashboard/stats');
    assert(finalStats.data.data.summary.total_products === summary.total_products, 'Dashboard metric returned to baseline after deletion');

    // ----------------------------------------------------------------
    // 6. Check .env configuration and .gitignore
    // ----------------------------------------------------------------
    console.log('\n--- 6. Checking .env and .gitignore Configuration ---');

    const envPath = path.join(__dirname, '../.env');
    assert(fs.existsSync(envPath), 'backend/.env exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    assert(envContent.includes('DB_NAME=inventory_management'), 'backend/.env specifies DB_NAME=inventory_management');
    assert(envContent.includes('DB_USER=root'), 'backend/.env specifies DB_USER=root');
    assert(envContent.includes('PORT=5000'), 'backend/.env specifies PORT=5000');

    const envExamplePath = path.join(__dirname, '../.env.example');
    assert(fs.existsSync(envExamplePath), 'backend/.env.example template exists');

    const gitignorePath = path.join(__dirname, '../../.gitignore');
    assert(fs.existsSync(gitignorePath), '.gitignore exists in root');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    assert(gitignoreContent.includes('node_modules'), '.gitignore excludes node_modules');
    assert(gitignoreContent.includes('.env'), '.gitignore excludes .env files');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
    console.log('================================================================');
  } catch (error) {
    console.error('\nVerification halted with error:', error.message);
    process.exit(1);
  }
}

runFullVerification();
