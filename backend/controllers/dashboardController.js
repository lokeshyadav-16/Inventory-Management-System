const { pool } = require('../config/db');

/**
 * Controller for Dashboard Statistics and Low Stock Alerts
 */

const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Overall counts and valuation
    const [statsRows] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Products) AS total_products,
        (SELECT COUNT(*) FROM Categories) AS total_categories,
        (SELECT COUNT(*) FROM Suppliers) AS total_suppliers,
        COALESCE((SELECT SUM(quantity) FROM Products), 0) AS total_stock,
        COALESCE((SELECT ROUND(SUM(price * quantity), 2) FROM Products), 0) AS total_inventory_value,
        (SELECT COUNT(*) FROM Products WHERE quantity > 0 AND quantity <= 5) AS low_stock_count,
        (SELECT COUNT(*) FROM Products WHERE quantity = 0) AS out_of_stock_count,
        (SELECT COUNT(*) FROM Products WHERE quantity > 5) AS in_stock_count
    `);

    // 2. Category distribution
    const [categoryDistribution] = await pool.query(`
      SELECT 
        c.category_id,
        c.category_name,
        COUNT(p.product_id) AS product_count,
        COALESCE(SUM(p.quantity), 0) AS total_stock,
        COALESCE(ROUND(SUM(p.price * p.quantity), 2), 0) AS category_value
      FROM Categories c
      LEFT JOIN Products p ON c.category_id = p.category_id
      GROUP BY c.category_id, c.category_name
      ORDER BY product_count DESC
    `);

    // 3. Recent 5 products
    const [recentProducts] = await pool.query(`
      SELECT 
        p.product_id,
        p.product_name,
        p.price,
        p.quantity,
        p.created_at,
        c.category_name,
        s.supplier_name
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
      ORDER BY p.product_id DESC
      LIMIT 5
    `);

    // 4. Low stock items (quantity <= 5)
    const [lowStockItems] = await pool.query(`
      SELECT 
        p.product_id,
        p.product_name,
        p.quantity,
        p.price,
        c.category_name,
        s.supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        CASE 
          WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END AS urgency
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
      WHERE p.quantity <= 5
      ORDER BY p.quantity ASC, p.product_name ASC
    `);

    res.json({
      success: true,
      data: {
        summary: statsRows[0],
        category_distribution: categoryDistribution,
        recent_products: recentProducts,
        low_stock_items: lowStockItems
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/low-stock - Dedicated endpoint for low stock alerts
const getLowStockAlerts = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 5;

    const [rows] = await pool.query(`
      SELECT 
        p.product_id,
        p.product_name,
        p.quantity,
        p.price,
        c.category_name,
        s.supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        CASE 
          WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END AS urgency
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
      WHERE p.quantity <= ?
      ORDER BY p.quantity ASC, p.product_name ASC
    `, [threshold]);

    res.json({
      success: true,
      threshold,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getLowStockAlerts
};
