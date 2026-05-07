export const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${err.stack ?? err.message}`);
  const status = err.status ?? 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
  });
};
