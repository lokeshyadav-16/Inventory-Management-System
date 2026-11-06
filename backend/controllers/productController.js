const { pool } = require('../config/db');

/**
 * Controller for Product Operations
 */

// GET /api/products - Get all products with optional filters, search, and sorting
const getAllProducts = async (req, res, next) => {
  try {
    const { search, category_id, supplier_id, stock_status, sort_by, sort_order } = req.query;

    let query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.category_id,
        c.category_name,
        p.supplier_id,
        s.supplier_name,
        p.price,
        p.quantity,
        p.description,
        p.created_at,
        ROUND(p.price * p.quantity, 2) AS total_value,
        CASE
          WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.quantity <= 5 THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
      WHERE 1=1
    `;

    const params = [];

    // Search filter (name or description)
    if (search && search.trim() !== '') {
      query += ` AND (p.product_name LIKE ? OR p.description LIKE ?)`;
      const searchWildcard = `%${search.trim()}%`;
      params.push(searchWildcard, searchWildcard);
    }

    // Category filter
    if (category_id && category_id !== 'all') {
      query += ` AND p.category_id = ?`;
      params.push(parseInt(category_id, 10));
    }

    // Supplier filter
    if (supplier_id && supplier_id !== 'all') {
      query += ` AND p.supplier_id = ?`;
      params.push(parseInt(supplier_id, 10));
    }

    // Stock status filter
    if (stock_status) {
      if (stock_status === 'out') {
        query += ` AND p.quantity = 0`;
      } else if (stock_status === 'low') {
        query += ` AND p.quantity > 0 AND p.quantity <= 5`;
      } else if (stock_status === 'in') {
        query += ` AND p.quantity > 5`;
      }
    }

    // Sorting
    const validSortFields = {
      name: 'p.product_name',
      price: 'p.price',
      quantity: 'p.quantity',
      created_at: 'p.created_at',
      id: 'p.product_id'
    };

    const sortByField = validSortFields[sort_by] || 'p.product_id';
    const direction = sort_order && sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortByField} ${direction}`;

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/:id - Get a single product by ID
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.category_id,
        c.category_name,
        p.supplier_id,
        s.supplier_name,
        s.email AS supplier_email,
        s.phone AS supplier_phone,
        p.price,
        p.quantity,
        p.description,
        p.created_at,
        ROUND(p.price * p.quantity, 2) AS total_value,
        CASE
          WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.quantity <= 5 THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
      WHERE p.product_id = ?
    `;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found.`
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/products - Create a new product
const createProduct = async (req, res, next) => {
  try {
    const {
      product_name,
      category_id,
      supplier_id,
      price,
      quantity,
      description
    } = req.body;

    const query = `
      INSERT INTO Products (product_name, category_id, supplier_id, price, quantity, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const parsedCategoryId = category_id ? parseInt(category_id, 10) : null;
    const parsedSupplierId = supplier_id ? parseInt(supplier_id, 10) : null;
    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10);
    const cleanDescription = description ? description.trim() : null;

    const [result] = await pool.query(query, [
      product_name.trim(),
      parsedCategoryId,
      parsedSupplierId,
      parsedPrice,
      parsedQuantity,
      cleanDescription
    ]);

    // Fetch the newly created product with join data
    const [createdRows] = await pool.query(`
      SELECT 
        p.*, 
        c.category_name, 
        s.supplier_name,
        ROUND(p.price * p.quantity, 2) AS total_value
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
      WHERE p.product_id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: createdRows[0]
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/products/:id - Update an existing product
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      product_name,
      category_id,
      supplier_id,
      price,
      quantity,
      description
    } = req.body;

    // Check if product exists
    const [existing] = await pool.query('SELECT product_id FROM Products WHERE product_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found.`
      });
    }

    const query = `
      UPDATE Products
      SET 
        product_name = ?,
        category_id = ?,
        supplier_id = ?,
        price = ?,
        quantity = ?,
        description = ?
      WHERE product_id = ?
    `;

    const parsedCategoryId = category_id ? parseInt(category_id, 10) : null;
    const parsedSupplierId = supplier_id ? parseInt(supplier_id, 10) : null;
    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10);
    const cleanDescription = description ? description.trim() : null;

    await pool.query(query, [
      product_name.trim(),
      parsedCategoryId,
      parsedSupplierId,
      parsedPrice,
      parsedQuantity,
      cleanDescription,
      id
    ]);

    const [updatedRows] = await pool.query(`
      SELECT 
        p.*, 
        c.category_name, 
        s.supplier_name,
        ROUND(p.price * p.quantity, 2) AS total_value
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
      WHERE p.product_id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: updatedRows[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/products/:id - Delete a product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT product_name FROM Products WHERE product_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found.`
      });
    }

    await pool.query('DELETE FROM Products WHERE product_id = ?', [id]);

    res.json({
      success: true,
      message: `Product "${existing[0].product_name}" (ID: ${id}) deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/products/:id/stock - Adjust stock quantity (add, subtract, set)
const adjustStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adjustment_type, amount, reason } = req.body;

    const [existing] = await pool.query('SELECT product_id, product_name, quantity FROM Products WHERE product_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found.`
      });
    }

    const currentQty = existing[0].quantity;
    const numAmount = parseInt(amount, 10);
    let newQty = currentQty;

    if (adjustment_type === 'add') {
      newQty = currentQty + numAmount;
    } else if (adjustment_type === 'subtract') {
      if (currentQty - numAmount < 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot subtract ${numAmount} units. Current stock is only ${currentQty}.`
        });
      }
      newQty = currentQty - numAmount;
    } else if (adjustment_type === 'set') {
      newQty = numAmount;
    }

    await pool.query('UPDATE Products SET quantity = ? WHERE product_id = ?', [newQty, id]);

    res.json({
      success: true,
      message: `Stock updated for "${existing[0].product_name}". Previous: ${currentQty}, New: ${newQty}.`,
      data: {
        product_id: parseInt(id, 10),
        product_name: existing[0].product_name,
        previous_quantity: currentQty,
        quantity: newQty,
        adjustment_type,
        amount: numAmount,
        reason: reason || 'Manual adjustment'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock
};
