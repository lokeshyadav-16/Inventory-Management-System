/**
 * Input validation middleware for Inventory Management System
 */

const validateProduct = (req, res, next) => {
  const { product_name, price, quantity, category_id, supplier_id } = req.body;
  const errors = [];

  if (!product_name || typeof product_name !== 'string' || product_name.trim().length === 0) {
    errors.push('Product name is required and cannot be empty.');
  } else if (product_name.length > 200) {
    errors.push('Product name cannot exceed 200 characters.');
  }

  if (price === undefined || price === null || price === '') {
    errors.push('Price is required.');
  } else if (isNaN(Number(price)) || Number(price) < 0) {
    errors.push('Price must be a valid positive number.');
  }

  if (quantity === undefined || quantity === null || quantity === '') {
    errors.push('Quantity is required.');
  } else if (isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) < 0) {
    errors.push('Quantity must be a valid non-negative integer.');
  }

  if (category_id !== undefined && category_id !== null && category_id !== '') {
    if (isNaN(parseInt(category_id, 10)) || parseInt(category_id, 10) <= 0) {
      errors.push('Category ID must be a valid positive integer.');
    }
  }

  if (supplier_id !== undefined && supplier_id !== null && supplier_id !== '') {
    if (isNaN(parseInt(supplier_id, 10)) || parseInt(supplier_id, 10) <= 0) {
      errors.push('Supplier ID must be a valid positive integer.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
};

const validateCategory = (req, res, next) => {
  const { category_name } = req.body;
  const errors = [];

  if (!category_name || typeof category_name !== 'string' || category_name.trim().length === 0) {
    errors.push('Category name is required.');
  } else if (category_name.length > 100) {
    errors.push('Category name cannot exceed 100 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
};

const validateSupplier = (req, res, next) => {
  const { supplier_name, email, phone } = req.body;
  const errors = [];

  if (!supplier_name || typeof supplier_name !== 'string' || supplier_name.trim().length === 0) {
    errors.push('Supplier name is required.');
  } else if (supplier_name.length > 150) {
    errors.push('Supplier name cannot exceed 150 characters.');
  }

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Supplier email is required.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Invalid email format.');
    }
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    errors.push('Supplier phone is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
};

const validateStockAdjustment = (req, res, next) => {
  const { adjustment_type, amount } = req.body;
  const errors = [];

  if (!adjustment_type || !['add', 'subtract', 'set'].includes(adjustment_type)) {
    errors.push('Adjustment type must be one of: "add", "subtract", or "set".');
  }

  if (amount === undefined || amount === null || isNaN(parseInt(amount, 10)) || parseInt(amount, 10) < 0) {
    errors.push('Amount must be a non-negative integer.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
};

module.exports = {
  validateProduct,
  validateCategory,
  validateSupplier,
  validateStockAdjustment
};
