/**
 * Routes Index
 * Central export point for all routes
 */

import { Router } from 'express';

import healthRoutes from './health.routes';
import proxyRoutes from './proxy.routes';

const router = Router();

// Health check routes (no API prefix)
router.use('/health', healthRoutes);

// API routes (will be mounted at /api/v1)
router.use('/', proxyRoutes);

export default router;
