// Domain errors. Routes/services throw these; the central error middleware
// maps them to consistent HTTP responses. Throwing > returning is intentional —
// it lets nested service calls bubble up without every layer rewrapping.

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "INTERNAL";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, status: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requête invalide", details?: unknown) {
    super("BAD_REQUEST", 400, message, details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Non authentifié") {
    super("UNAUTHORIZED", 401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé") {
    super("FORBIDDEN", 403, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable") {
    super("NOT_FOUND", 404, message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Données invalides", details?: unknown) {
    super("VALIDATION", 400, message, details);
    this.name = "ValidationError";
  }
}
