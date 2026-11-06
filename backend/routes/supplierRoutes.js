const express = require('express');
const router = express.Router();
const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require('../controllers/supplierController');
const { validateSupplier } = require('../middleware/validator');

router.get('/', getAllSuppliers);
router.get('/:id', getSupplierById);
router.post('/', validateSupplier, createSupplier);
router.put('/:id', validateSupplier, updateSupplier);
router.delete('/:id', deleteSupplier);

module.exports = router;
