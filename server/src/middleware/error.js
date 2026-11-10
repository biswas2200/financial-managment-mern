import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/** Translate known error types into a consistent JSON shape: { error: { code, message, details? } } */
function normalise(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return ApiError.validation(details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`, undefined, 'INVALID_ID');
  }
  if (err?.code === 11000) {
    return ApiError.conflict('That record already exists');
  }
  if (err?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Request body is not valid JSON');
  }
  if (err?.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE');
  }
  return new ApiError(500, 'Something went wrong on our side. Please try again.', 'INTERNAL_ERROR');
}

// Express recognises error handlers by their four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const apiError = normalise(err);
  if (apiError.status >= 500 && !env.isTest) console.error(err);

  res.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
    },
  });
}
