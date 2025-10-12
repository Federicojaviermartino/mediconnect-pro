/**
 * API Types for MediConnect Pro
 * Defines all API-related types including responses, pagination, errors
 */

/**
 * Standard API Response wrapper
 */
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IApiError;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

/**
 * API Error Response
 */
export interface IApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string; // Only in development
  path?: string;
  timestamp: Date;
  statusCode: number;
}

/**
 * Pagination Metadata
 */
export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Paginated API Response
 */
export interface IPaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: IPaginationMeta;
  message?: string;
  timestamp: Date;
}

/**
 * Pagination Query Parameters
 */
export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter Query Parameters
 */
export interface IFilterQuery {
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: string;
  [key: string]: any;
}

/**
 * JWT Token Payload
 */
export interface IJwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
  iat?: number; // Issued at
  exp?: number; // Expiration
}

/**
 * Authentication Response
 */
export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

/**
 * Refresh Token Response
 */
export interface IRefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Health Check Response
 */
export interface IHealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number; // seconds
  version: string;
  services: Record<string, IServiceHealth>;
}

/**
 * Service Health Status
 */
export interface IServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number; // milliseconds
  lastCheck: Date;
  error?: string;
}

/**
 * File Upload Response
 */
export interface IFileUploadResponse {
  success: boolean;
  file: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
  };
}

/**
 * Batch Operation Response
 */
export interface IBatchOperationResponse<T = any> {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: IBatchResult<T>[];
  errors: IBatchError[];
}

/**
 * Batch Result Item
 */
export interface IBatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Batch Error
 */
export interface IBatchError {
  id: string;
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Validation Error Details
 */
export interface IValidationError {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

/**
 * HTTP Status Codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * API Error Codes
 */
export enum ApiErrorCode {
  // Authentication Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Business Logic Errors
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // External Service Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Generic Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * WebSocket Message Type
 */
export enum WebSocketMessageType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',

  // Vital Signs
  VITAL_SIGN_UPDATE = 'vital_sign_update',
  VITAL_SIGN_STREAM = 'vital_sign_stream',

  // Alerts
  ALERT_CREATED = 'alert_created',
  ALERT_UPDATED = 'alert_updated',

  // Consultations
  CONSULTATION_STARTED = 'consultation_started',
  CONSULTATION_ENDED = 'consultation_ended',
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',
  CHAT_MESSAGE = 'chat_message',

  // Notifications
  NOTIFICATION = 'notification',

  // System
  SYSTEM_UPDATE = 'system_update',
  ERROR = 'error',
}

/**
 * WebSocket Message
 */
export interface IWebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: Date;
  userId?: string;
  roomId?: string;
}

/**
 * Search Result
 */
export interface ISearchResult<T = any> {
  query: string;
  results: T[];
  total: number;
  took: number; // milliseconds
  suggestions?: string[];
}

/**
 * Audit Log Entry
 */
export interface IAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Rate Limit Info
 */
export interface IRateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number; // seconds
}

/**
 * Helper function to create success response
 */
export function createSuccessResponse<T>(data: T, message?: string): IApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date(),
  };
}

/**
 * Helper function to create error response
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  statusCode: HttpStatus,
  details?: Record<string, any>
): IApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      details,
      timestamp: new Date(),
    },
    timestamp: new Date(),
  };
}

/**
 * Helper function to create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): IPaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    timestamp: new Date(),
  };
}
