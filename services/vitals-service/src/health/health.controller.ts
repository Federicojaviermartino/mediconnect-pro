/**
 * Health Controller
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    const startTime = Date.now();
    let dbStatus = 'down';
    let dbResponseTime = 0;

    try {
      const dbStartTime = Date.now();
      await this.connection.db.admin().ping();
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = this.connection.readyState === 1 ? 'up' : 'down';
    } catch (error) {
      dbStatus = 'down';
    }

    const responseTime = Date.now() - startTime;

    return {
      status: dbStatus === 'up' ? 'healthy' : 'unhealthy',
      service: 'vitals-service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        mongodb: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`,
        },
        memory: {
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        },
      },
      responseTime: `${responseTime}ms`,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async ready() {
    try {
      await this.connection.db.admin().ping();
      return { status: 'ready' };
    } catch (error) {
      return { status: 'not ready', error: error.message };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
