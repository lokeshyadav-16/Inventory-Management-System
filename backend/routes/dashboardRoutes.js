const express = require('express');
const router = express.Router();
const { getDashboardStats, getLowStockAlerts } = require('../controllers/dashboardController');

router.get('/stats', getDashboardStats);
router.get('/low-stock', getLowStockAlerts);

module.exports = router;
