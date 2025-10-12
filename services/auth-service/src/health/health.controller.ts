/**
 * Health Controller
 * Provides health check endpoint for monitoring
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  /**
   * Health check endpoint
   */
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    const startTime = Date.now();

    // Check database connection
    let dbStatus = 'down';
    let dbResponseTime = 0;

    try {
      const dbStartTime = Date.now();
      await this.connection.query('SELECT 1');
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'up';
    } catch (error) {
      dbStatus = 'down';
    }

    const responseTime = Date.now() - startTime;

    const health = {
      status: dbStatus === 'up' ? 'healthy' : 'unhealthy',
      service: 'auth-service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`,
        },
        memory: {
          usage: process.memoryUsage(),
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        },
        cpu: {
          usage: process.cpuUsage(),
        },
      },
      responseTime: `${responseTime}ms`,
    };

    return health;
  }

  /**
   * Readiness probe
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async ready() {
    try {
      await this.connection.query('SELECT 1');
      return { status: 'ready' };
    } catch (error) {
      return { status: 'not ready', error: error.message };
    }
  }

  /**
   * Liveness probe
   */
  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
