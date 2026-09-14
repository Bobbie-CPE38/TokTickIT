export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: string[];

  constructor(statusCode: number, message: string, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = "Bad Request", details?: string[]) {
    super(400, message, details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized", details?: string[]) {
    super(401, message, details);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden", details?: string[]) {
    super(403, message, details);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Not Found", details?: string[]) {
    super(404, message, details);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = "Conflict", details?: string[]) {
    super(409, message, details);
    this.name = "ConflictError";
  }
}

export class GoneError extends ApiError {
  constructor(message: string = "Gone", details?: string[]) {
    super(410, message, details);
    this.name = "GoneError";
  }
}

export class PayloadTooLargeError extends ApiError {
  constructor(message: string = "Payload Too Large", details?: string[]) {
    super(413, message, details);
    this.name = "PayloadTooLargeError";
  }
}

export class UnsupportedMediaTypeError extends ApiError {
  constructor(message: string = "Unsupported Media Type", details?: string[]) {
    super(415, message, details);
    this.name = "UnsupportedMediaTypeError";
  }
}

export class UnprocessableEntityError extends ApiError {
  constructor(message: string = "Validation failed", details?: string[]) {
    super(422, message, details);
    this.name = "UnprocessableEntityError";
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = "Internal Server Error", details?: string[]) {
    super(500, message, details);
    this.name = "InternalServerError";
  }
}
