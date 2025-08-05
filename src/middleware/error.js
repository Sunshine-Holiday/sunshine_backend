export const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err); // Delegate to the default Express error handler
  }

  console.log("Error caught by middleware:", err); // Log the full error

  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  if (err.name === "CastError") err.message = "Invalid ID";

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export const TryCatch = (func) => (req, res, next) => {
  return Promise.resolve(func(req, res, next)).catch(next);
};
