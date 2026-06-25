const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational === true;

  if (!isOperational) {
    logger.error(err.stack || err.message);
  } else {
    logger.warn(`[${statusCode}] ${err.message}`);
  }

  const response = {
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: isOperational ? err.message : 'An unexpected error occurred',
    requestId: req.id,
  };

  if (process.env.NODE_ENV !== 'production' && !isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
