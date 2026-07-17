export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidationError extends AppError {
  constructor(message = 'Request validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}
export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, 409, code);
  }
}
export class InsufficientFundsError extends AppError {
  constructor() {
    super('Insufficient wallet balance', 422, 'INSUFFICIENT_FUNDS');
  }
}
export class ExternalServiceError extends AppError {
  constructor(message = 'Eligibility verification is temporarily unavailable') {
    super(message, 503, 'ELIGIBILITY_CHECK_UNAVAILABLE');
  }
}
