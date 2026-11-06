const { pool } = require('../config/db');

/**
 * Controller for Category Operations
 */

// GET /api/categories - Get all categories with product counts
const getAllCategories = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        c.created_at,
        COUNT(p.product_id) AS product_count,
        COALESCE(SUM(p.quantity), 0) AS total_items_in_stock
      FROM Categories c
      LEFT JOIN Products p ON c.category_id = p.category_id
    `;

    const params = [];
    if (search && search.trim() !== '') {
      query += ` WHERE c.category_name LIKE ? OR c.description LIKE ?`;
      const searchWildcard = `%${search.trim()}%`;
      params.push(searchWildcard, searchWildcard);
    }

    query += ` GROUP BY c.category_id, c.category_name, c.description, c.created_at ORDER BY c.category_name ASC`;

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

// GET /api/categories/:id - Get category by ID with associated products
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [categoryRows] = await pool.query(`
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        c.created_at,
        COUNT(p.product_id) AS product_count,
        COALESCE(SUM(p.quantity), 0) AS total_items_in_stock
      FROM Categories c
      LEFT JOIN Products p ON c.category_id = p.category_id
      WHERE c.category_id = ?
      GROUP BY c.category_id
    `, [id]);

    if (categoryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category with ID ${id} not found.`
      });
    }

    // Fetch products belonging to this category
    const [products] = await pool.query(`
      SELECT 
        p.product_id, 
        p.product_name, 
        p.price, 
        p.quantity,
        s.supplier_name
      FROM Products p
      LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
      WHERE p.category_id = ?
      ORDER BY p.product_name ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...categoryRows[0],
        products
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories - Create category
const createCategory = async (req, res, next) => {
  try {
    const { category_name, description } = req.body;

    // Check if category name already exists
    const [existing] = await pool.query(
      'SELECT category_id FROM Categories WHERE LOWER(category_name) = LOWER(?)',
      [category_name.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A category named "${category_name.trim()}" already exists.`
      });
    }

    const [result] = await pool.query(
      'INSERT INTO Categories (category_name, description) VALUES (?, ?)',
      [category_name.trim(), description ? description.trim() : null]
    );

    const [created] = await pool.query('SELECT * FROM Categories WHERE category_id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: {
        ...created[0],
        product_count: 0,
        total_items_in_stock: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/categories/:id - Update category
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;

    const [existing] = await pool.query('SELECT category_id FROM Categories WHERE category_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category with ID ${id} not found.`
      });
    }

    // Check for duplicate name if renaming
    const [duplicate] = await pool.query(
      'SELECT category_id FROM Categories WHERE LOWER(category_name) = LOWER(?) AND category_id != ?',
      [category_name.trim(), id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Another category named "${category_name.trim()}" already exists.`
      });
    }

    await pool.query(
      'UPDATE Categories SET category_name = ?, description = ? WHERE category_id = ?',
      [category_name.trim(), description ? description.trim() : null, id]
    );

    const [updated] = await pool.query(`
      SELECT 
        c.*, 
        COUNT(p.product_id) AS product_count,
        COALESCE(SUM(p.quantity), 0) AS total_items_in_stock
      FROM Categories c
      LEFT JOIN Products p ON c.category_id = p.category_id
      WHERE c.category_id = ?
      GROUP BY c.category_id
    `, [id]);

    res.json({
      success: true,
      message: 'Category updated successfully.',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/categories/:id - Delete category
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT category_name FROM Categories WHERE category_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category with ID ${id} not found.`
      });
    }

    // Delete category - foreign key is SET NULL, so products remain with category_id = null
    await pool.query('DELETE FROM Categories WHERE category_id = ?', [id]);

    res.json({
      success: true,
      message: `Category "${existing[0].category_name}" (ID: ${id}) deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
