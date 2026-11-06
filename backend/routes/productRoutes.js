const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock
} = require('../controllers/productController');
const { validateProduct, validateStockAdjustment } = require('../middleware/validator');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', validateProduct, createProduct);
router.put('/:id', validateProduct, updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/stock', validateStockAdjustment, adjustStock);

module.exports = router;
