/**
 * Health Check Routes
 * Provides endpoints for monitoring service health
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { asyncHandler } from '../middleware';
import { config } from '../config';
import type { IHealthCheckResponse } from '@mediconnect/types';

const router = Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const uptime = process.uptime();

    const healthCheck: IHealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date(),
      uptime,
      version: '1.0.0',
      services: {
        'api-gateway': {
          status: 'up',
          lastCheck: new Date(),
        },
      },
    };

    res.status(StatusCodes.OK).json(healthCheck);
  })
);

/**
 * GET /health/detailed
 * Detailed health check including all services
 */
router.get(
  '/detailed',
  asyncHandler(async (_req: Request, res: Response) => {
    const uptime = process.uptime();
    const startTime = Date.now();

    // Check all microservices
    const serviceChecks = await Promise.allSettled([
      checkService('Auth Service', config.services.auth),
      checkService('Patient Service', config.services.patient),
      checkService('Vitals Service', config.services.vitals),
      checkService('Consultation Service', config.services.consultation),
      checkService('ML Service', config.services.ml),
    ]);

    // Process results
    const services: Record<string, any> = {
      'api-gateway': {
        status: 'up',
        lastCheck: new Date(),
      },
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const result of serviceChecks) {
      if (result.status === 'fulfilled') {
        services[result.value.name] = {
          status: result.value.status,
          responseTime: result.value.responseTime,
          lastCheck: new Date(),
        };

        if (result.value.status === 'down') {
          overallStatus = 'unhealthy';
        }
      } else {
        overallStatus = 'degraded';
      }
    }

    const totalResponseTime = Date.now() - startTime;

    const healthCheck: IHealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date(),
      uptime,
      version: '1.0.0',
      services,
    };

    const statusCode =
      overallStatus === 'healthy'
        ? StatusCodes.OK
        : overallStatus === 'degraded'
        ? StatusCodes.OK
        : StatusCodes.SERVICE_UNAVAILABLE;

    res.status(statusCode).json({
      ...healthCheck,
      metadata: {
        totalCheckTime: `${totalResponseTime}ms`,
        checkedServices: Object.keys(services).length,
      },
    });
  })
);

/**
 * GET /health/readiness
 * Kubernetes readiness probe
 */
router.get('/readiness', (_req: Request, res: Response) => {
  // Check if the service is ready to receive traffic
  // For now, always return OK if the service is running
  res.status(StatusCodes.OK).json({
    status: 'ready',
    timestamp: new Date(),
  });
});

/**
 * GET /health/liveness
 * Kubernetes liveness probe
 */
router.get('/liveness', (_req: Request, res: Response) => {
  // Check if the service is alive
  // For now, always return OK if the service is running
  res.status(StatusCodes.OK).json({
    status: 'alive',
    timestamp: new Date(),
  });
});

/**
 * Helper function to check service health
 */
async function checkService(
  name: string,
  url: string
): Promise<{ name: string; status: 'up' | 'down'; responseTime?: number }> {
  const startTime = Date.now();

  try {
    // Try to fetch the service health endpoint
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        name,
        status: 'up',
        responseTime,
      };
    }

    return {
      name,
      status: 'down',
    };
  } catch (error) {
    // Service is down or unreachable
    return {
      name,
      status: 'down',
    };
  }
}

export default router;
