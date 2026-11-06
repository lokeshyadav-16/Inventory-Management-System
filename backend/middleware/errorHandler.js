/**
 * Centralized Error Handling Middleware
 */

const errorHandler = (err, req, res, next) => {
  console.error('[Application Error]:', err);

  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Handle specific MySQL errors
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        statusCode = 409;
        message = 'A record with this unique value already exists.';
        break;
      case 'ER_NO_REFERENCED_ROW_2':
        statusCode = 400;
        message = 'Invalid reference: The referenced category or supplier does not exist.';
        break;
      case 'ER_ROW_IS_REFERENCED_2':
        statusCode = 409;
        message = 'Cannot delete or update this record because related products depend on it.';
        break;
      case 'ECONNREFUSED':
        statusCode = 503;
        message = 'Database service is currently unreachable. Please verify MySQL is running.';
        break;
      case 'ER_BAD_DB_ERROR':
        statusCode = 500;
        message = 'Database "inventory_db" does not exist. Run "npm run init-db" first.';
        break;
      default:
        break;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, sqlMessage: err.sqlMessage })
  });
};

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
