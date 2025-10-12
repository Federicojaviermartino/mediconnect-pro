/**
 * Response Utilities
 * Helper functions for standardized API responses
 */

import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import type { IApiResponse, IPaginatedResponse } from '@mediconnect/types';

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = StatusCodes.OK
): void {
  const response: IApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date(),
  };

  res.status(statusCode).json(response);
}

/**
 * Send created response (201)
 */
export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, StatusCodes.CREATED);
}

/**
 * Send no content response (204)
 */
export function sendNoContent(res: Response): void {
  res.status(StatusCodes.NO_CONTENT).send();
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): void {
  const totalPages = Math.ceil(total / limit);

  const response: IPaginatedResponse<T> = {
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
    message,
    timestamp: new Date(),
  };

  res.status(StatusCodes.OK).json(response);
}

export default {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
};
