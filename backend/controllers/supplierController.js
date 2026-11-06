const { pool } = require('../config/db');

/**
 * Controller for Supplier Operations
 */

// GET /api/suppliers - Get all suppliers with product counts
const getAllSuppliers = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        s.supplier_id,
        s.supplier_name,
        s.email,
        s.phone,
        s.address,
        s.created_at,
        COUNT(p.product_id) AS products_supplied,
        COALESCE(SUM(p.quantity), 0) AS total_items_supplied
      FROM Suppliers s
      LEFT JOIN Products p ON s.supplier_id = p.supplier_id
    `;

    const params = [];
    if (search && search.trim() !== '') {
      query += ` WHERE s.supplier_name LIKE ? OR s.email LIKE ? OR s.phone LIKE ? OR s.address LIKE ?`;
      const searchWildcard = `%${search.trim()}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    query += ` GROUP BY s.supplier_id, s.supplier_name, s.email, s.phone, s.address, s.created_at ORDER BY s.supplier_name ASC`;

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

// GET /api/suppliers/:id - Get supplier by ID with supplied products
const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [supplierRows] = await pool.query(`
      SELECT 
        s.supplier_id,
        s.supplier_name,
        s.email,
        s.phone,
        s.address,
        s.created_at,
        COUNT(p.product_id) AS products_supplied,
        COALESCE(SUM(p.quantity), 0) AS total_items_supplied
      FROM Suppliers s
      LEFT JOIN Products p ON s.supplier_id = p.supplier_id
      WHERE s.supplier_id = ?
      GROUP BY s.supplier_id
    `, [id]);

    if (supplierRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Supplier with ID ${id} not found.`
      });
    }

    const [products] = await pool.query(`
      SELECT 
        p.product_id, 
        p.product_name, 
        p.price, 
        p.quantity,
        c.category_name
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.category_id
      WHERE p.supplier_id = ?
      ORDER BY p.product_name ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...supplierRows[0],
        products
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/suppliers - Create supplier
const createSupplier = async (req, res, next) => {
  try {
    const { supplier_name, email, phone, address } = req.body;

    const query = `
      INSERT INTO Suppliers (supplier_name, email, phone, address)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      supplier_name.trim(),
      email.trim(),
      phone.trim(),
      address ? address.trim() : null
    ]);

    const [created] = await pool.query('SELECT * FROM Suppliers WHERE supplier_id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully.',
      data: {
        ...created[0],
        products_supplied: 0,
        total_items_supplied: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/suppliers/:id - Update supplier
const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { supplier_name, email, phone, address } = req.body;

    const [existing] = await pool.query('SELECT supplier_id FROM Suppliers WHERE supplier_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Supplier with ID ${id} not found.`
      });
    }

    const query = `
      UPDATE Suppliers
      SET 
        supplier_name = ?,
        email = ?,
        phone = ?,
        address = ?
      WHERE supplier_id = ?
    `;

    await pool.query(query, [
      supplier_name.trim(),
      email.trim(),
      phone.trim(),
      address ? address.trim() : null,
      id
    ]);

    const [updated] = await pool.query(`
      SELECT 
        s.*, 
        COUNT(p.product_id) AS products_supplied,
        COALESCE(SUM(p.quantity), 0) AS total_items_supplied
      FROM Suppliers s
      LEFT JOIN Products p ON s.supplier_id = p.supplier_id
      WHERE s.supplier_id = ?
      GROUP BY s.supplier_id
    `, [id]);

    res.json({
      success: true,
      message: 'Supplier updated successfully.',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/suppliers/:id - Delete supplier
const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT supplier_name FROM Suppliers WHERE supplier_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Supplier with ID ${id} not found.`
      });
    }

    await pool.query('DELETE FROM Suppliers WHERE supplier_id = ?', [id]);

    res.json({
      success: true,
      message: `Supplier "${existing[0].supplier_name}" (ID: ${id}) deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
