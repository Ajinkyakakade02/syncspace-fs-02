export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const UnauthorizedError = (message = 'Authentication required', code = 'UNAUTHORIZED') =>
  new AppError(message, 401, code);

export const ForbiddenError = (message = 'Insufficient permissions for this action', code = 'FORBIDDEN') =>
  new AppError(message, 403, code);

export const NotFoundError = (message = 'Resource not found', code = 'NOT_FOUND') =>
  new AppError(message, 404, code);

export const ConflictError = (message = 'Resource already exists or state conflict', code = 'CONFLICT') =>
  new AppError(message, 409, code);

export const ValidationError = (message = 'Validation failed', details?: unknown) =>
  new AppError(message, 422, 'VALIDATION_ERROR', details);
