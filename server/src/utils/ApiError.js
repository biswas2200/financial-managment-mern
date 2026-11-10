/**
 * An error that maps directly to an HTTP response.
 * Services throw these; the central error handler turns them into JSON.
 */
export class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details, code = 'BAD_REQUEST') {
    return new ApiError(400, message, code, details);
  }

  static validation(details) {
    return new ApiError(400, 'Please check the highlighted fields', 'VALIDATION_ERROR', details);
  }

  static unauthorized(message = 'Please sign in to continue', code = 'UNAUTHENTICATED') {
    return new ApiError(401, message, code);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message) {
    return new ApiError(409, message, 'CONFLICT');
  }
}
