const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route Imports
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins (supports both local files and frontend servers)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets directly from express server
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Inventory Management System API is running smoothly.',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Fallback to frontend index.html for root or SPA navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 Handler for undefined API routes
app.use('/api/*', notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server and Test DB
const startServer = async () => {
  // Test MySQL connection
  await testConnection();

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Inventory Management Server is live!`);
    console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);
    console.log(`📡 REST API Base: http://localhost:${PORT}/api`);
    console.log(`🩺 Health Check:  http://localhost:${PORT}/api/health`);
    console.log('====================================================');
  });
};

startServer();

module.exports = app;
