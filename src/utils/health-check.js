/**
 * Health Check Module
 *
 * Provides comprehensive health checks for all system components
 */

const os = require('os');
const logger = require('./logger');

// Store startup time for uptime calculation
const startupTime = Date.now();

/**
 * Overall health status
 */
const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy'
};

/**
 * Component status
 */
const ComponentStatus = {
  UP: 'up',
  DOWN: 'down',
  DEGRADED: 'degraded'
};

/**
 * Get memory usage in MB
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
  };
}

/**
 * Get system information
 */
function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    memory: {
      total: Math.round(totalMem / 1024 / 1024 / 1024), // GB
      free: Math.round(freeMem / 1024 / 1024 / 1024), // GB
      used: Math.round(usedMem / 1024 / 1024 / 1024), // GB
      percentage: Math.round((usedMem / totalMem) * 100)
    },
    loadAverage: os.loadavg(),
    uptime: os.uptime()
  };
}

/**
 * Get application uptime
 */
function getAppUptime() {
  const uptimeMs = Date.now() - startupTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);

  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  return {
    milliseconds: uptimeMs,
    seconds: uptimeSeconds,
    formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
  };
}

/**
 * Check database health
 */
async function checkDatabase(db) {
  try {
    // Check if database is available
    if (!db) {
      return {
        status: ComponentStatus.DOWN,
        message: 'Database not initialized'
      };
    }

    // For PostgreSQL adapter, check health
    if (typeof db.healthCheck === 'function') {
      const health = await db.healthCheck();
      return {
        status: health.status === 'healthy' ? ComponentStatus.UP : ComponentStatus.DEGRADED,
        type: health.database,
        pool: health.pool,
        message: 'Database operational'
      };
    }

    // For JSON adapter, just confirm it exists
    return {
      status: ComponentStatus.UP,
      type: 'json',
      message: 'Database operational'
    };
  } catch (error) {
    logger.error('Health check: Database error', { error: error.message });
    return {
      status: ComponentStatus.DOWN,
      message: error.message
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(redisClient) {
  if (!redisClient || !redisClient.isOpen) {
    return {
      status: ComponentStatus.DOWN,
      message: 'Redis not configured or disconnected',
      fallback: 'Using in-memory sessions'
    };
  }

  try {
    await redisClient.ping();
    return {
      status: ComponentStatus.UP,
      message: 'Redis operational'
    };
  } catch (error) {
    logger.error('Health check: Redis error', { error: error.message });
    return {
      status: ComponentStatus.DOWN,
      message: error.message
    };
  }
}

/**
 * Determine overall system health
 */
function determineOverallHealth(components) {
  const statuses = Object.values(components).map(c => c.status);

  // If any critical component is down, system is unhealthy
  if (components.database?.status === ComponentStatus.DOWN) {
    return HealthStatus.UNHEALTHY;
  }

  // If any component is down or degraded, system is degraded
  if (statuses.includes(ComponentStatus.DOWN) || statuses.includes(ComponentStatus.DEGRADED)) {
    return HealthStatus.DEGRADED;
  }

  return HealthStatus.HEALTHY;
}

/**
 * Get application version from package.json
 */
function getAppVersion() {
  try {
    const packageJson = require('../../package.json');
    return {
      version: packageJson.version,
      name: packageJson.name,
      node: process.version
    };
  } catch (error) {
    return {
      version: 'unknown',
      name: 'mediconnect-pro',
      node: process.version
    };
  }
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck(db, redisClient) {
  const timestamp = new Date().toISOString();

  // Check all components
  const components = {
    database: await checkDatabase(db),
    redis: await checkRedis(redisClient)
  };

  // Determine overall health
  const status = determineOverallHealth(components);

  // Get system metrics
  const memory = getMemoryUsage();
  const system = getSystemInfo();
  const uptime = getAppUptime();
  const version = getAppVersion();

  // Build response
  const healthCheck = {
    status,
    timestamp,
    version,
    uptime,
    memory,
    system,
    components
  };

  // Log health check if not healthy
  if (status !== HealthStatus.HEALTHY) {
    logger.warn('Health check: System degraded or unhealthy', {
      status,
      components: Object.keys(components).filter(k => components[k].status !== ComponentStatus.UP)
    });
  }

  return healthCheck;
}

/**
 * Simple liveness probe (for Kubernetes/Docker)
 * Returns 200 if process is alive, regardless of component health
 */
function livenessProbe() {
  return {
    status: 'alive',
    timestamp: new Date().toISOString()
  };
}

/**
 * Readiness probe (for Kubernetes/Docker)
 * Returns 200 if system is ready to accept traffic
 */
async function readinessProbe(db, redisClient) {
  const components = {
    database: await checkDatabase(db)
  };

  // System is ready if database is up (Redis is optional)
  const ready = components.database.status === ComponentStatus.UP;

  return {
    status: ready ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    components
  };
}

module.exports = {
  performHealthCheck,
  livenessProbe,
  readinessProbe,
  HealthStatus,
  ComponentStatus
};
